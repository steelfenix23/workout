export async function initDatabase(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      weight_kg REAL DEFAULT 74,
      height_cm REAL DEFAULT 185,
      age INTEGER DEFAULT 28,
      target_calories INTEGER DEFAULT 3200,
      target_protein INTEGER DEFAULT 155,
      target_carbs INTEGER DEFAULT 380,
      target_fats INTEGER DEFAULT 85,
      notification_morning_hour INTEGER DEFAULT 8,
      notification_morning_minute INTEGER DEFAULT 0,
      notification_evening_hour INTEGER DEFAULT 20,
      notification_evening_minute INTEGER DEFAULT 0,
      notifications_enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS training_days (
      id INTEGER PRIMARY KEY,
      day_of_week INTEGER NOT NULL,
      name TEXT NOT NULL,
      is_rest_day INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      muscle_group TEXT NOT NULL,
      equipment TEXT,
      instructions TEXT
    );

    CREATE TABLE IF NOT EXISTS training_day_exercises (
      id INTEGER PRIMARY KEY,
      training_day_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      order_index INTEGER DEFAULT 0,
      target_sets INTEGER DEFAULT 3,
      target_reps_min INTEGER DEFAULT 8,
      target_reps_max INTEGER DEFAULT 12,
      FOREIGN KEY (training_day_id) REFERENCES training_days(id),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY,
      training_day_id INTEGER,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (training_day_id) REFERENCES training_days(id)
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id INTEGER PRIMARY KEY,
      session_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      weight_kg REAL DEFAULT 0,
      reps INTEGER DEFAULT 0,
      rpe REAL,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    CREATE TABLE IF NOT EXISTS nutrition_log (
      id INTEGER PRIMARY KEY,
      date TEXT NOT NULL,
      meal_type TEXT DEFAULT 'pasto',
      name TEXT NOT NULL,
      calories INTEGER DEFAULT 0,
      protein_g REAL DEFAULT 0,
      carbs_g REAL DEFAULT 0,
      fats_g REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS weight_log (
      id INTEGER PRIMARY KEY,
      date TEXT NOT NULL,
      weight_kg REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const meta = await db.getFirstAsync('SELECT value FROM app_meta WHERE key = ?', ['seeded']);
  if (!meta) {
    await seedDatabase(db);
    await db.runAsync("INSERT INTO app_meta (key, value) VALUES ('seeded', '1')");
  }
}

async function seedDatabase(db) {
  // Profile defaults (74kg, 185cm, bulk target)
  await db.runAsync(
    `INSERT OR IGNORE INTO profile (id, weight_kg, height_cm, age, target_calories, target_protein, target_carbs, target_fats)
     VALUES (1, 74, 185, 28, 3200, 155, 380, 85)`
  );

  // Training plan: Mon-Thu active, Fri optional rest, Sat-Sun rest
  const trainingDays = [
    [0, 'Petto + Tricipiti', 0],
    [1, 'Schiena + Bicipiti', 0],
    [2, 'Spalle + Core', 0],
    [3, 'Gambe', 0],
    [4, 'Recupero Attivo', 1],
    [5, 'Riposo', 1],
    [6, 'Riposo', 1],
  ];
  for (const [dow, name, rest] of trainingDays) {
    await db.runAsync(
      'INSERT INTO training_days (day_of_week, name, is_rest_day) VALUES (?, ?, ?)',
      [dow, name, rest]
    );
  }

  // Exercise library
  const exercises = [
    // Petto
    ['Piegamenti con Zavorra', 'Petto', 'Giubbotto zavorra', 'Posizione push-up, mani larghezza spalle. Petto al suolo, spingi su mantenendo il core compatto.'],
    ['DB Floor Press', 'Petto', 'Manubri', 'Sdraiato a terra, manubri all\'altezza del petto. Spingi verso l\'alto, abbassa finché i gomiti toccano terra.'],
    ['Dips con Zavorra', 'Petto/Tricipiti', 'Parallele + Giubbotto zavorra', 'Alle parallele, busto leggermente inclinato in avanti per coinvolgere il petto. Scendi finché le spalle sono sotto i gomiti.'],
    // Tricipiti
    ['DB Overhead Tricep Extension', 'Tricipiti', 'Manubrio', 'In piedi o seduto, manubrio con entrambe le mani sopra la testa. Piega i gomiti portando il peso dietro la nuca, spingi su.'],
    ['DB Tricep Kickback', 'Tricipiti', 'Manubri', 'Busto parallelo al suolo, gomito a 90°. Estendi il braccio dietro fino a bloccarlo, poi ritorna lentamente.'],
    // Schiena
    ['Trazioni con Zavorra', 'Schiena', 'Sbarra + Giubbotto zavorra', 'Presa prona leggermente più larga delle spalle. Tira il petto verso la sbarra, scendi lentamente con controllo.'],
    ['DB Bent-Over Row', 'Schiena', 'Manubri', 'Busto inclinato a 45°, schiena dritta. Tira i manubri verso i fianchi, gomiti stretti al corpo. Spingi le scapole insieme in cima.'],
    ['DB Single-Arm Row', 'Schiena', 'Manubrio', 'Un ginocchio e una mano su una superficie stabile. Tira il manubrio verso il fianco, ruota leggermente il busto in cima.'],
    // Bicipiti
    ['DB Bicep Curl', 'Bicipiti', 'Manubri', 'In piedi, gomiti fermi ai fianchi. Porta i manubri verso le spalle contraendo i bicipiti, scendi lentamente.'],
    ['DB Hammer Curl', 'Bicipiti', 'Manubri', 'Come il curl ma con presa neutra (pollice in alto). Lavora brachiale e brachioradiale oltre al bicipite.'],
    // Spalle
    ['DB Overhead Press', 'Spalle', 'Manubri', 'In piedi o seduto, manubri all\'altezza delle orecchie. Spingi verso l\'alto fino a quasi bloccare i gomiti, scendi controllato.'],
    ['DB Lateral Raise', 'Spalle', 'Manubri', 'In piedi, leggera inclinazione in avanti. Alza le braccia di lato fino all\'altezza delle spalle, pollice leggermente verso il basso.'],
    ['DB Rear Delt Flye', 'Spalle', 'Manubri', 'Busto parallelo al suolo. Alza le braccia di lato con gomiti leggermente piegati, squeeze delle scapole in cima.'],
    // Core
    ['Hanging Leg Raise', 'Core', 'Sbarra', 'Appeso alla sbarra. Solleva le gambe tese (o piegate) fino all\'altezza dei fianchi o superiore. Scendi lentamente senza oscillare.'],
    ['DB Russian Twist', 'Core', 'Manubrio', 'Seduto a terra, gambe sollevate. Ruota il busto portando il manubrio da un lato all\'altro.'],
    ['Plank', 'Core', 'Nessuno', 'Avambracci a terra, corpo in linea retta. Mantieni la posizione contraendo addome e glutei.'],
    // Gambe
    ['DB Goblet Squat', 'Gambe', 'Manubrio', 'Tieni un manubrio verticale al petto. Piedi larghezza spalle, punta dei piedi leggermente verso fuori. Scendi fino a che le cosce siano parallele al suolo.'],
    ['DB Romanian Deadlift', 'Gambe', 'Manubri', 'In piedi, manubri davanti alle cosce. Cala i manubri lungo le gambe mantenendo schiena dritta e ginocchia leggermente piegate, senti lo stretch nei femorali.'],
    ['DB Walking Lunge', 'Gambe', 'Manubri', 'Fai un passo lungo in avanti, abbassa il ginocchio posteriore quasi al suolo. Alterna le gambe avanzando.'],
    ['DB Single-Leg Romanian Deadlift', 'Gambe', 'Manubrio', 'In piedi su una gamba, manubrio nella mano opposta. Inclina il busto in avanti alzando la gamba libera dietro. Ottimo per equilibrio e femorali.'],
    ['Calf Raise', 'Gambe', 'Manubri', 'In piedi su un gradino o piano, manubri ai lati. Alza i talloni il più possibile, abbassa lentamente sotto il livello del gradino per lo stretch.'],
  ];

  for (const [name, muscle, equipment, instructions] of exercises) {
    await db.runAsync(
      'INSERT INTO exercises (name, muscle_group, equipment, instructions) VALUES (?, ?, ?, ?)',
      [name, muscle, equipment, instructions]
    );
  }

  // Link exercises to training days
  // Day 1 (id=1): Petto + Tricipiti — exercise IDs: 1,2,3,4
  const plan = [
    // [training_day_id, exercise_id, order, sets, reps_min, reps_max]
    [1, 1, 1, 4, 8, 15],   // Piegamenti con Zavorra
    [1, 2, 2, 3, 10, 15],  // DB Floor Press
    [1, 3, 3, 4, 8, 12],   // Dips con Zavorra
    [1, 4, 4, 3, 10, 15],  // DB Overhead Tricep Extension

    [2, 6, 1, 4, 5, 10],   // Trazioni con Zavorra
    [2, 7, 2, 4, 10, 12],  // DB Bent-Over Row
    [2, 8, 3, 3, 10, 12],  // DB Single-Arm Row
    [2, 10, 4, 3, 10, 15], // DB Hammer Curl

    [3, 11, 1, 4, 8, 12],  // DB Overhead Press
    [3, 12, 2, 3, 12, 15], // DB Lateral Raise
    [3, 13, 3, 3, 12, 15], // DB Rear Delt Flye
    [3, 14, 4, 3, 10, 15], // Hanging Leg Raise
    [3, 16, 5, 3, 30, 60], // Plank (reps = secondi)

    [4, 17, 1, 4, 10, 15], // DB Goblet Squat
    [4, 18, 2, 4, 10, 12], // DB Romanian Deadlift
    [4, 19, 3, 3, 10, 12], // DB Walking Lunge
    [4, 20, 4, 3, 10, 10], // DB Single-Leg Romanian Deadlift
    [4, 21, 5, 3, 15, 25], // Calf Raise
  ];

  for (const [tdId, exId, ord, sets, rMin, rMax] of plan) {
    await db.runAsync(
      `INSERT INTO training_day_exercises
       (training_day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tdId, exId, ord, sets, rMin, rMax]
    );
  }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function getProfile(db) {
  return db.getFirstAsync('SELECT * FROM profile WHERE id = 1');
}

export async function updateProfile(db, fields) {
  const keys = Object.keys(fields);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => fields[k]);
  await db.runAsync(`UPDATE profile SET ${sets} WHERE id = 1`, vals);
}

export async function getTrainingDayForDate(db, date) {
  // date is a JS Date object; day_of_week: 0=Mon … 6=Sun
  const dow = (date.getDay() + 6) % 7;
  return db.getFirstAsync('SELECT * FROM training_days WHERE day_of_week = ?', [dow]);
}

export async function getExercisesForTrainingDay(db, trainingDayId) {
  return db.getAllAsync(
    `SELECT tde.*, e.name, e.muscle_group, e.equipment, e.instructions
     FROM training_day_exercises tde
     JOIN exercises e ON e.id = tde.exercise_id
     WHERE tde.training_day_id = ?
     ORDER BY tde.order_index`,
    [trainingDayId]
  );
}

export async function getOrCreateSession(db, trainingDayId, dateStr) {
  let session = await db.getFirstAsync(
    'SELECT * FROM workout_sessions WHERE date = ? AND training_day_id = ?',
    [dateStr, trainingDayId]
  );
  if (!session) {
    const result = await db.runAsync(
      'INSERT INTO workout_sessions (training_day_id, date, completed) VALUES (?, ?, 0)',
      [trainingDayId, dateStr]
    );
    session = { id: result.lastInsertRowId, training_day_id: trainingDayId, date: dateStr, completed: 0 };
  }
  return session;
}

export async function getSetsForSession(db, sessionId) {
  return db.getAllAsync(
    'SELECT * FROM workout_sets WHERE session_id = ? ORDER BY exercise_id, set_number',
    [sessionId]
  );
}

export async function getLastSessionSets(db, trainingDayId, currentDate) {
  const lastSession = await db.getFirstAsync(
    `SELECT * FROM workout_sessions
     WHERE training_day_id = ? AND date < ? AND completed = 1
     ORDER BY date DESC LIMIT 1`,
    [trainingDayId, currentDate]
  );
  if (!lastSession) return [];
  return db.getAllAsync(
    'SELECT * FROM workout_sets WHERE session_id = ?',
    [lastSession.id]
  );
}

export async function upsertSet(db, sessionId, exerciseId, setNumber, weightKg, reps, rpe) {
  const existing = await db.getFirstAsync(
    'SELECT id FROM workout_sets WHERE session_id = ? AND exercise_id = ? AND set_number = ?',
    [sessionId, exerciseId, setNumber]
  );
  if (existing) {
    await db.runAsync(
      'UPDATE workout_sets SET weight_kg = ?, reps = ?, rpe = ? WHERE id = ?',
      [weightKg, reps, rpe ?? null, existing.id]
    );
  } else {
    await db.runAsync(
      'INSERT INTO workout_sets (session_id, exercise_id, set_number, weight_kg, reps, rpe) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, exerciseId, setNumber, weightKg, reps, rpe ?? null]
    );
  }
}

export async function deleteSet(db, sessionId, exerciseId, setNumber) {
  await db.runAsync(
    'DELETE FROM workout_sets WHERE session_id = ? AND exercise_id = ? AND set_number = ?',
    [sessionId, exerciseId, setNumber]
  );
}

export async function completeSession(db, sessionId) {
  await db.runAsync('UPDATE workout_sessions SET completed = 1 WHERE id = ?', [sessionId]);
}

export async function getNutritionForDate(db, dateStr) {
  return db.getAllAsync(
    'SELECT * FROM nutrition_log WHERE date = ? ORDER BY id',
    [dateStr]
  );
}

export async function addMeal(db, dateStr, mealType, name, calories, protein, carbs, fats) {
  await db.runAsync(
    'INSERT INTO nutrition_log (date, meal_type, name, calories, protein_g, carbs_g, fats_g) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [dateStr, mealType, name, calories, protein, carbs, fats]
  );
}

export async function deleteMeal(db, id) {
  await db.runAsync('DELETE FROM nutrition_log WHERE id = ?', [id]);
}

export async function getWeeklySessions(db, mondayStr, sundayStr) {
  return db.getAllAsync(
    `SELECT ws.*, td.name, td.is_rest_day
     FROM workout_sessions ws
     JOIN training_days td ON td.id = ws.training_day_id
     WHERE ws.date >= ? AND ws.date <= ?`,
    [mondayStr, sundayStr]
  );
}

export async function getSessionHistory(db, limit = 30) {
  return db.getAllAsync(
    `SELECT ws.*, td.name
     FROM workout_sessions ws
     JOIN training_days td ON td.id = ws.training_day_id
     WHERE ws.completed = 1
     ORDER BY ws.date DESC LIMIT ?`,
    [limit]
  );
}

export async function getExerciseHistory(db, exerciseId, limit = 10) {
  return db.getAllAsync(
    `SELECT ws.date, wset.set_number, wset.weight_kg, wset.reps, wset.rpe
     FROM workout_sets wset
     JOIN workout_sessions ws ON ws.id = wset.session_id
     WHERE wset.exercise_id = ? AND ws.completed = 1
     ORDER BY ws.date DESC, wset.set_number ASC
     LIMIT ?`,
    [exerciseId, limit]
  );
}

export async function getNutritionHistory(db, days = 14) {
  return db.getAllAsync(
    `SELECT date,
            SUM(calories) as total_calories,
            SUM(protein_g) as total_protein,
            SUM(carbs_g) as total_carbs,
            SUM(fats_g) as total_fats
     FROM nutrition_log
     GROUP BY date
     ORDER BY date DESC
     LIMIT ?`,
    [days]
  );
}

export async function addWeightLog(db, dateStr, weightKg) {
  await db.runAsync(
    'INSERT OR REPLACE INTO weight_log (date, weight_kg) VALUES (?, ?)',
    [dateStr, weightKg]
  );
}

export async function getWeightHistory(db, limit = 30) {
  return db.getAllAsync(
    'SELECT * FROM weight_log ORDER BY date DESC LIMIT ?',
    [limit]
  );
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function dateStr(date) {
  return date.toISOString().slice(0, 10);
}
