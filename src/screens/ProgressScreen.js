import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import {
  getSessionHistory, getNutritionHistory, getWeightHistory,
  addWeightLog, todayStr,
} from '../database/db';
import { COLORS } from '../theme';

const TABS = ['Allenamenti', 'Nutrizione', 'Peso'];

function BarChart({ data, valueKey, labelKey, color, maxOverride }) {
  if (!data.length) return <Text style={styles.emptyText}>Nessun dato disponibile</Text>;
  const max = maxOverride || Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.chartContainer}>
        {[...data].reverse().map((d, i) => {
          const pct = d[valueKey] / max;
          return (
            <View key={i} style={styles.barGroup}>
              <Text style={styles.barValue}>{Math.round(d[valueKey])}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${pct * 100}%`, backgroundColor: color }]} />
              </View>
              <Text style={styles.barLabel}>{d[labelKey]?.slice(5)}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function WeightChart({ data }) {
  if (!data.length) return <Text style={styles.emptyText}>Nessun dato peso</Text>;
  const weights = data.map(d => d.weight_kg);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.chartContainer}>
        {[...data].reverse().map((d, i) => {
          const pct = (d.weight_kg - min) / (max - min);
          return (
            <View key={i} style={styles.barGroup}>
              <Text style={styles.barValue}>{d.weight_kg}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${pct * 100}%`, backgroundColor: COLORS.accent }]} />
              </View>
              <Text style={styles.barLabel}>{d.date.slice(5)}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const [activeTab, setActiveTab] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [nutrition, setNutrition] = useState([]);
  const [weights, setWeights] = useState([]);
  const [newWeight, setNewWeight] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const [sess, nutr, w] = await Promise.all([
      getSessionHistory(db, 30),
      getNutritionHistory(db, 14),
      getWeightHistory(db, 30),
    ]);
    setSessions(sess);
    setNutrition(nutr);
    setWeights(w);
  }

  async function handleAddWeight() {
    const w = parseFloat(newWeight);
    if (!w || w < 30 || w > 200) {
      Alert.alert('Peso non valido', 'Inserisci un peso tra 30 e 200 kg.');
      return;
    }
    await addWeightLog(db, todayStr(), w);
    setNewWeight('');
    loadData();
  }

  function weeklyVolume() {
    const last7 = sessions.filter(s => {
      const d = new Date(s.date);
      const now = new Date();
      return (now - d) / 86400000 <= 7;
    });
    return last7.length;
  }

  function streak() {
    const dates = sessions.map(s => s.date).sort().reverse();
    if (!dates.length) return 0;
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      if (dates.includes(iso)) count++;
      else if (i > 0) break;
    }
    return count;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Progressi</Text>

      {/* Stats summary */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{weeklyVolume()}</Text>
          <Text style={styles.statLabel}>sessioni{'\n'}questa settimana</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{sessions.length}</Text>
          <Text style={styles.statLabel}>sessioni{'\n'}totali</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{streak()}</Text>
          <Text style={styles.statLabel}>giorni{'\n'}consecutivi</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === i && styles.tabActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SESSIONI COMPLETATE (ultimi 30 gg)</Text>
          {sessions.length === 0 ? (
            <Text style={styles.emptyText}>Nessuna sessione ancora</Text>
          ) : (
            sessions.map(s => (
              <View key={s.id} style={styles.sessionRow}>
                <Text style={styles.sessionDate}>{s.date}</Text>
                <Text style={styles.sessionName}>{s.name}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {activeTab === 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CALORIE GIORNALIERE (ultimi 14 gg)</Text>
          <BarChart
            data={nutrition}
            valueKey="total_calories"
            labelKey="date"
            color={COLORS.accent}
          />
          <Text style={[styles.cardTitle, { marginTop: 20 }]}>PROTEINE (g)</Text>
          <BarChart
            data={nutrition}
            valueKey="total_protein"
            labelKey="date"
            color={COLORS.protein}
          />
        </View>
      )}

      {activeTab === 2 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PESO CORPOREO</Text>
          <WeightChart data={weights} />

          <View style={styles.weightInputRow}>
            <TextInput
              style={styles.weightInput}
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="decimal-pad"
              placeholder="Inserisci peso (kg)"
              placeholderTextColor={COLORS.textSecondary}
            />
            <TouchableOpacity style={styles.weightBtn} onPress={handleAddWeight}>
              <Text style={styles.weightBtnText}>Log</Text>
            </TouchableOpacity>
          </View>

          {weights.length > 0 && (
            <View style={styles.weightStats}>
              <Text style={styles.weightStatText}>
                Attuale: {weights[0].weight_kg} kg
              </Text>
              {weights.length >= 2 && (
                <Text style={[
                  styles.weightStatText,
                  { color: weights[0].weight_kg > weights[weights.length - 1].weight_kg ? COLORS.success : COLORS.textSecondary }
                ]}>
                  Trend: {weights[0].weight_kg > weights[weights.length - 1].weight_kg ? '+' : ''}
                  {(weights[0].weight_kg - weights[weights.length - 1].weight_kg).toFixed(1)} kg
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 16 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: COLORS.accent },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },

  tabs: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.accent },
  tabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.2, marginBottom: 12 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, paddingVertical: 20, textAlign: 'center' },

  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sessionDate: { fontSize: 13, color: COLORS.textSecondary },
  sessionName: { fontSize: 13, color: COLORS.text, fontWeight: '600' },

  chartContainer: { flexDirection: 'row', height: 120, alignItems: 'flex-end', paddingBottom: 4 },
  barGroup: { width: 40, alignItems: 'center', marginRight: 6 },
  barValue: { fontSize: 9, color: COLORS.textSecondary, marginBottom: 2 },
  barTrack: { width: 20, height: 80, backgroundColor: COLORS.border, borderRadius: 4, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, color: COLORS.textSecondary, marginTop: 4 },

  weightInputRow: { flexDirection: 'row', marginTop: 16, gap: 10 },
  weightInput: {
    flex: 1, backgroundColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, fontSize: 15,
  },
  weightBtn: { backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  weightBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  weightStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  weightStatText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
});
