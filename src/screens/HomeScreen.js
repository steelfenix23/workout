import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  getProfile, getTrainingDayForDate, getNutritionForDate,
  getWeeklySessions, getWaterForDate, setWaterGlasses, todayStr, dateStr,
} from '../database/db';
import { COLORS } from '../theme';

const DAY_LABELS = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];
const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const TOTAL_GLASSES = 12;

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
  }

  async function handleWaterTap(index) {
    const newCount = index < water ? index : index + 1;
    setWater(newCount);
    await setWaterGlasses(db, todayIso, newCount);
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

  const waterLiters = (water * 0.25).toFixed(2);
  const waterPct = water / TOTAL_GLASSES;

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
        <View style={styles.waterHeader}>
          <Text style={styles.waterCount}>{water} / {TOTAL_GLASSES} bicchieri</Text>
          <Text style={styles.waterLiters}>{waterLiters}L / 3L</Text>
        </View>
        <View style={styles.waterBarTrack}>
          <View style={[styles.waterBarFill, { width: `${waterPct * 100}%` }]} />
        </View>
        <View style={styles.glassGrid}>
          {Array.from({ length: TOTAL_GLASSES }, (_, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.glass, i < water && styles.glassFilled]}
              onPress={() => handleWaterTap(i)}
              activeOpacity={0.7}
            >
              <Text style={styles.glassIcon}>{i < water ? '💧' : '·'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {water >= TOTAL_GLASSES && (
          <Text style={styles.waterComplete}>Obiettivo raggiunto! 🎉</Text>
        )}
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

  // Water widget
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  waterCount: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  waterLiters: { fontSize: 13, color: COLORS.textSecondary },
  waterBarTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginBottom: 12 },
  waterBarFill: { height: 4, backgroundColor: '#4FC3F7', borderRadius: 2 },
  glassGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  glass: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassFilled: { backgroundColor: '#1565C0' },
  glassIcon: { fontSize: 18 },
  waterComplete: { fontSize: 13, color: COLORS.success, fontWeight: '700', marginTop: 10, textAlign: 'center' },

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
