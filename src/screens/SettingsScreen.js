import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Switch, Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { getProfile, updateProfile, todayStr } from '../database/db';
import {
  requestPermissions, scheduleWorkoutNotifications,
  scheduleEveningReminder, cancelAllNotifications,
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

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    const p = await getProfile(db);
    setProfile(p);
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
          await scheduleWorkoutNotifications(updates.notification_morning_hour, updates.notification_morning_minute);
          await scheduleEveningReminder(updates.notification_evening_hour, updates.notification_evening_minute);
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

  if (!form.weight_kg) return null;

  return (
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

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Salvataggio...' : 'Salva impostazioni'}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Workout App v1.0 — uso personale</Text>
    </ScrollView>
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

  saveBtn: {
    backgroundColor: COLORS.accent, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  version: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12 },
});
