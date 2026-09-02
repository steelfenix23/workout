// Importa l'export JSON della vecchia app Expo.
//
// Gli esercizi che esistono ancora nella scheda nuova vengono agganciati e
// contribuiscono a progressione, grafici e record. Quelli usciti dalla scheda
// (croci, curl classico, alzate frontali, crunch, goblet squat) finiscono in
// "legacy": restano visibili come storico ma non guidano i carichi, perché
// confrontare un goblet squat con un front squat darebbe suggerimenti sbagliati.

const NAME_MAP = {
  "panca piana con manubri": "panca_piana",
  "panca inclinata 30° - spinte": "panca_inclinata",
  "dips alle parallele": "dips",
  "trazioni alla sbarra": "trazioni",
  "rematore con manubri": "rematore",
  "curl a martello": "curl_martello",
  "shoulder press con manubri": "military_press",
  "alzate laterali": "alzate_laterali",
  "alzate posteriori": "alzate_posteriori",
  "plank": "plank",
  "stacco rumeno con manubri": "stacco_rumeno",
  "bulgarian split squat": "bulgarian",
  "affondi con manubri": "affondi_inversi",
  "calf raise": "calf_raise",
};

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

export function importLegacy(state, raw) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  const exercises = data.exercises || [];
  const sessions = data.sessions || data.workout_sessions || [];
  const sets = data.sets || data.workout_sets || [];
  const weights = data.weightLog || data.weight_log || data.weights || [];

  if (!sessions.length && !weights.length) {
    throw new Error("Nel file non ho trovato né sessioni né pesi. È l'export giusto?");
  }

  const exById = new Map(exercises.map((e) => [e.id, e]));
  const setsBySession = new Map();
  for (const s of sets) {
    const list = setsBySession.get(s.session_id) || [];
    list.push(s);
    setsBySession.set(s.session_id, list);
  }

  const out = structuredClone(state);
  const known = new Set(out.sessions.map((s) => s.id));
  let mapped = 0, legacyCount = 0, imported = 0;

  for (const ses of sessions) {
    const id = "old-" + ses.id;
    if (known.has(id)) continue;
    const rows = setsBySession.get(ses.id) || [];
    const newSets = [];
    const legacySets = [];

    for (const r of rows) {
      const name = norm(exById.get(r.exercise_id)?.name);
      const exId = NAME_MAP[name];
      const entry = {
        setNumber: r.set_number, weight: Number(r.weight_kg) || 0,
        reps: Number(r.reps) || 0, done: true,
      };
      if (exId) { newSets.push({ ...entry, exId }); mapped++; }
      else { legacySets.push({ ...entry, name: exById.get(r.exercise_id)?.name || "?" }); legacyCount++; }
    }

    if (!newSets.length && !legacySets.length) continue;
    imported++;
    out.sessions.push({
      id, dayId: null, date: ses.date,
      startedAt: ses.date + "T18:00:00", endedAt: ses.date + "T19:00:00",
      sets: newSets, note: "Importata dalla vecchia app",
    });
    if (legacySets.length) out.legacy.push({ id, date: ses.date, sets: legacySets });
  }

  for (const w of weights) {
    const date = w.date;
    const kg = Number(w.weight_kg ?? w.kg);
    if (!date || !kg) continue;
    if (!out.weights.some((x) => x.date === date)) out.weights.push({ date, kg });
  }

  out.sessions.sort((a, b) => a.date.localeCompare(b.date));
  out.weights.sort((a, b) => a.date.localeCompare(b.date));

  return { state: out, report: { imported, mapped, legacy: legacyCount, weights: weights.length } };
}
