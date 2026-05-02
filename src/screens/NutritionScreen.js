import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, KeyboardAvoidingView, Platform, Alert, FlatList,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { getProfile, getNutritionForDate, addMeal, deleteMeal, searchFoods, todayStr } from '../database/db';
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

function MealCard({ meal, onDelete }) {
  return (
    <View style={styles.mealCard}>
      <View style={styles.mealInfo}>
        <Text style={styles.mealType}>{meal.meal_type}</Text>
        <Text style={styles.mealName}>{meal.name}</Text>
        <Text style={styles.mealMacros}>
          P: {meal.protein_g}g  C: {meal.carbs_g}g  G: {meal.fats_g}g
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
  );
}

const emptyForm = { mealType: 'Pranzo', name: '', calories: '', protein: '', carbs: '', fats: '' };

function AddMealModal({ visible, onClose, onSave }) {
  const db = useSQLiteContext();
  const [form, setForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!visible) {
      setForm(emptyForm);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [visible]);

  async function handleSearch(query) {
    setSearchQuery(query);
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    const results = await searchFoods(db, query);
    setSearchResults(results);
  }

  function selectFood(food) {
    setForm(prev => ({
      ...prev,
      name: food.name,
      calories: food.calories.toString(),
      protein: food.protein_g.toString(),
      carbs: food.carbs_g.toString(),
      fats: food.fats_g.toString(),
    }));
    setSearchQuery('');
    setSearchResults([]);
  }

  function field(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Nome mancante', 'Inserisci il nome del pasto.');
      return;
    }
    const cal = parseInt(form.calories) || 0;
    const pro = parseFloat(form.protein) || 0;
    const carb = parseFloat(form.carbs) || 0;
    const fat = parseFloat(form.fats) || 0;
    onSave(form.mealType, form.name.trim(), cal, pro, carb, fat);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Aggiungi Pasto</Text>

          {/* Food search */}
          <Text style={styles.inputLabel}>Cerca nel database</Text>
          <TextInput
            style={styles.textInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="es. riso, pollo, ricotta..."
            placeholderTextColor={COLORS.textSecondary}
          />
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              <FlatList
                data={searchResults}
                keyExtractor={item => item.id.toString()}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 180 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.searchResultItem} onPress={() => selectFood(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchResultName}>{item.name}</Text>
                      <Text style={styles.searchResultSub}>{item.portion} {item.unit}</Text>
                    </View>
                    <Text style={styles.searchResultCal}>{item.calories} kcal</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORS.border }} />}
              />
            </View>
          )}

          <Text style={styles.inputLabel}>Tipo pasto</Text>
          <View style={styles.mealTypeRow}>
            {MEAL_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.mealTypeChip, form.mealType === t && styles.mealTypeChipActive]}
                onPress={() => field('mealType', t)}
              >
                <Text style={[styles.mealTypeChipText, form.mealType === t && styles.mealTypeChipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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

export default function NutritionScreen() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState(null);
  const [meals, setMeals] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const todayIso = todayStr();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const [prof, mealList] = await Promise.all([
      getProfile(db),
      getNutritionForDate(db, todayIso),
    ]);
    setProfile(prof);
    setMeals(mealList);
  }

  async function handleAddMeal(mealType, name, calories, protein, carbs, fats) {
    await addMeal(db, todayIso, mealType, name, calories, protein, carbs, fats);
    loadData();
  }

  async function handleDelete(id) {
    Alert.alert('Elimina pasto', 'Sei sicuro?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          await deleteMeal(db, id);
          loadData();
        }
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Nutrizione</Text>
      <Text style={styles.dateLabel}>Oggi — {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>

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
                }
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
        <Text style={styles.mealsTitle}>PASTI DI OGGI</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Text style={styles.addBtnText}>+ Aggiungi</Text>
        </TouchableOpacity>
      </View>

      {meals.length === 0 ? (
        <View style={styles.emptyMeals}>
          <Text style={styles.emptyMealsText}>Nessun pasto registrato oggi</Text>
        </View>
      ) : (
        meals.map(m => (
          <MealCard key={m.id} meal={m} onDelete={handleDelete} />
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
  dateLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, marginTop: 2 },

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

  mealCard: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
  },
  mealInfo: { flex: 1 },
  mealType: { fontSize: 11, color: COLORS.accent, fontWeight: '600', marginBottom: 2 },
  mealName: { fontSize: 15, color: COLORS.text, fontWeight: '600', marginBottom: 2 },
  mealMacros: { fontSize: 12, color: COLORS.textSecondary },
  mealRight: { alignItems: 'flex-end' },
  mealCalories: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  mealKcal: { fontSize: 11, color: COLORS.textSecondary },
  mealDelete: { marginTop: 6 },
  mealDeleteText: { color: COLORS.textSecondary, fontSize: 16 },

  emptyMeals: { alignItems: 'center', paddingVertical: 40 },
  emptyMealsText: { color: COLORS.textSecondary, fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalBox: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  inputLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, marginTop: 10 },
  textInput: {
    backgroundColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, color: COLORS.text, fontSize: 15,
  },

  searchResults: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchResultName: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  searchResultSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  searchResultCal: { fontSize: 13, color: COLORS.accent, fontWeight: '700', marginLeft: 8 },

  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealTypeChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  mealTypeChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  mealTypeChipText: { color: COLORS.textSecondary, fontSize: 13 },
  mealTypeChipTextActive: { color: '#fff', fontWeight: '700' },
  macroInputRow: { flexDirection: 'row', marginTop: 4 },
  modalActions: { flexDirection: 'row', marginTop: 20, gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 13, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 2, backgroundColor: COLORS.accent, borderRadius: 12, padding: 13, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
