import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Switch, Alert, Modal,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import {
  getProfile, updateProfile, todayStr,
  getWeeklySchedule, getTrainingDayOptions, setWeeklyScheduleDay,
  exportAllData,
} from '../database/db';
import {
  requestPermissions, scheduleWorkoutNotifications,
  scheduleEveningReminder, scheduleWaterReminders, cancelAllNotifications,
} from '../notifications/scheduler';
import { COLORS } from '../theme';

function Row({ label, value, onChangeText, keyboardType = 'default', unit }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowInputWrap}>
        <TextInput
          style={styles.rowInput}
          value={value?.toString() ?? ''}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholderTextColor={COLORS.textSecondary}
        />
        {unit && <Text style={styles.rowUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

const DOW_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [tdOptions, setTdOptions] = useState([]);
  const [pickerDow, setPickerDow] = useState(null);
  const [exportText, setExportText] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    const [p, sched, opts] = await Promise.all([
      getProfile(db),
      getWeeklySchedule(db),
      getTrainingDayOptions(db),
    ]);
    setProfile(p);
    setWeeklySchedule(sched);
    setTdOptions(opts);
    setForm({
      weight_kg: p.weight_kg?.toString(),
      height_cm: p.height_cm?.toString(),
      age: p.age?.toString(),
      target_calories: p.target_calories?.toString(),
      target_protein: p.target_protein?.toString(),
      target_carbs: p.target_carbs?.toString(),
      target_fats: p.target_fats?.toString(),
      notification_morning_hour: p.notification_morning_hour?.toString(),
      notification_morning_minute: p.notification_morning_minute?.toString().padStart(2, '0'),
      notification_evening_hour: p.notification_evening_hour?.toString(),
      notification_evening_minute: p.notification_evening_minute?.toString().padStart(2, '0'),
      notifications_enabled: p.notifications_enabled === 1,
    });
  }

  async function handleDayChange(dow, tdId) {
    await setWeeklyScheduleDay(db, dow, tdId);
    const opt = tdOptions.find(o => o.id === tdId);
    setWeeklySchedule(prev => prev.map(d =>
      d.day_of_week === dow
        ? { ...d, training_day_id: tdId, name: opt?.name, is_rest_day: opt?.is_rest_day }
        : d
    ));
    setPickerDow(null);
  }

  function field(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function calcTDEE() {
    const w = parseFloat(form.weight_kg) || 74;
    const h = parseFloat(form.height_cm) || 185;
    const a = parseInt(form.age) || 28;
    // Mifflin-St. Jeor (male) × moderately active (1.55)
    const bmr = 10 * w + 6.25 * h - 5 * a + 5;
    return Math.round(bmr * 1.55);
  }

  function applyTDEEBulk() {
    const tdee = calcTDEE();
    const target = tdee + 300;
    const protein = Math.round(parseFloat(form.weight_kg || 74) * 2.1);
    const fats = Math.round(target * 0.25 / 9);
    const carbs = Math.round((target - protein * 4 - fats * 9) / 4);
    field('target_calories', target.toString());
    field('target_protein', protein.toString());
    field('target_carbs', carbs.toString());
    field('target_fats', fats.toString());
    Alert.alert(
      'Macro aggiornati',
      `TDEE stimato: ${tdee} kcal\nTarget bulk (+300): ${target} kcal\n\nP: ${protein}g  C: ${carbs}g  G: ${fats}g`
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updates = {
        weight_kg: parseFloat(form.weight_kg) || 74,
        height_cm: parseFloat(form.height_cm) || 185,
        age: parseInt(form.age) || 28,
        target_calories: parseInt(form.target_calories) || 3200,
        target_protein: parseInt(form.target_protein) || 155,
        target_carbs: parseInt(form.target_carbs) || 380,
        target_fats: parseInt(form.target_fats) || 85,
        notification_morning_hour: parseInt(form.notification_morning_hour) || 8,
        notification_morning_minute: parseInt(form.notification_morning_minute) || 0,
        notification_evening_hour: parseInt(form.notification_evening_hour) || 20,
        notification_evening_minute: parseInt(form.notification_evening_minute) || 0,
        notifications_enabled: form.notifications_enabled ? 1 : 0,
      };
      await updateProfile(db, updates);

      if (form.notifications_enabled) {
        const granted = await requestPermissions();
        if (granted) {
          const sched = await getWeeklySchedule(db);
          await scheduleWorkoutNotifications(updates.notification_morning_hour, updates.notification_morning_minute, sched);
          await scheduleEveningReminder(updates.notification_evening_hour, updates.notification_evening_minute);
          await scheduleWaterReminders();
          Alert.alert('Salvato', 'Profilo e notifiche aggiornati.');
        } else {
          Alert.alert('Permessi notifiche', 'Non hai concesso i permessi per le notifiche. Abilitali nelle impostazioni del telefono.');
        }
      } else {
        await cancelAllNotifications();
        Alert.alert('Salvato', 'Profilo aggiornato. Notifiche disabilitate.');
      }
      loadProfile();
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    try {
      const data = await exportAllData(db);
      setExportText(JSON.stringify(data));
    } catch (e) {
      Alert.alert('Errore export', String(e?.message ?? e));
    }
  }

  async function copyExport() {
    await Clipboard.setStringAsync(exportText);
    Alert.alert('Copiato', 'Dati copiati negli appunti. Incollali nella chat con Claude.');
  }

  if (!form.weight_kg) return null;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Impostazioni</Text>

      <Section title="PROFILO FISICO">
        <Row label="Peso" value={form.weight_kg} onChangeText={v => field('weight_kg', v)} keyboardType="decimal-pad" unit="kg" />
        <Row label="Altezza" value={form.height_cm} onChangeText={v => field('height_cm', v)} keyboardType="decimal-pad" unit="cm" />
        <Row label="Età" value={form.age} onChangeText={v => field('age', v)} keyboardType="number-pad" unit="anni" />

        <TouchableOpacity style={styles.calcBtn} onPress={applyTDEEBulk}>
          <Text style={styles.calcBtnText}>Ricalcola TDEE + macro bulk</Text>
          <Text style={styles.calcBtnSub}>TDEE stimato: {calcTDEE()} kcal → target: {calcTDEE() + 300} kcal</Text>
        </TouchableOpacity>
      </Section>

      <Section title="TARGET MACRO GIORNALIERI">
        <Row label="Calorie" value={form.target_calories} onChangeText={v => field('target_calories', v)} keyboardType="number-pad" unit="kcal" />
        <Row label="Proteine" value={form.target_protein} onChangeText={v => field('target_protein', v)} keyboardType="number-pad" unit="g" />
        <Row label="Carboidrati" value={form.target_carbs} onChangeText={v => field('target_carbs', v)} keyboardType="number-pad" unit="g" />
        <Row label="Grassi" value={form.target_fats} onChangeText={v => field('target_fats', v)} keyboardType="number-pad" unit="g" />
      </Section>

      <Section title="NOTIFICHE">
        <View style={styles.switchRow}>
          <Text style={styles.rowLabel}>Notifiche attive</Text>
          <Switch
            value={form.notifications_enabled}
            onValueChange={v => field('notifications_enabled', v)}
            trackColor={{ true: COLORS.accent }}
            thumbColor="#fff"
          />
        </View>
        {form.notifications_enabled && (
          <>
            <Text style={styles.notifLabel}>Reminder allenamento (mattina)</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={styles.timeInput}
                value={form.notification_morning_hour}
                onChangeText={v => field('notification_morning_hour', v)}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.timeSep}>:</Text>
              <TextInput
                style={styles.timeInput}
                value={form.notification_morning_minute}
                onChangeText={v => field('notification_morning_minute', v)}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={styles.notifLabel}>Reminder nutrizione (sera)</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={styles.timeInput}
                value={form.notification_evening_hour}
                onChangeText={v => field('notification_evening_hour', v)}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.timeSep}>:</Text>
              <TextInput
                style={styles.timeInput}
                value={form.notification_evening_minute}
                onChangeText={v => field('notification_evening_minute', v)}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </>
        )}
      </Section>

      <Section title="CALENDARIO ALLENAMENTI">
        {DOW_NAMES.map((dayName, dow) => {
          const entry = weeklySchedule.find(d => d.day_of_week === dow);
          const label = entry?.name ?? '—';
          const isRest = !entry || entry.is_rest_day;
          return (
            <TouchableOpacity key={dow} style={styles.schedRow} onPress={() => setPickerDow(dow)}>
              <Text style={styles.schedDay}>{dayName}</Text>
              <View style={styles.schedRight}>
                <Text style={[styles.schedName, isRest && styles.schedNameRest]} numberOfLines={1}>
                  {label}
                </Text>
                <Text style={styles.schedArrow}>›</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </Section>

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Salvataggio...' : 'Salva impostazioni'}</Text>
      </TouchableOpacity>

      <Section title="DATI">
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Text style={styles.exportBtnText}>Esporta dati (per analisi)</Text>
          <Text style={styles.exportBtnSub}>Genera un testo con allenamenti, peso e nutrizione da incollare nella chat</Text>
        </TouchableOpacity>
      </Section>

      <Text style={styles.version}>Workout App v1.0 — uso personale</Text>
    </ScrollView>

    {exportText !== null && (
      <Modal transparent animationType="fade" onRequestClose={() => setExportText(null)}>
        <View style={styles.exportOverlay}>
          <View style={styles.exportBox}>
            <Text style={styles.exportTitle}>ESPORTA DATI</Text>
            <Text style={styles.exportHint}>
              Premi "Copia", poi incolla nella chat con Claude. In alternativa tieni premuto sul riquadro e seleziona tutto.
            </Text>
            <TextInput
              style={styles.exportField}
              value={exportText}
              multiline
              editable={false}
              selectTextOnFocus
            />
            <View style={styles.exportActions}>
              <TouchableOpacity style={styles.exportClose} onPress={() => setExportText(null)}>
                <Text style={styles.exportCloseText}>Chiudi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportCopy} onPress={copyExport}>
                <Text style={styles.exportCopyText}>Copia</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )}

    {pickerDow !== null && (
      <Modal transparent animationType="fade" onRequestClose={() => setPickerDow(null)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPickerDow(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.pickerBox}>
            <Text style={styles.pickerTitle}>{DOW_NAMES[pickerDow]}</Text>
            {tdOptions.map(opt => {
              const current = weeklySchedule.find(d => d.day_of_week === pickerDow);
              const isSelected = current?.training_day_id === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                  onPress={() => handleDayChange(pickerDow, opt.id)}
                >
                  <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
                    {opt.name}
                  </Text>
                  {isSelected && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 50 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 20 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.2, marginBottom: 8 },
  sectionCard: { backgroundColor: COLORS.card, borderRadius: 14, overflow: 'hidden' },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLabel: { fontSize: 15, color: COLORS.text },
  rowInputWrap: { flexDirection: 'row', alignItems: 'center' },
  rowInput: {
    backgroundColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    color: COLORS.text, fontSize: 15,
    textAlign: 'right', minWidth: 70,
  },
  rowUnit: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 6 },

  calcBtn: {
    padding: 14, backgroundColor: COLORS.bg, margin: 10, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.accent,
  },
  calcBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },
  calcBtnSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  notifLabel: { fontSize: 13, color: COLORS.textSecondary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  timeInput: {
    backgroundColor: COLORS.border, borderRadius: 8,
    width: 50, paddingHorizontal: 10, paddingVertical: 8,
    color: COLORS.text, fontSize: 18, textAlign: 'center', fontWeight: '700',
  },
  timeSep: { fontSize: 20, color: COLORS.text, marginHorizontal: 8, fontWeight: '700' },

  schedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  schedDay: { fontSize: 15, color: COLORS.text, width: 90 },
  schedRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  schedName: { fontSize: 14, color: COLORS.accent, fontWeight: '600', flexShrink: 1, marginRight: 6 },
  schedNameRest: { color: COLORS.textSecondary, fontWeight: '400' },
  schedArrow: { fontSize: 20, color: COLORS.textSecondary, fontWeight: '300' },

  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  pickerBox: {
    backgroundColor: COLORS.card, borderRadius: 16,
    width: '100%', overflow: 'hidden',
  },
  pickerTitle: {
    fontSize: 14, fontWeight: '700', color: COLORS.textSecondary,
    letterSpacing: 1.1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10,
  },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  pickerOptionSelected: { backgroundColor: COLORS.bg },
  pickerOptionText: { fontSize: 16, color: COLORS.text },
  pickerOptionTextSelected: { color: COLORS.accent, fontWeight: '700' },
  pickerCheck: { fontSize: 16, color: COLORS.accent, fontWeight: '700' },

  saveBtn: {
    backgroundColor: COLORS.accent, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  version: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12 },

  exportBtn: { padding: 16 },
  exportBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },
  exportBtnSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },

  exportOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  exportBox: {
    backgroundColor: COLORS.card, borderRadius: 16, width: '100%', padding: 18,
  },
  exportTitle: {
    fontSize: 14, fontWeight: '700', color: COLORS.textSecondary,
    letterSpacing: 1.1, marginBottom: 8,
  },
  exportHint: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 18 },
  exportField: {
    backgroundColor: COLORS.bg, borderRadius: 10, padding: 12,
    color: COLORS.text, fontSize: 11, height: 200,
    textAlignVertical: 'top', fontFamily: 'Courier',
  },
  exportActions: { flexDirection: 'row', marginTop: 14, gap: 12 },
  exportClose: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  exportCloseText: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
  exportCopy: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: COLORS.accent,
  },
  exportCopyText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
