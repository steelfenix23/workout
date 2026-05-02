import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import {
  getTrainingDayForDate, getExercisesForTrainingDay, getOrCreateSession,
  getSetsForSession, getLastSessionSets, upsertSet, deleteSet,
  completeSession, skipTrainingDay, anticipateTrainingDay, resetDayOverride,
  getExerciseHistory, todayStr, dateStr,
} from '../database/db';
import { COLORS } from '../theme';

function suggestProgression(lastSets) {
  if (!lastSets.length) return null;
  const avgReps = lastSets.reduce((s, x) => s + x.reps, 0) / lastSets.length;
  const avgWeight = lastSets.reduce((s, x) => s + x.weight_kg, 0) / lastSets.length;
  if (avgReps >= 12) return `↑ Aumenta: ${(avgWeight + 1.5).toFixed(1)}kg`;
  if (avgReps >= 10) return `→ Punta a ${Math.ceil(avgReps + 1)} reps`;
  return `→ Mantieni ${avgWeight.toFixed(1)}kg`;
}

function SetRow({ set, onChange, onDelete, isBodyweight }) {
  return (
    <View style={styles.setRow}>
      <Text style={styles.setNum}>{set.set_number}</Text>
      {!isBodyweight && (
        <TextInput
          style={styles.setInput}
          value={set.weight_kg?.toString() ?? ''}
          onChangeText={v => onChange({ ...set, weight_kg: v })}
          keyboardType="decimal-pad"
          placeholder="kg"
          placeholderTextColor={COLORS.textSecondary}
        />
      )}
      <TextInput
        style={styles.setInput}
        value={set.reps?.toString() ?? ''}
        onChangeText={v => onChange({ ...set, reps: v })}
        keyboardType="number-pad"
        placeholder={isBodyweight ? 'sec' : 'reps'}
        placeholderTextColor={COLORS.textSecondary}
      />
      <TextInput
        style={[styles.setInput, styles.rpeInput]}
        value={set.rpe?.toString() ?? ''}
        onChangeText={v => onChange({ ...set, rpe: v })}
        keyboardType="decimal-pad"
        placeholder="RPE"
        placeholderTextColor={COLORS.textSecondary}
      />
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function ExerciseCard({ exercise, sets, lastSets, onSetsChange }) {
  const isBodyweight = exercise.name === 'Plank';
  const suggestion = suggestProgression(
    lastSets.filter(s => s.exercise_id === exercise.exercise_id)
  );
  const lastRelevant = lastSets.filter(s => s.exercise_id === exercise.exercise_id);

  function addSet() {
    const last = sets[sets.length - 1];
    const newSet = {
      set_number: sets.length + 1,
      weight_kg: last ? last.weight_kg : '',
      reps: last ? last.reps : '',
      rpe: '',
      exercise_id: exercise.exercise_id,
    };
    onSetsChange([...sets, newSet]);
  }

  function updateSet(index, updated) {
    const next = [...sets];
    next[index] = updated;
    onSetsChange(next);
  }

  function removeSet(index) {
    const next = sets.filter((_, i) => i !== index).map((s, i) => ({ ...s, set_number: i + 1 }));
    onSetsChange(next);
  }

  return (
    <View style={styles.exerciseCard}>
      <Text style={styles.exerciseName}>{exercise.name}</Text>
      <Text style={styles.exerciseMuscle}>{exercise.muscle_group}</Text>
      <Text style={styles.exerciseTarget}>
        Target: {exercise.target_sets}×{exercise.target_reps_min}–{exercise.target_reps_max}
        {isBodyweight ? 's' : ' reps'}
      </Text>

      {lastRelevant.length > 0 && (
        <Text style={styles.lastSession}>
          Ultima sessione: {lastRelevant.slice(0, exercise.target_sets).map(
            s => `${s.weight_kg}kg×${s.reps}`
          ).join('  ')}
        </Text>
      )}
      {suggestion && <Text style={styles.suggestion}>{suggestion}</Text>}

      <View style={styles.setHeader}>
        <Text style={[styles.setHeaderText, { width: 24 }]}>#</Text>
        {!isBodyweight && <Text style={[styles.setHeaderText, styles.setInput]}>kg</Text>}
        <Text style={[styles.setHeaderText, styles.setInput]}>{isBodyweight ? 'sec' : 'reps'}</Text>
        <Text style={[styles.setHeaderText, styles.rpeInput]}>RPE</Text>
        <View style={styles.deleteBtn} />
      </View>

      {sets.map((s, i) => (
        <SetRow
          key={i}
          set={s}
          isBodyweight={isBodyweight}
          onChange={updated => updateSet(i, updated)}
          onDelete={() => removeSet(i)}
        />
      ))}

      <TouchableOpacity style={styles.addSetBtn} onPress={addSet}>
        <Text style={styles.addSetText}>+ Aggiungi Serie</Text>
      </TouchableOpacity>
    </View>
  );
}

function ExerciseDetailModal({ exercise, onClose }) {
  const db = useSQLiteContext();
  const [tab, setTab] = useState('instructions');
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function loadHistory() {
    if (historyLoaded) return;
    setHistoryLoading(true);
    const h = await getExerciseHistory(db, exercise.exercise_id);
    setHistory(h);
    setHistoryLoaded(true);
    setHistoryLoading(false);
  }

  function switchTab(newTab) {
    setTab(newTab);
    if (newTab === 'history') loadHistory();
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
          <Text style={styles.modalTitle}>{exercise.name}</Text>
          <Text style={styles.modalEquipment}>{exercise.equipment}</Text>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, tab === 'instructions' && styles.tabActive]}
              onPress={() => switchTab('instructions')}
            >
              <Text style={[styles.tabText, tab === 'instructions' && styles.tabTextActive]}>
                Istruzioni
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'history' && styles.tabActive]}
              onPress={() => switchTab('history')}
            >
              <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
                Storico
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'instructions' ? (
            <Text style={styles.modalInstructions}>{exercise.instructions}</Text>
          ) : historyLoading ? (
            <View style={styles.historyCenter}>
              <ActivityIndicator color={COLORS.accent} />
            </View>
          ) : history.length === 0 ? (
            <Text style={styles.noHistory}>Nessuna sessione registrata.</Text>
          ) : (
            <ScrollView style={styles.historyList} nestedScrollEnabled>
              {history.map((session, i) => (
                <View key={i} style={styles.historySession}>
                  <Text style={styles.historyDate}>{session.date}</Text>
                  <Text style={styles.historySets}>
                    {session.sets.map(s =>
                      s.weight_kg > 0 ? `${s.weight_kg}kg×${s.reps}` : `×${s.reps}`
                    ).join('  ')}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Chiudi</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function WorkoutScreen() {
  const db = useSQLiteContext();
  const today = new Date();
  const todayIso = todayStr();

  const [loading, setLoading] = useState(true);
  const [trainingDay, setTrainingDay] = useState(null);
  const [isSkipped, setIsSkipped] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [session, setSession] = useState(null);
  const [setsMap, setSetsMap] = useState({});
  const [lastSets, setLastSets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadWorkout();
    }, [])
  );

  async function loadWorkout() {
    setLoading(true);
    const override = await db.getFirstAsync('SELECT * FROM day_overrides WHERE date = ?', [todayIso]);
    setHasOverride(!!override);
    setIsSkipped(!!override && override.training_day_id === null);

    const td = await getTrainingDayForDate(db, today);
    setTrainingDay(td);

    if (!td || td.is_rest_day) {
      setLoading(false);
      return;
    }

    const exs = await getExercisesForTrainingDay(db, td.id);
    setExercises(exs);

    const sess = await getOrCreateSession(db, td.id, todayIso);
    setSession(sess);

    const [currentSets, prev] = await Promise.all([
      getSetsForSession(db, sess.id),
      getLastSessionSets(db, td.id, todayIso),
    ]);
    setLastSets(prev);

    const map = {};
    for (const ex of exs) {
      const eid = ex.exercise_id;
      const existing = currentSets.filter(s => s.exercise_id === eid);
      if (existing.length > 0) {
        map[eid] = existing.map(s => ({
          ...s,
          weight_kg: s.weight_kg?.toString() ?? '',
          reps: s.reps?.toString() ?? '',
          rpe: s.rpe?.toString() ?? '',
        }));
      } else {
        const prevEx = prev.filter(s => s.exercise_id === eid);
        map[eid] = Array.from({ length: ex.target_sets }, (_, i) => ({
          set_number: i + 1,
          exercise_id: eid,
          weight_kg: prevEx[i]?.weight_kg?.toString() ?? '',
          reps: '',
          rpe: '',
        }));
      }
    }
    setSetsMap(map);
    setLoading(false);
  }

  async function handleSkip() {
    Alert.alert('Salta giornata', 'Vuoi saltare l\'allenamento di oggi?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Salta',
        style: 'destructive',
        onPress: async () => {
          await skipTrainingDay(db, today);
          await loadWorkout();
        },
      },
    ]);
  }

  async function handleAnticipate() {
    Alert.alert('Anticipa', 'Vuoi caricare l\'allenamento di domani oggi?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Anticipa',
        onPress: async () => {
          await anticipateTrainingDay(db, today);
          await loadWorkout();
        },
      },
    ]);
  }

  async function handleReset() {
    await resetDayOverride(db, today);
    await loadWorkout();
  }

  async function saveAll() {
    if (!session) return;
    setSaving(true);
    try {
      for (const [eidStr, sets] of Object.entries(setsMap)) {
        const eid = Number(eidStr);
        const existing = await db.getAllAsync(
          'SELECT set_number FROM workout_sets WHERE session_id = ? AND exercise_id = ?',
          [session.id, eid]
        );
        for (const row of existing) {
          if (!sets.find(s => s.set_number === row.set_number)) {
            await deleteSet(db, session.id, eid, row.set_number);
          }
        }
        for (const s of sets) {
          const w = parseFloat(s.weight_kg) || 0;
          const r = parseInt(s.reps) || 0;
          const rpe = s.rpe ? parseFloat(s.rpe) : null;
          if (r > 0) {
            await upsertSet(db, session.id, eid, s.set_number, w, r, rpe);
          }
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    await saveAll();
    await completeSession(db, session.id);
    setSession(prev => ({ ...prev, completed: 1 }));
    Alert.alert('Ottimo lavoro! 💪', 'Sessione completata e salvata.');
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  if (isSkipped) {
    return (
      <View style={styles.centered}>
        <Text style={styles.restEmoji}>⏭️</Text>
        <Text style={styles.restTitle}>Giornata saltata</Text>
        <Text style={styles.restSubtitle}>Hai saltato l'allenamento di oggi.</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetBtnText}>Ripristina giornata normale</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!trainingDay) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Nessun allenamento configurato.</Text>
      </View>
    );
  }

  if (trainingDay.is_rest_day) {
    return (
      <View style={styles.centered}>
        <Text style={styles.restEmoji}>🛋️</Text>
        <Text style={styles.restTitle}>{trainingDay.name}</Text>
        <Text style={styles.restSubtitle}>
          {trainingDay.name === 'Recupero Attivo'
            ? 'Tapis roulant 20-30 minuti o stretching leggero.'
            : 'Recupero completo. Il muscolo cresce a riposo.'}
        </Text>
        <View style={styles.overrideBtns}>
          <TouchableOpacity style={styles.overrideBtn} onPress={handleAnticipate}>
            <Text style={styles.overrideBtnText}>Anticipa allenamento</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.dayName}>{trainingDay.name}</Text>
          {session?.completed === 1 && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>✓ Completato</Text>
            </View>
          )}
        </View>

        <View style={styles.overrideBtns}>
          {hasOverride ? (
            <TouchableOpacity style={styles.overrideBtn} onPress={handleReset}>
              <Text style={styles.overrideBtnText}>↩ Ripristina</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.overrideBtn} onPress={handleSkip}>
                <Text style={styles.overrideBtnText}>Salta oggi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.overrideBtn} onPress={handleAnticipate}>
                <Text style={styles.overrideBtnText}>Anticipa domani</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {exercises.map(ex => (
          <TouchableOpacity
            key={ex.exercise_id}
            onLongPress={() => setSelectedExercise(ex)}
            delayLongPress={400}
            activeOpacity={1}
          >
            <ExerciseCard
              exercise={ex}
              sets={setsMap[ex.exercise_id] ?? []}
              lastSets={lastSets}
              onSetsChange={updated =>
                setSetsMap(prev => ({ ...prev, [ex.exercise_id]: updated }))
              }
            />
          </TouchableOpacity>
        ))}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={saveAll}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Salvataggio...' : 'Salva progressi'}</Text>
          </TouchableOpacity>

          {session?.completed !== 1 && (
            <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
              <Text style={styles.completeBtnText}>Sessione completata ✓</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.hint}>Tieni premuto un esercizio per istruzioni e storico</Text>
      </ScrollView>

      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dayName: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  completedBadge: { backgroundColor: COLORS.success, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  completedBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  overrideBtns: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  overrideBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  overrideBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },

  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  exerciseName: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  exerciseMuscle: { fontSize: 12, color: COLORS.accent, marginBottom: 4 },
  exerciseTarget: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  lastSession: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  suggestion: { fontSize: 12, color: COLORS.success, fontWeight: '600', marginBottom: 8 },

  setHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  setHeaderText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  setNum: { width: 24, fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  setInput: {
    flex: 1,
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: COLORS.text,
    fontSize: 15,
    marginRight: 6,
    textAlign: 'center',
  },
  rpeInput: { flex: 0.7 },
  deleteBtn: { width: 28, alignItems: 'center' },
  deleteBtnText: { color: COLORS.textSecondary, fontSize: 14 },

  addSetBtn: { marginTop: 6, alignSelf: 'flex-start' },
  addSetText: { color: COLORS.accent, fontWeight: '600', fontSize: 14 },

  actions: { marginTop: 8, gap: 10 },
  saveBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 16 },
  completeBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.5 },
  hint: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginTop: 16 },

  emptyText: { color: COLORS.textSecondary, fontSize: 16 },
  restEmoji: { fontSize: 60, marginBottom: 16 },
  restTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  restSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  resetBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  resetBtnText: { color: COLORS.textSecondary, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  modalEquipment: { fontSize: 12, color: COLORS.accent, marginBottom: 12 },

  tabRow: { flexDirection: 'row', marginBottom: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.accent },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff' },

  modalInstructions: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 20 },
  modalClose: { backgroundColor: COLORS.accent, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  modalCloseText: { color: '#fff', fontWeight: '700' },

  historyCenter: { alignItems: 'center', paddingVertical: 24 },
  historyList: { maxHeight: 260, marginBottom: 8 },
  historySession: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyDate: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  historySets: { fontSize: 13, color: COLORS.textSecondary },
  noHistory: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 24, marginBottom: 8 },
});
