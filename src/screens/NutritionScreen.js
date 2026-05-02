import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, KeyboardAvoidingView, Platform, Alert, Switch,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import {
  getProfile, getNutritionForDate, addMeal, deleteMeal,
  searchFoods, saveToFoodDatabase, getRecentFoods, todayStr, dateStr,
} from '../database/db';
import { COLORS } from '../theme';

const MEAL_TYPES = ['Colazione', 'Pranzo', 'Cena', 'Spuntino'];

function MacroBar({ label, current, target, color }) {
  const pct = Math.min(current / target, 1);
  const over = current > target;
  return (
    <View style={styles.macroBar}>
      <View style={styles.macroLabelRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={[styles.macroValue, over && { color: COLORS.danger }]}>
          {Math.round(current)}g / {target}g
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${pct * 100}%`, backgroundColor: over ? COLORS.danger : color }]} />
      </View>
    </View>
  );
}

function MealGroup({ type, meals, onDelete }) {
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein_g,
      carbs: acc.carbs + m.carbs_g,
      fats: acc.fats + m.fats_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
  return (
    <View style={styles.mealGroup}>
      <View style={styles.mealGroupHeader}>
        <Text style={styles.mealGroupTitle}>{type.toUpperCase()}</Text>
        <Text style={styles.mealGroupTotal}>{Math.round(totals.calories)} kcal</Text>
      </View>
      {meals.map(meal => (
        <View key={meal.id} style={styles.mealItem}>
          <View style={styles.mealInfo}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <Text style={styles.mealMacros}>
              P:{Math.round(meal.protein_g)}g  C:{Math.round(meal.carbs_g)}g  G:{Math.round(meal.fats_g)}g
            </Text>
          </View>
          <View style={styles.mealRight}>
            <Text style={styles.mealCalories}>{meal.calories}</Text>
            <Text style={styles.mealKcal}>kcal</Text>
            <TouchableOpacity onPress={() => onDelete(meal.id)} style={styles.mealDelete}>
              <Text style={styles.mealDeleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <View style={styles.mealGroupFooter}>
        <Text style={styles.mealGroupSubtotal}>
          P:{Math.round(totals.protein)}g  C:{Math.round(totals.carbs)}g  G:{Math.round(totals.fats)}g
        </Text>
      </View>
    </View>
  );
}

const emptyForm = { name: '', calories: '', protein: '', carbs: '', fats: '' };

function AddMealModal({ visible, onClose, onSave }) {
  const db = useSQLiteContext();
  const [activeTab, setActiveTab] = useState('db');
  const [dbSubTab, setDbSubTab] = useState('recent');
  const [mealType, setMealType] = useState('Pranzo');

  const [recentFoods, setRecentFoods] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [saveToDb, setSaveToDb] = useState(true);

  useEffect(() => {
    if (!visible) {
      setActiveTab('db');
      setDbSubTab('recent');
      setMealType('Pranzo');
      setRecentFoods([]);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedFood(null);
      setQuantity('');
      setForm(emptyForm);
      setSaveToDb(true);
    } else {
      getRecentFoods(db, 10).then(setRecentFoods);
    }
  }, [visible]);

  async function handleSearch(q) {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchResults(await searchFoods(db, q));
  }

  function selectFood(food) {
    setSelectedFood(food);
    setQuantity(food.portion.toString());
    setSearchQuery('');
    setSearchResults([]);
  }

  function selectRecentFood(food) {
    setSelectedFood({ ...food, portion: 1, unit: 'porzione' });
    setQuantity('1');
  }

  function getScaledMacros() {
    if (!selectedFood) return null;
    const scale = (parseFloat(quantity) || selectedFood.portion) / selectedFood.portion;
    return {
      calories: Math.round(selectedFood.calories * scale),
      protein: Math.round(selectedFood.protein_g * scale * 10) / 10,
      carbs: Math.round(selectedFood.carbs_g * scale * 10) / 10,
      fats: Math.round(selectedFood.fats_g * scale * 10) / 10,
    };
  }

  function field(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSave() {
    if (activeTab === 'db') {
      if (!selectedFood) {
        Alert.alert('Nessun alimento selezionato', 'Seleziona un alimento dal database.');
        return;
      }
      const m = getScaledMacros();
      onSave(mealType, selectedFood.name, m.calories, m.protein, m.carbs, m.fats);
    } else {
      if (!form.name.trim()) {
        Alert.alert('Nome mancante', 'Inserisci il nome del pasto.');
        return;
      }
      const cal = parseInt(form.calories) || 0;
      const pro = parseFloat(form.protein) || 0;
      const carb = parseFloat(form.carbs) || 0;
      const fat = parseFloat(form.fats) || 0;
      const name = form.name.trim();
      if (saveToDb && cal > 0) await saveToFoodDatabase(db, name, cal, pro, carb, fat);
      onSave(mealType, name, cal, pro, carb, fat);
    }
    onClose();
  }

  const scaledMacros = getScaledMacros();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Aggiungi Pasto</Text>

          {/* Main tabs */}
          <View style={styles.tabRow}>
            {[['db', 'Database'], ['manual', 'Manuale']].map(([tab, label]) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'db' ? (
            <>
              {/* Sub-tabs */}
              <View style={styles.subTabRow}>
                {[['recent', 'Recenti'], ['search', 'Cerca']].map(([sub, label]) => (
                  <TouchableOpacity
                    key={sub}
                    style={[styles.subTabBtn, dbSubTab === sub && styles.subTabBtnActive]}
                    onPress={() => setDbSubTab(sub)}
                  >
                    <Text style={[styles.subTabText, dbSubTab === sub && styles.subTabTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {dbSubTab === 'recent' ? (
                recentFoods.length === 0 ? (
                  <Text style={styles.emptySubText}>Nessun pasto recente</Text>
                ) : (
                  <ScrollView
                    style={styles.foodList}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {recentFoods.map((food, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.foodItem, selectedFood?.name === food.name && styles.foodItemSelected]}
                        onPress={() => selectRecentFood(food)}
                      >
                        <Text style={styles.foodItemName} numberOfLines={1}>{food.name}</Text>
                        <Text style={styles.foodItemCal}>{food.calories} kcal</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )
              ) : (
                <>
                  <TextInput
                    style={[styles.textInput, { marginTop: 8, marginBottom: 4 }]}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholder="es. riso, pollo, ricotta..."
                    placeholderTextColor={COLORS.textSecondary}
                  />
                  {searchResults.length > 0 && (
                    <ScrollView
                      style={styles.foodList}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                    >
                      {searchResults.map(item => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.foodItem, selectedFood?.name === item.name && styles.foodItemSelected]}
                          onPress={() => selectFood(item)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.foodItemName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.foodItemSub}>{item.portion} {item.unit}</Text>
                          </View>
                          <Text style={styles.foodItemCal}>{item.calories} kcal</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </>
              )}

              {/* Selected food + quantity scaling */}
              {selectedFood && (
                <View style={styles.selectedFoodBox}>
                  <View style={styles.selectedFoodHeader}>
                    <Text style={styles.selectedFoodName} numberOfLines={2}>{selectedFood.name}</Text>
                    <TouchableOpacity onPress={() => { setSelectedFood(null); setQuantity(''); }}>
                      <Text style={styles.clearSelection}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.quantityRow}>
                    <Text style={styles.quantityLabel}>Quantità</Text>
                    <TextInput
                      style={styles.quantityInput}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                    <Text style={styles.quantityUnit}>{selectedFood.unit}</Text>
                  </View>
                  {scaledMacros && (
                    <Text style={styles.scaledMacros}>
                      {scaledMacros.calories} kcal  ·  P:{scaledMacros.protein}g  C:{scaledMacros.carbs}g  G:{scaledMacros.fats}g
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.inputLabel}>Nome</Text>
              <TextInput
                style={styles.textInput}
                value={form.name}
                onChangeText={v => field('name', v)}
                placeholder="es. Petto di pollo con riso"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={styles.inputLabel}>Calorie</Text>
              <TextInput
                style={styles.textInput}
                value={form.calories}
                onChangeText={v => field('calories', v)}
                keyboardType="number-pad"
                placeholder="kcal"
                placeholderTextColor={COLORS.textSecondary}
              />
              <View style={styles.macroInputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Proteine (g)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.protein}
                    onChangeText={v => field('protein', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Carbo (g)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.carbs}
                    onChangeText={v => field('carbs', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Grassi (g)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.fats}
                    onChangeText={v => field('fats', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>
              </View>
              <View style={styles.saveToDbRow}>
                <Text style={styles.saveToDbLabel}>Salva nel database</Text>
                <Switch
                  value={saveToDb}
                  onValueChange={setSaveToDb}
                  trackColor={{ true: COLORS.accent }}
                  thumbColor="#fff"
                />
              </View>
            </>
          )}

          {/* Meal type - always visible */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Tipo pasto</Text>
          <View style={styles.mealTypeRow}>
            {MEAL_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.mealTypeChip, mealType === t && styles.mealTypeChipActive]}
                onPress={() => setMealType(t)}
              >
                <Text style={[styles.mealTypeChipText, mealType === t && styles.mealTypeChipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleSave}>
              <Text style={styles.confirmBtnText}>Aggiungi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export default function NutritionScreen() {
  const db = useSQLiteContext();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [profile, setProfile] = useState(null);
  const [meals, setMeals] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const todayIso = todayStr();
  function viewIso() { return dateStr(viewDate); }
  function isViewingToday() { return viewIso() === todayIso; }

  function navigateDay(delta) {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }

  function viewDateLabel() {
    const iso = viewIso();
    if (iso === todayIso) return 'Oggi';
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (iso === dateStr(yesterday)) return 'Ieri';
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    if (iso === dateStr(tomorrow)) return 'Domani';
    return `${DAY_NAMES[viewDate.getDay()]} ${viewDate.getDate()} ${MONTH_NAMES[viewDate.getMonth()]}`;
  }

  useFocusEffect(
    useCallback(() => { loadData(viewDate); }, [viewDate])
  );

  async function loadData(date) {
    const [prof, mealList] = await Promise.all([
      getProfile(db),
      getNutritionForDate(db, dateStr(date)),
    ]);
    setProfile(prof);
    setMeals(mealList);
  }

  async function handleAddMeal(mealType, name, calories, protein, carbs, fats) {
    await addMeal(db, viewIso(), mealType, name, calories, protein, carbs, fats);
    loadData(viewDate);
  }

  async function handleDelete(id) {
    Alert.alert('Elimina pasto', 'Sei sicuro?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          await deleteMeal(db, id);
          loadData(viewDate);
        },
      },
    ]);
  }

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein_g,
      carbs: acc.carbs + m.carbs_g,
      fats: acc.fats + m.fats_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  function calorieStatus() {
    if (!profile) return null;
    const remaining = profile.target_calories - totals.calories;
    if (remaining <= 0) return { text: `+${Math.abs(remaining)} kcal surplus`, color: COLORS.success };
    return { text: `${remaining} kcal rimanenti`, color: COLORS.textSecondary };
  }

  const status = calorieStatus();

  const mealGroups = MEAL_TYPES.reduce((acc, type) => {
    const group = meals.filter(m => m.meal_type === type);
    if (group.length > 0) acc.push({ type, meals: group });
    return acc;
  }, []);
  const otherMeals = meals.filter(m => !MEAL_TYPES.includes(m.meal_type));
  if (otherMeals.length > 0) mealGroups.push({ type: 'Altro', meals: otherMeals });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Nutrizione</Text>

      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateNavArrow} onPress={() => navigateDay(-1)}>
          <Text style={styles.dateNavArrowText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewDate(new Date())} style={styles.dateNavCenter}>
          <Text style={styles.dateNavLabel}>{viewDateLabel()}</Text>
          {!isViewingToday() && <Text style={styles.dateNavSub}>Tocca per tornare ad oggi</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateNavArrow} onPress={() => navigateDay(1)}>
          <Text style={styles.dateNavArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {profile && (
        <View style={styles.card}>
          <View style={styles.calorieRow}>
            <View>
              <Text style={styles.calorieValue}>{Math.round(totals.calories)}</Text>
              <Text style={styles.calorieTarget}>/ {profile.target_calories} kcal</Text>
            </View>
            <View style={styles.calorieGauge}>
              <View style={[
                styles.calorieGaugeFill,
                {
                  width: `${Math.min(totals.calories / profile.target_calories, 1) * 100}%`,
                  backgroundColor: totals.calories > profile.target_calories ? COLORS.danger : COLORS.accent,
                },
              ]} />
            </View>
            {status && <Text style={[styles.calorieStatus, { color: status.color }]}>{status.text}</Text>}
          </View>
          <MacroBar label="Proteine" current={totals.protein} target={profile.target_protein} color={COLORS.protein} />
          <MacroBar label="Carboidrati" current={totals.carbs} target={profile.target_carbs} color={COLORS.carbs} />
          <MacroBar label="Grassi" current={totals.fats} target={profile.target_fats} color={COLORS.fats} />
        </View>
      )}

      <View style={styles.mealsHeader}>
        <Text style={styles.mealsTitle}>PASTI — {viewDateLabel().toUpperCase()}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Text style={styles.addBtnText}>+ Aggiungi</Text>
        </TouchableOpacity>
      </View>

      {meals.length === 0 ? (
        <View style={styles.emptyMeals}>
          <Text style={styles.emptyMealsText}>Nessun pasto registrato</Text>
        </View>
      ) : (
        mealGroups.map(({ type, meals: groupMeals }) => (
          <MealGroup key={type} type={type} meals={groupMeals} onDelete={handleDelete} />
        ))
      )}

      <AddMealModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddMeal}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: COLORS.text },

  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 20 },

  calorieRow: { marginBottom: 16 },
  calorieValue: { fontSize: 36, fontWeight: '700', color: COLORS.text },
  calorieTarget: { fontSize: 13, color: COLORS.textSecondary },
  calorieGauge: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginVertical: 8 },
  calorieGaugeFill: { height: 6, borderRadius: 3 },
  calorieStatus: { fontSize: 13, fontWeight: '600' },

  macroBar: { marginBottom: 10 },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  macroLabel: { fontSize: 13, color: COLORS.text },
  macroValue: { fontSize: 13, color: COLORS.textSecondary },
  macroTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  macroFill: { height: 6, borderRadius: 3 },

  mealsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mealsTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.2 },
  addBtn: { backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Meal groups
  mealGroup: { backgroundColor: COLORS.card, borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  mealGroupHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  mealGroupTitle: { fontSize: 11, fontWeight: '700', color: COLORS.accent, letterSpacing: 1 },
  mealGroupTotal: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  mealItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, color: COLORS.text, fontWeight: '600', marginBottom: 2 },
  mealMacros: { fontSize: 12, color: COLORS.textSecondary },
  mealRight: { alignItems: 'flex-end', marginLeft: 8 },
  mealCalories: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  mealKcal: { fontSize: 11, color: COLORS.textSecondary },
  mealDelete: { marginTop: 4 },
  mealDeleteText: { color: COLORS.textSecondary, fontSize: 15 },
  mealGroupFooter: {
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.bg,
  },
  mealGroupSubtotal: { fontSize: 12, color: COLORS.textSecondary },

  emptyMeals: { alignItems: 'center', paddingVertical: 40 },
  emptyMealsText: { color: COLORS.textSecondary, fontSize: 14 },

  // Date nav
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 4, marginBottom: 16,
  },
  dateNavArrow: { paddingHorizontal: 16, paddingVertical: 4 },
  dateNavArrowText: { fontSize: 28, color: COLORS.accent, fontWeight: '300' },
  dateNavCenter: { flex: 1, alignItems: 'center' },
  dateNavLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  dateNavSub: { fontSize: 11, color: COLORS.accent, marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalBox: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 14 },

  // Main tabs (Database / Manuale)
  tabRow: {
    flexDirection: 'row', backgroundColor: COLORS.border,
    borderRadius: 10, padding: 3, marginBottom: 14,
  },
  tabBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: COLORS.card },
  tabBtnText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  tabBtnTextActive: { color: COLORS.text },

  // Sub-tabs (Recenti / Cerca)
  subTabRow: { flexDirection: 'row', marginBottom: 8, gap: 8 },
  subTabBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  subTabBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  subTabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  subTabTextActive: { color: '#fff' },

  // Food list (recent + search results)
  foodList: { maxHeight: 220 },
  foodItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  foodItemSelected: { backgroundColor: `${COLORS.accent}18` },
  foodItemName: { fontSize: 14, color: COLORS.text, fontWeight: '600', flex: 1 },
  foodItemSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  foodItemCal: { fontSize: 13, color: COLORS.accent, fontWeight: '700', marginLeft: 8 },
  emptySubText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 16 },

  // Selected food box
  selectedFoodBox: {
    backgroundColor: COLORS.bg, borderRadius: 12,
    padding: 12, marginTop: 10,
  },
  selectedFoodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  selectedFoodName: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  clearSelection: { fontSize: 16, color: COLORS.textSecondary, padding: 2 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  quantityLabel: { fontSize: 13, color: COLORS.textSecondary, marginRight: 10 },
  quantityInput: {
    backgroundColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    color: COLORS.text, fontSize: 16, fontWeight: '700',
    minWidth: 70, textAlign: 'center',
  },
  quantityUnit: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 8 },
  scaledMacros: {
    fontSize: 13, color: COLORS.accent, fontWeight: '700', textAlign: 'center',
    backgroundColor: `${COLORS.accent}15`, borderRadius: 8, paddingVertical: 6,
  },

  // Manual form
  inputLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, marginTop: 10 },
  textInput: {
    backgroundColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, color: COLORS.text, fontSize: 15,
  },
  macroInputRow: { flexDirection: 'row', marginTop: 4 },
  saveToDbRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  saveToDbLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1, marginRight: 12 },

  // Meal type chips
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealTypeChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  mealTypeChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  mealTypeChipText: { color: COLORS.textSecondary, fontSize: 13 },
  mealTypeChipTextActive: { color: '#fff', fontWeight: '700' },

  // Modal actions
  modalActions: { flexDirection: 'row', marginTop: 18, gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 13, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 2, backgroundColor: COLORS.accent, borderRadius: 12, padding: 13, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
