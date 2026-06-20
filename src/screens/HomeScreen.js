import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  getProfile, getTrainingDayForDate, getNutritionForDate,
  getWeeklySessions, getWaterForDate, setWaterGlasses, todayStr, dateStr,
  addWeightLog, getWeightHistory,
} from '../database/db';
import { COLORS } from '../theme';

const DAY_LABELS = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];
const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const WATER_STEP = 0.5;   // litri per tocco
const WATER_GOAL = 3.0;   // litri obiettivo
const WATER_MAX_STEPS = WATER_GOAL / WATER_STEP; // 6 step

function getMondayOfWeek(date) {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}

function CalorieRing({ consumed, target }) {
  const pct = Math.min(consumed / target, 1);
  const color = pct >= 0.9 ? COLORS.success : pct >= 0.6 ? COLORS.warning : COLORS.accent;
  return (
    <View style={styles.ringContainer}>
      <View style={[styles.ring, { borderColor: COLORS.border }]}>
        <View style={[styles.ringFill, { borderColor: color, transform: [{ rotate: `${pct * 360}deg` }] }]} />
        <View style={styles.ringInner}>
          <Text style={[styles.ringValue, { color }]}>{consumed}</Text>
          <Text style={styles.ringLabel}>/ {target} kcal</Text>
        </View>
      </View>
    </View>
  );
}

function MacroMini({ label, current, target, color }) {
  const pct = Math.min(current / target, 1);
  return (
    <View style={styles.macroMini}>
      <Text style={styles.macroMiniLabel}>{label}</Text>
      <View style={styles.macroMiniBar}>
        <View style={[styles.macroMiniFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroMiniValue}>{Math.round(current)}g</Text>
    </View>
  );
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [todayTraining, setTodayTraining] = useState(null);
  const [nutrition, setNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [weekSessions, setWeekSessions] = useState([]);
  const [water, setWater] = useState(0);
  const [lastWeight, setLastWeight] = useState(null);
  const [weightInput, setWeightInput] = useState('');

  const today = new Date();
  const todayIso = todayStr();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const [prof, training, meals, glasses] = await Promise.all([
      getProfile(db),
      getTrainingDayForDate(db, today),
      getNutritionForDate(db, todayIso),
      getWaterForDate(db, todayIso),
    ]);
    setProfile(prof);
    setTodayTraining(training);
    setWater(glasses);

    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein_g,
        carbs: acc.carbs + m.carbs_g,
        fats: acc.fats + m.fats_g,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
    setNutrition(totals);

    const monday = getMondayOfWeek(today);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sessions = await getWeeklySessions(db, dateStr(monday), dateStr(sunday));
    setWeekSessions(sessions);

    const weights = await getWeightHistory(db, 1);
    setLastWeight(weights[0] ?? null);
  }

  async function handleSaveWeight() {
    const w = parseFloat(weightInput.replace(',', '.'));
    if (!w || w < 30 || w > 250) {
      Alert.alert('Peso non valido', 'Inserisci un valore tra 30 e 250 kg.');
      return;
    }
    await addWeightLog(db, todayIso, w);
    setWeightInput('');
    loadData();
  }

  async function handleWaterChange(delta) {
    const next = Math.max(0, Math.min(WATER_MAX_STEPS, water + delta));
    setWater(next);
    await setWaterGlasses(db, todayIso, next);
  }

  function greeting() {
    const h = today.getHours();
    if (h < 12) return 'Buongiorno';
    if (h < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  }

  function formatDate() {
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return `${days[today.getDay()]} ${today.getDate()} ${MONTH_NAMES[today.getMonth()]}`;
  }

  const monday = getMondayOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  function sessionForDay(d) {
    const iso = dateStr(d);
    return weekSessions.find(s => s.date === iso);
  }

  const waterLiters = (water * WATER_STEP).toFixed(1);
  const waterPct = water / WATER_MAX_STEPS;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.dateText}>{formatDate()}</Text>
      </View>

      {/* Oggi allenamento */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ALLENAMENTO DI OGGI</Text>
        {todayTraining ? (
          <>
            <Text style={styles.workoutName}>{todayTraining.name}</Text>
            {todayTraining.is_rest_day ? (
              <Text style={styles.restText}>Giornata di riposo o recupero attivo</Text>
            ) : (
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => navigation.navigate('Allenamento')}
              >
                <Text style={styles.ctaText}>Vai all'allenamento →</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={styles.restText}>Nessun allenamento programmato</Text>
        )}
      </View>

      {/* Acqua */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ACQUA OGGI</Text>
        <View style={styles.waterBarTrack}>
          <View style={[styles.waterBarFill, { width: `${Math.min(waterPct, 1) * 100}%` }]} />
        </View>
        <View style={styles.waterControls}>
          <TouchableOpacity
            style={[styles.waterBtn, water === 0 && styles.waterBtnDisabled]}
            onPress={() => handleWaterChange(-1)}
            disabled={water === 0}
          >
            <Text style={styles.waterBtnText}>−0.5L</Text>
          </TouchableOpacity>

          <View style={styles.waterDisplay}>
            <Text style={styles.waterLitersLarge}>{waterLiters}L</Text>
            <Text style={styles.waterGoalText}>/ {WATER_GOAL}L</Text>
          </View>

          <TouchableOpacity
            style={[styles.waterBtn, water >= WATER_MAX_STEPS && styles.waterBtnDisabled]}
            onPress={() => handleWaterChange(1)}
            disabled={water >= WATER_MAX_STEPS}
          >
            <Text style={styles.waterBtnText}>+0.5L</Text>
          </TouchableOpacity>
        </View>
        {water >= WATER_MAX_STEPS && (
          <Text style={styles.waterComplete}>Obiettivo raggiunto! 🎉</Text>
        )}
      </View>

      {/* Peso corporeo */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>PESO CORPOREO</Text>
        {lastWeight ? (
          <Text style={styles.weightLast}>
            Ultimo: <Text style={styles.weightLastValue}>{lastWeight.weight_kg} kg</Text>
            {(() => {
              const days = Math.round((Date.now() - new Date(lastWeight.date).getTime()) / 86400000);
              if (days <= 0) return ' · oggi';
              return ` · ${days} ${days === 1 ? 'giorno' : 'giorni'} fa`;
            })()}
          </Text>
        ) : (
          <Text style={styles.weightLast}>Nessun peso registrato — pesati per seguire il bulk.</Text>
        )}
        {lastWeight && Math.round((Date.now() - new Date(lastWeight.date).getTime()) / 86400000) >= 7 && (
          <Text style={styles.weightStale}>⚠︎ Non ti pesi da una settimana</Text>
        )}
        <View style={styles.weightRow}>
          <TextInput
            style={styles.weightInput}
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="decimal-pad"
            placeholder={lastWeight ? lastWeight.weight_kg.toString() : '74.0'}
            placeholderTextColor={COLORS.textSecondary}
            selectTextOnFocus
          />
          <Text style={styles.weightUnit}>kg</Text>
          <TouchableOpacity style={styles.weightSaveBtn} onPress={handleSaveWeight}>
            <Text style={styles.weightSaveText}>Registra</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Nutrizione oggi */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>NUTRIZIONE OGGI</Text>
        {profile && (
          <>
            <CalorieRing consumed={Math.round(nutrition.calories)} target={profile.target_calories} />
            <View style={styles.macroRow}>
              <MacroMini label="Proteine" current={nutrition.protein} target={profile.target_protein} color={COLORS.protein} />
              <MacroMini label="Carbo" current={nutrition.carbs} target={profile.target_carbs} color={COLORS.carbs} />
              <MacroMini label="Grassi" current={nutrition.fats} target={profile.target_fats} color={COLORS.fats} />
            </View>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.navigate('Nutrizione')}
            >
              <Text style={styles.ctaText}>Log pasti →</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Settimana */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>QUESTA SETTIMANA</Text>
        <View style={styles.weekRow}>
          {weekDays.map((d, i) => {
            const session = sessionForDay(d);
            const isToday = dateStr(d) === todayIso;
            const done = session?.completed === 1;
            const started = session && !session.completed;
            return (
              <View key={i} style={styles.dayCell}>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {DAY_LABELS[i]}
                </Text>
                <View style={[
                  styles.dayDot,
                  done && styles.dayDotDone,
                  started && styles.dayDotStarted,
                  isToday && !session && styles.dayDotToday,
                ]}>
                  {done && <Text style={styles.dayDotText}>✓</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 26, fontWeight: '700', color: COLORS.text },
  dateText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  workoutName: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  restText: { fontSize: 14, color: COLORS.textSecondary },
  ctaButton: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Weight widget
  weightLast: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 },
  weightLastValue: { color: COLORS.text, fontWeight: '700' },
  weightStale: { color: COLORS.warning, fontSize: 13, marginBottom: 4 },
  weightRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  weightInput: {
    backgroundColor: COLORS.border, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14,
    color: COLORS.text, fontSize: 16, fontWeight: '700',
    width: 100, textAlign: 'center',
  },
  weightUnit: { color: COLORS.textSecondary, fontSize: 14, marginLeft: 8 },
  weightSaveBtn: {
    marginLeft: 'auto', backgroundColor: COLORS.accent,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18,
  },
  weightSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Water widget
  waterBarTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 16 },
  waterBarFill: { height: 6, backgroundColor: '#4FC3F7', borderRadius: 3 },
  waterControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waterBtn: {
    backgroundColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  waterBtnDisabled: { opacity: 0.3 },
  waterBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  waterDisplay: { alignItems: 'center' },
  waterLitersLarge: { fontSize: 36, fontWeight: '700', color: '#4FC3F7' },
  waterGoalText: { fontSize: 13, color: COLORS.textSecondary },
  waterComplete: { fontSize: 13, color: COLORS.success, fontWeight: '700', marginTop: 12, textAlign: 'center' },

  // Calorie ring
  ringContainer: { alignItems: 'center', marginBottom: 12 },
  ring: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 8,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  ringInner: { alignItems: 'center' },
  ringValue: { fontSize: 20, fontWeight: '700' },
  ringLabel: { fontSize: 11, color: COLORS.textSecondary },

  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  macroMini: { flex: 1, marginHorizontal: 4 },
  macroMiniLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  macroMiniBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginBottom: 3 },
  macroMiniFill: { height: 4, borderRadius: 2 },
  macroMiniValue: { fontSize: 12, color: COLORS.text, fontWeight: '600' },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { alignItems: 'center' },
  dayLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  dayLabelToday: { color: COLORS.accent, fontWeight: '700' },
  dayDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dayDotDone: { backgroundColor: COLORS.success },
  dayDotStarted: { backgroundColor: COLORS.warning },
  dayDotToday: { borderWidth: 2, borderColor: COLORS.accent },
  dayDotText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
