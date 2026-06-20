import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Linking,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import {
  getTrainingDayForDate, getExercisesForTrainingDay, getOrCreateSession,
  getSessionForDate, getSetsForSession, getLastSessionSets, upsertSet, deleteSet,
  completeSession, skipTrainingDay, anticipateTrainingDay, resetDayOverride,
  getExerciseHistory, getExerciseMaxWeightExcluding, addWeightLog, getWeightHistory,
  todayStr, dateStr,
} from '../database/db';
import { COLORS } from '../theme';

const WEIGHT_STEP = 1.5;   // scatti dei manubri regolabili
const MIN_WEIGHT = 4;      // peso minimo di un manubrio
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function repsLabel(min, max, isBodyweight) {
  const unit = isBodyweight ? 's' : ' reps';
  return min === max ? `${min}${unit}` : `${min}–${max}${unit}`;
}

function suggestProgression(lastSets, targetMin, targetMax) {
  if (!lastSets.length) return null;
  const hasWeight = lastSets.some(s => s.weight_kg > 0);
  const avgWeight = hasWeight
    ? lastSets.reduce((s, x) => s + x.weight_kg, 0) / lastSets.length
    : 0;
  const allHitMax = lastSets.every(s => s.reps >= targetMax);
  const anyBelowMin = lastSets.some(s => s.reps < targetMin);

  if (allHitMax) {
    if (!hasWeight) return { text: '↑ Aggiungi carico (zavorra)', color: COLORS.success };
    return { text: `↑ Aumenta: ${(avgWeight + WEIGHT_STEP).toFixed(1)}kg`, color: COLORS.success };
  }
  if (!anyBelowMin) {
    return { text: `→ Completa il range prima di aumentare`, color: COLORS.warning };
  }
  return {
    text: hasWeight ? `↓ Riduci a ${Math.max(0, avgWeight - WEIGHT_STEP).toFixed(1)}kg` : '↓ Riduci il tempo',
    color: COLORS.danger,
  };
}

function SetRow({ set, onChange, onDelete, isBodyweight }) {
  const isDone = parseInt(set.reps) > 0;

  function adjustWeight(delta) {
    const current = parseFloat(set.weight_kg) || 0;
    let next;
    if (delta > 0) {
      // dal vuoto/sotto il minimo si parte da 4kg, poi scatti da 1.5kg
      next = current < MIN_WEIGHT ? MIN_WEIGHT : current + WEIGHT_STEP;
    } else {
      next = current - WEIGHT_STEP;
      if (next < MIN_WEIGHT) next = 0; // sotto il minimo del manubrio → vuoto
    }
    next = Math.round(next * 10) / 10;
    onChange({ ...set, weight_kg: next === 0 ? '' : next.toString() });
  }

  return (
    <View style={styles.setRow}>
      <View style={[styles.setDone, isDone && styles.setDoneDone]}>
        {isDone && <Text style={styles.setDoneText}>✓</Text>}
      </View>
      <Text style={styles.setNum}>{set.set_number}</Text>
      {!isBodyweight && (
        <View style={styles.weightControl}>
          <TouchableOpacity style={styles.weightAdjBtn} onPress={() => adjustWeight(-WEIGHT_STEP)}>
            <Text style={styles.weightAdjText}>−</Text>
          </TouchableOpacity>
          <View style={styles.weightSep} />
          <TextInput
            style={styles.setWeightInput}
            value={set.weight_kg?.toString() ?? ''}
            onChangeText={v => onChange({ ...set, weight_kg: v })}
            keyboardType="decimal-pad"
            placeholder="kg"
            placeholderTextColor={COLORS.textSecondary}
          />
          <View style={styles.weightSep} />
          <TouchableOpacity style={styles.weightAdjBtn} onPress={() => adjustWeight(WEIGHT_STEP)}>
            <Text style={styles.weightAdjText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
      <TextInput
        style={[styles.setRepsInput, isBodyweight && styles.setRepsWide]}
        value={set.reps?.toString() ?? ''}
        onChangeText={v => onChange({ ...set, reps: v })}
        keyboardType="number-pad"
        placeholder={isBodyweight ? 'sec' : 'reps'}
        placeholderTextColor={COLORS.textSecondary}
      />
      <TextInput
        style={styles.setRpeInput}
        value={set.rpe?.toString() ?? ''}
        onChangeText={v => onChange({ ...set, rpe: v })}
        keyboardType="decimal-pad"
        placeholder="RPE"
        placeholderTextColor={COLORS.textSecondary}
      />
      <TouchableOpacity onPress={onDelete} style={styles.setDeleteBtn}>
        <Text style={styles.setDeleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function ExerciseCard({ exercise, sets, lastSets, onSetsChange }) {
  const isBodyweight = exercise.name === 'Plank';
  const exerciseLastSets = lastSets.filter(s => s.exercise_id === exercise.exercise_id);
  const suggestion = suggestProgression(
    exerciseLastSets,
    exercise.target_reps_min,
    exercise.target_reps_max,
  );

  function addSet() {
    const last = sets[sets.length - 1];
    onSetsChange([...sets, {
      set_number: sets.length + 1,
      weight_kg: last?.weight_kg ?? '',
      reps: '',
      rpe: '',
      exercise_id: exercise.exercise_id,
    }]);
  }

  function updateSet(index, updated) {
    const next = [...sets];
    next[index] = updated;
    onSetsChange(next);
  }

  function removeSet(index) {
    onSetsChange(
      sets.filter((_, i) => i !== index).map((s, i) => ({ ...s, set_number: i + 1 }))
    );
  }

  return (
    <View style={styles.exerciseCard}>
      <Text style={styles.exerciseName}>{exercise.name}</Text>
      <Text style={styles.exerciseMuscle}>{exercise.muscle_group}</Text>
      <Text style={styles.exerciseTarget}>
        Target: {exercise.target_sets}×{repsLabel(exercise.target_reps_min, exercise.target_reps_max, isBodyweight)}
      </Text>

      {exerciseLastSets.length > 0 && (
        <Text style={styles.lastSession}>
          Ultima: {exerciseLastSets.slice(0, exercise.target_sets).map(
            s => s.weight_kg > 0 ? `${s.weight_kg}kg×${s.reps}` : `×${s.reps}`
          ).join('  ')}
        </Text>
      )}
      {suggestion && (
        <Text style={[styles.suggestion, { color: suggestion.color }]}>{suggestion.text}</Text>
      )}

      {/* Column headers */}
      <View style={styles.setHeaderRow}>
        <View style={{ width: 36 }} />
        {!isBodyweight && <Text style={[styles.setColHdr, { width: 108 }]}>kg</Text>}
        <Text style={[styles.setColHdr, { flex: 1 }]}>{isBodyweight ? 'sec' : 'reps'}</Text>
        <Text style={[styles.setColHdr, { width: 46 }]}>RPE</Text>
        <View style={{ width: 26 }} />
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

function ExerciseCardReadOnly({ exercise, sets }) {
  const isBodyweight = exercise.name === 'Plank';
  return (
    <View style={styles.exerciseCard}>
      <Text style={styles.exerciseName}>{exercise.name}</Text>
      <Text style={styles.exerciseMuscle}>{exercise.muscle_group}</Text>
      <Text style={styles.exerciseTarget}>
        Target: {exercise.target_sets}×{repsLabel(exercise.target_reps_min, exercise.target_reps_max, isBodyweight)}
        {exercise.suggested_weight > 0 ? `  ·  ${exercise.suggested_weight}kg` : ''}
      </Text>
      {sets.length > 0 && (
        <Text style={styles.lastSession}>
          {sets.map(s =>
            s.weight_kg > 0 ? `${s.weight_kg}kg×${s.reps}` : `×${s.reps}`
          ).join('  ')}
        </Text>
      )}
    </View>
  );
}

function parseArr(s) {
  if (Array.isArray(s)) return s;
  try { return JSON.parse(s) || []; } catch { return []; }
}

function InstructionsView({ exercise }) {
  const steps = parseArr(exercise.steps);
  const mistakes = parseArr(exercise.mistakes);

  return (
    <ScrollView style={styles.detailScroll} nestedScrollEnabled>
      {exercise.primary_muscles ? (
        <>
          <Text style={styles.detailSectionTitle}>MUSCOLI</Text>
          <Text style={styles.detailMuscle}>
            <Text style={styles.detailMusclePrimary}>{exercise.primary_muscles}</Text>
            {exercise.secondary_muscles && exercise.secondary_muscles !== '—'
              ? `  ·  ${exercise.secondary_muscles}` : ''}
          </Text>
        </>
      ) : null}

      {steps.length > 0 && (
        <>
          <Text style={styles.detailSectionTitle}>ESECUZIONE</Text>
          {steps.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </>
      )}

      {mistakes.length > 0 && (
        <>
          <Text style={styles.detailSectionTitle}>ERRORI COMUNI</Text>
          {mistakes.map((m, i) => (
            <Text key={i} style={styles.mistakeText}>✕  {m}</Text>
          ))}
        </>
      )}

      {exercise.tempo ? (
        <>
          <Text style={styles.detailSectionTitle}>TEMPO & RESPIRO</Text>
          <Text style={styles.detailBody}>{exercise.tempo}</Text>
        </>
      ) : null}

      {steps.length === 0 && exercise.instructions ? (
        <Text style={styles.modalInstructions}>{exercise.instructions}</Text>
      ) : null}

      {exercise.video_url ? (
        <TouchableOpacity style={styles.videoBtn} onPress={() => Linking.openURL(exercise.video_url)}>
          <Text style={styles.videoBtnText}>▶  Guarda video dimostrativo</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
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

          <View style={styles.detailTabRow}>
            {['instructions', 'history'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.detailTab, tab === t && styles.detailTabActive]}
                onPress={() => switchTab(t)}
              >
                <Text style={[styles.detailTabText, tab === t && styles.detailTabTextActive]}>
                  {t === 'instructions' ? 'Istruzioni' : 'Storico'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'instructions' ? (
            <InstructionsView exercise={exercise} />
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

function SessionSummaryModal({ summary, onClose }) {
  const { volume, lastVolume, prs } = summary;
  const volDiff = lastVolume > 0
    ? Math.round((volume - lastVolume) / lastVolume * 100)
    : null;
  const volumeText = volume >= 1000
    ? `${(volume / 1000).toFixed(1)}t`
    : `${Math.round(volume)} kg`;

  return (
    <Modal transparent animationType="fade">
      <View style={styles.summaryOverlay}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryEmoji}>💪</Text>
          <Text style={styles.summaryTitle}>Sessione completata!</Text>

          {volume > 0 && (
            <View style={styles.summaryVolumeCard}>
              <Text style={styles.summaryVolumeLabel}>VOLUME TOTALE</Text>
              <Text style={styles.summaryVolumeValue}>{volumeText}</Text>
              {volDiff !== null ? (
                <Text style={[styles.summaryVolumeDiff, { color: volDiff >= 0 ? COLORS.success : COLORS.danger }]}>
                  {volDiff >= 0 ? `+${volDiff}%` : `${volDiff}%`} vs ultima sessione
                </Text>
              ) : (
                <Text style={[styles.summaryVolumeDiff, { color: COLORS.textSecondary }]}>
                  Prima sessione registrata
                </Text>
              )}
            </View>
          )}

          {prs.length > 0 && (
            <View style={styles.summaryPrs}>
              <Text style={styles.summaryPrsTitle}>NUOVI RECORD 🏆</Text>
              {prs.map((pr, i) => (
                <View key={i} style={styles.summaryPrRow}>
                  <Text style={styles.summaryPrName} numberOfLines={1}>{pr.name}</Text>
                  <Text style={styles.summaryPrWeight}>
                    {pr.weight}kg{pr.prevMax > 0 ? ` (+${(pr.weight - pr.prevMax).toFixed(1)})` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.summaryBtn} onPress={onClose}>
            <Text style={styles.summaryBtnText}>Ottimo lavoro! ✓</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function RestDayWidget() {
  const db = useSQLiteContext();
  const [input, setInput] = useState('');
  const [log, setLog] = useState([]);

  useEffect(() => { loadLog(); }, []);

  async function loadLog() {
    const entries = await getWeightHistory(db, 7);
    setLog(entries);
    if (entries.length > 0 && !input) {
      setInput(entries[0].weight_kg.toString());
    }
  }

  async function handleSave() {
    const w = parseFloat(input.replace(',', '.'));
    if (!w || w < 30 || w > 250) {
      Alert.alert('Peso non valido', 'Inserisci un valore tra 30 e 250 kg.');
      return;
    }
    await addWeightLog(db, todayStr(), w);
    loadLog();
  }

  return (
    <View style={styles.weightWidget}>
      <Text style={styles.weightWidgetTitle}>PESO CORPOREO</Text>
      <View style={styles.weightWidgetRow}>
        <TextInput
          style={styles.weightWidgetInput}
          value={input}
          onChangeText={setInput}
          keyboardType="decimal-pad"
          placeholder="74.0"
          placeholderTextColor={COLORS.textSecondary}
          selectTextOnFocus
        />
        <Text style={styles.weightWidgetUnit}>kg</Text>
        <TouchableOpacity style={styles.weightWidgetBtn} onPress={handleSave}>
          <Text style={styles.weightWidgetBtnText}>Salva</Text>
        </TouchableOpacity>
      </View>
      {log.length > 0 && (
        <View style={styles.weightLog}>
          {log.map((entry, i) => (
            <View key={i} style={styles.weightLogRow}>
              <Text style={styles.weightLogDate}>{entry.date}</Text>
              <Text style={styles.weightLogVal}>{entry.weight_kg} kg</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function WorkoutScreen() {
  const db = useSQLiteContext();
  const [viewDate, setViewDate] = useState(() => new Date());
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
  const [summary, setSummary] = useState(null);

  const todayIso = todayStr();

  function viewIso() { return dateStr(viewDate); }
  function isViewingToday() { return viewIso() === todayIso; }

  function viewDateLabel() {
    const iso = viewIso();
    if (iso === todayIso) return 'Oggi';
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (iso === dateStr(yesterday)) return 'Ieri';
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    if (iso === dateStr(tomorrow)) return 'Domani';
    return `${DAY_NAMES[viewDate.getDay()]} ${viewDate.getDate()} ${MONTH_NAMES[viewDate.getMonth()]}`;
  }

  function navigateDay(delta) {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }

  useFocusEffect(
    useCallback(() => { loadWorkout(viewDate); }, [viewDate])
  );

  async function loadWorkout(date) {
    setLoading(true);
    const iso = dateStr(date);
    const isTodayView = iso === todayIso;

    if (isTodayView) {
      const override = await db.getFirstAsync('SELECT * FROM day_overrides WHERE date = ?', [iso]);
      setHasOverride(!!override);
      setIsSkipped(!!override && override.training_day_id === null);
    } else {
      setHasOverride(false);
      setIsSkipped(false);
    }

    const td = await getTrainingDayForDate(db, date);
    setTrainingDay(td);

    if (!td || td.is_rest_day) {
      setExercises([]);
      setSetsMap({});
      setSession(null);
      setLastSets([]);
      setLoading(false);
      return;
    }

    const exs = await getExercisesForTrainingDay(db, td.id);
    setExercises(exs);

    if (isTodayView) {
      const sess = await getOrCreateSession(db, td.id, iso);
      setSession(sess);
      const [currentSets, prev] = await Promise.all([
        getSetsForSession(db, sess.id),
        getLastSessionSets(db, td.id, iso),
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
    } else {
      const sess = await getSessionForDate(db, td.id, iso);
      setSession(sess);
      setLastSets([]);
      const map = {};
      const isPast = iso <= todayIso;
      if (sess) {
        const allSets = await getSetsForSession(db, sess.id);
        for (const ex of exs) {
          map[ex.exercise_id] = allSets
            .filter(s => s.exercise_id === ex.exercise_id)
            .map(s => ({ ...s, weight_kg: s.weight_kg?.toString() ?? '', reps: s.reps?.toString() ?? '', rpe: s.rpe?.toString() ?? '' }));
        }
      } else if (isPast) {
        for (const ex of exs) {
          map[ex.exercise_id] = Array.from({ length: ex.target_sets }, (_, i) => ({
            set_number: i + 1,
            exercise_id: ex.exercise_id,
            weight_kg: '',
            reps: '',
            rpe: '',
          }));
        }
      } else {
        for (const ex of exs) map[ex.exercise_id] = [];
      }
      setSetsMap(map);
    }

    setLoading(false);
  }

  async function handleSkip() {
    Alert.alert('Salta giornata', "Vuoi saltare l'allenamento di oggi?", [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Salta', style: 'destructive',
        onPress: async () => { await skipTrainingDay(db, new Date()); await loadWorkout(viewDate); },
      },
    ]);
  }

  async function handleAnticipate() {
    Alert.alert('Anticipa', 'Vuoi caricare il prossimo allenamento oggi?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Anticipa',
        onPress: async () => { await anticipateTrainingDay(db, new Date()); await loadWorkout(viewDate); },
      },
    ]);
  }

  async function handleReset() {
    await resetDayOverride(db, new Date());
    await loadWorkout(viewDate);
  }

  async function saveAll() {
    setSaving(true);
    try {
      let sess = session;
      if (!sess) {
        if (!trainingDay || viewIso() > todayIso) return null;
        sess = await getOrCreateSession(db, trainingDay.id, viewIso());
        setSession(sess);
      }
      for (const [eidStr, sets] of Object.entries(setsMap)) {
        const eid = Number(eidStr);
        const existing = await db.getAllAsync(
          'SELECT set_number FROM workout_sets WHERE session_id = ? AND exercise_id = ?',
          [sess.id, eid]
        );
        for (const row of existing) {
          if (!sets.find(s => s.set_number === row.set_number)) {
            await deleteSet(db, sess.id, eid, row.set_number);
          }
        }
        for (const s of sets) {
          const w = parseFloat(s.weight_kg) || 0;
          const r = parseInt(s.reps) || 0;
          const rpe = s.rpe ? parseFloat(s.rpe) : null;
          if (r > 0) await upsertSet(db, sess.id, eid, s.set_number, w, r, rpe);
        }
      }
      return sess;
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    const sess = await saveAll();
    if (!sess) return;

    const currentVolume = Object.values(setsMap).flat()
      .reduce((sum, s) => sum + (parseFloat(s.weight_kg) || 0) * (parseInt(s.reps) || 0), 0);
    const lastVolume = lastSets.reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0);

    const prs = [];
    for (const ex of exercises) {
      const eid = ex.exercise_id;
      const curSets = (setsMap[eid] || []).filter(s => parseFloat(s.weight_kg) > 0);
      if (!curSets.length) continue;
      const curMax = Math.max(...curSets.map(s => parseFloat(s.weight_kg) || 0));
      const histMax = await getExerciseMaxWeightExcluding(db, eid, sess.id);
      if (curMax > histMax) {
        prs.push({ name: ex.name, weight: curMax, prevMax: histMax });
      }
    }

    await completeSession(db, sess.id);
    setSession(prev => ({ ...prev, completed: 1 }));
    setSummary({ volume: currentVolume, lastVolume, prs });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const viewing = isViewingToday();
  const editMode = viewIso() <= todayIso;

  function renderDateNav() {
    return (
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateNavArrow} onPress={() => navigateDay(-1)}>
          <Text style={styles.dateNavArrowText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewDate(new Date())} style={styles.dateNavCenter}>
          <Text style={styles.dateNavLabel}>{viewDateLabel()}</Text>
          {!viewing && <Text style={styles.dateNavSub}>Tocca per tornare ad oggi</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateNavArrow} onPress={() => navigateDay(1)}>
          <Text style={styles.dateNavArrowText}>›</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        {renderDateNav()}
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (isSkipped) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.restContent}>
        {renderDateNav()}
        <View style={styles.restHero}>
          <Text style={styles.restEmoji}>⏭️</Text>
          <Text style={styles.restTitle}>Giornata saltata</Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>Ripristina giornata normale</Text>
          </TouchableOpacity>
        </View>
        {viewing && <RestDayWidget />}
      </ScrollView>
    );
  }

  if (!trainingDay || trainingDay.is_rest_day) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.restContent}>
        {renderDateNav()}
        <View style={styles.restHero}>
          <Text style={styles.restEmoji}>{trainingDay ? '🛋️' : '📅'}</Text>
          <Text style={styles.restTitle}>
            {trainingDay ? trainingDay.name : 'Nessun allenamento'}
          </Text>
          <Text style={styles.restSubtitle}>
            {trainingDay?.name === 'Recupero Attivo'
              ? 'Tapis roulant 20-30 minuti o stretching leggero.'
              : trainingDay
              ? 'Recupero completo. Il muscolo cresce a riposo.'
              : ''}
          </Text>
          {viewing && (
            <TouchableOpacity style={styles.overrideBtn} onPress={handleAnticipate}>
              <Text style={styles.overrideBtnText}>Anticipa allenamento</Text>
            </TouchableOpacity>
          )}
        </View>
        {viewing && <RestDayWidget />}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {renderDateNav()}

        <View style={styles.header}>
          <Text style={styles.dayName}>{trainingDay.name}</Text>
          {session?.completed === 1 && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>✓ Completato</Text>
            </View>
          )}
        </View>

        {viewing && (
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
                  <Text style={styles.overrideBtnText}>Anticipa</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {!editMode && (
          <Text style={styles.readOnlyBadge}>Programma previsto</Text>
        )}
        {editMode && !viewing && !session && (
          <Text style={styles.readOnlyBadge}>Sessione non registrata — inserisci i dati e salva</Text>
        )}

        {exercises.map(ex => (
          <TouchableOpacity
            key={ex.exercise_id}
            onLongPress={() => setSelectedExercise(ex)}
            delayLongPress={400}
            activeOpacity={1}
          >
            {editMode ? (
              <ExerciseCard
                exercise={ex}
                sets={setsMap[ex.exercise_id] ?? []}
                lastSets={lastSets}
                onSetsChange={updated => setSetsMap(prev => ({ ...prev, [ex.exercise_id]: updated }))}
              />
            ) : (
              <ExerciseCardReadOnly
                exercise={ex}
                sets={setsMap[ex.exercise_id] ?? []}
              />
            )}
          </TouchableOpacity>
        ))}

        {editMode && (
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
        )}

        {editMode && (
          <Text style={styles.hint}>Tieni premuto un esercizio per istruzioni e storico</Text>
        )}
      </ScrollView>

      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
      {summary && (
        <SessionSummaryModal summary={summary} onClose={() => setSummary(null)} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', padding: 16 },

  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14, backgroundColor: COLORS.card, borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 4,
  },
  dateNavArrow: { paddingHorizontal: 16, paddingVertical: 4 },
  dateNavArrowText: { fontSize: 28, color: COLORS.accent, fontWeight: '300' },
  dateNavCenter: { flex: 1, alignItems: 'center' },
  dateNavLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  dateNavSub: { fontSize: 11, color: COLORS.accent, marginTop: 2 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dayName: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  completedBadge: { backgroundColor: COLORS.success, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  completedBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  readOnlyBadge: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 12, fontStyle: 'italic' },

  overrideBtns: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  overrideBtn: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  overrideBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },

  exerciseCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 14 },
  exerciseName: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  exerciseMuscle: { fontSize: 12, color: COLORS.accent, marginBottom: 4 },
  exerciseTarget: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  lastSession: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  suggestion: { fontSize: 12, fontWeight: '600', marginBottom: 8 },

  // Column headers
  setHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 },
  setColHdr: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' },

  // Set row
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7, gap: 4 },
  setDone: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  setDoneDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  setDoneText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  setNum: { width: 16, textAlign: 'center', fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', flexShrink: 0 },

  // Connected weight control [-][kg][+]
  weightControl: {
    flexDirection: 'row', alignItems: 'center', flexShrink: 0,
    backgroundColor: COLORS.border, borderRadius: 8, overflow: 'hidden',
  },
  weightAdjBtn: { width: 28, height: 34, alignItems: 'center', justifyContent: 'center' },
  weightAdjText: { fontSize: 19, color: COLORS.text, fontWeight: '500', lineHeight: 22 },
  weightSep: { width: 1, height: 20, backgroundColor: COLORS.bg },
  setWeightInput: {
    width: 50, height: 34, backgroundColor: 'transparent',
    paddingHorizontal: 2, color: COLORS.text, fontSize: 14, textAlign: 'center',
  },

  setRepsInput: {
    flex: 1, height: 34, minWidth: 44,
    backgroundColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 4, color: COLORS.text, fontSize: 14, textAlign: 'center',
  },
  setRepsWide: { flex: 1 },
  setRpeInput: {
    width: 44, height: 34, flexShrink: 0,
    backgroundColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 4, color: COLORS.text, fontSize: 13, textAlign: 'center',
  },
  setDeleteBtn: { width: 24, alignItems: 'center', flexShrink: 0 },
  setDeleteText: { color: COLORS.textSecondary, fontSize: 14 },

  addSetBtn: { marginTop: 6, alignSelf: 'flex-start' },
  addSetText: { color: COLORS.accent, fontWeight: '600', fontSize: 14 },

  actions: { marginTop: 8, gap: 10 },
  saveBtn: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.accent,
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  saveBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 16 },
  completeBtn: { backgroundColor: COLORS.success, borderRadius: 12, padding: 14, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.5 },
  hint: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginTop: 16 },

  // Rest day screen
  restContent: { padding: 16, paddingBottom: 40 },
  restHero: { alignItems: 'center', paddingVertical: 28 },
  restEmoji: { fontSize: 60, marginBottom: 16 },
  restTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  restSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  resetBtn: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8,
  },
  resetBtnText: { color: COLORS.textSecondary, fontWeight: '600' },

  // Weight widget (rest days)
  weightWidget: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16 },
  weightWidgetTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.2, marginBottom: 12 },
  weightWidgetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  weightWidgetInput: {
    flex: 1, backgroundColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    color: COLORS.text, fontSize: 20, fontWeight: '700', textAlign: 'center',
  },
  weightWidgetUnit: { fontSize: 16, color: COLORS.textSecondary, marginHorizontal: 10 },
  weightWidgetBtn: { backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  weightWidgetBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  weightLog: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  weightLogRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  weightLogDate: { fontSize: 13, color: COLORS.textSecondary },
  weightLogVal: { fontSize: 13, color: COLORS.text, fontWeight: '600' },

  // Exercise detail modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  modalEquipment: { fontSize: 12, color: COLORS.accent, marginBottom: 12 },
  detailTabRow: { flexDirection: 'row', marginBottom: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.border },
  detailTab: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  detailTabActive: { backgroundColor: COLORS.accent },
  detailTabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  detailTabTextActive: { color: '#fff' },
  modalInstructions: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 20 },

  detailScroll: { maxHeight: 360, marginBottom: 8 },
  detailSectionTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
    letterSpacing: 1.1, marginTop: 14, marginBottom: 6,
  },
  detailMuscle: { fontSize: 14, color: COLORS.textSecondary },
  detailMusclePrimary: { color: COLORS.accent, fontWeight: '700' },
  detailBody: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  stepNum: {
    fontSize: 12, fontWeight: '700', color: '#fff',
    backgroundColor: COLORS.accent, width: 20, height: 20, borderRadius: 10,
    textAlign: 'center', lineHeight: 20, marginRight: 10, overflow: 'hidden',
  },
  stepText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  mistakeText: { fontSize: 14, color: COLORS.text, lineHeight: 20, marginBottom: 5 },
  videoBtn: {
    marginTop: 18, backgroundColor: COLORS.border, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  videoBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },
  modalClose: { backgroundColor: COLORS.accent, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  modalCloseText: { color: '#fff', fontWeight: '700' },
  historyCenter: { alignItems: 'center', paddingVertical: 24 },
  historyList: { maxHeight: 260, marginBottom: 8 },
  historySession: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyDate: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  historySets: { fontSize: 13, color: COLORS.textSecondary },
  noHistory: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 24, marginBottom: 8 },

  // Session summary modal
  summaryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 },
  summaryBox: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, alignItems: 'center' },
  summaryEmoji: { fontSize: 56, marginBottom: 8 },
  summaryTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  summaryVolumeCard: {
    backgroundColor: COLORS.bg, borderRadius: 12, padding: 16,
    width: '100%', alignItems: 'center', marginBottom: 14,
  },
  summaryVolumeLabel: { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 1.2, marginBottom: 4, fontWeight: '700' },
  summaryVolumeValue: { fontSize: 40, fontWeight: '700', color: COLORS.text },
  summaryVolumeDiff: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  summaryPrs: { width: '100%', marginBottom: 16 },
  summaryPrsTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.2, marginBottom: 8 },
  summaryPrRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  summaryPrName: { fontSize: 14, color: COLORS.text, flex: 1, marginRight: 8 },
  summaryPrWeight: { fontSize: 14, color: COLORS.success, fontWeight: '700' },
  summaryBtn: { backgroundColor: COLORS.success, borderRadius: 12, padding: 14, width: '100%', alignItems: 'center' },
  summaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
