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
      water_goal_bottles REAL DEFAULT 2,
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
      suggested_weight REAL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS food_database (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      portion REAL NOT NULL,
      unit TEXT DEFAULT 'g',
      calories INTEGER DEFAULT 0,
      protein_g REAL DEFAULT 0,
      carbs_g REAL DEFAULT 0,
      fats_g REAL DEFAULT 0,
      category TEXT DEFAULT 'Altro'
    );

    CREATE TABLE IF NOT EXISTS water_log (
      id INTEGER PRIMARY KEY,
      date TEXT NOT NULL,
      glasses INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS day_overrides (
      date TEXT PRIMARY KEY,
      training_day_id INTEGER
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

  const version = await db.getFirstAsync("SELECT value FROM app_meta WHERE key = 'seed_version'");
  const currentVersion = version ? parseInt(version.value) : 0;

  if (currentVersion < 2) {
    await db.execAsync(`
      DELETE FROM training_day_exercises;
      DELETE FROM exercises;
      DELETE FROM training_days;
      DELETE FROM food_database;
    `);
    await seedDatabase(db);
    await db.runAsync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seed_version', '2')");
    await db.runAsync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seeded', '1')");
  }

  if (currentVersion < 3) {
    await db.execAsync('DELETE FROM food_database;');
    await seedFoods(db);
    await db.runAsync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seed_version', '3')");
  }

  if (currentVersion < 4) {
    const cols = await db.getAllAsync("PRAGMA table_info(profile)");
    if (!cols.find(c => c.name === 'schedule_offset')) {
      await db.execAsync('ALTER TABLE profile ADD COLUMN schedule_offset INTEGER DEFAULT 0');
    }
    await seedFoodsV4(db);
    await db.runAsync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seed_version', '4')");
  }

  const profileExists = await db.getFirstAsync('SELECT id FROM profile WHERE id = 1');
  if (!profileExists) {
    await db.runAsync(
      `INSERT INTO profile (id, weight_kg, height_cm, age, target_calories, target_protein, target_carbs, target_fats, water_goal_bottles)
       VALUES (1, 74, 185, 28, 3200, 155, 380, 85, 2)`
    );
  }
}

async function seedDatabase(db) {
  // Training days
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
    await db.runAsync('INSERT INTO training_days (day_of_week, name, is_rest_day) VALUES (?, ?, ?)', [dow, name, rest]);
  }

  // Exercises with Italian descriptions
  const exercises = [
    // PETTO
    [
      'Panca Piana con Manubri', 'Petto', 'Manubri',
      'Sdraiati a terra (o su una panca), un manubrio per mano all\'altezza del petto con i gomiti a 90°. Spingi i manubri verso l\'alto fino a quasi bloccare le braccia, poi scendi lentamente. Senti la contrazione al centro del petto in cima al movimento.'
    ],
    [
      'Panca Inclinata 30° - Spinte', 'Petto (alto)', 'Manubri',
      'Sdraiati su una superficie inclinata a circa 30° (puoi usare cuscini o il bordo del letto). Parti con i manubri all\'altezza delle spalle e spingi verso l\'alto. L\'inclinazione sposta il lavoro sulla parte alta del petto, zona difficile da sviluppare.'
    ],
    [
      'Panca Inclinata 30° - Croci', 'Petto (alto)', 'Manubri',
      'Stesso setup inclinato a 30°. Parti con le braccia tese sopra il petto, poi apri lentamente le braccia di lato ad arco (come abbracciare un albero grande) fino a sentire lo stretch nel petto. Richiudi seguendo lo stesso arco. Usa un peso più basso delle spinte — qui conta la tecnica, non il carico.'
    ],
    // TRICIPITI
    [
      'Dips alle Parallele', 'Tricipiti / Petto basso', 'Parallele',
      'Appoggiati sulle parallele con le braccia tese e il corpo verticale. Piega i gomiti abbassando il corpo finché le spalle scendono sotto il livello dei gomiti, poi spingi su. Tieni il busto verticale per isolare i tricipiti. Aggiungi il giubbotto zavorra quando riesci a fare 12+ reps con facilità.'
    ],
    // SCHIENA
    [
      'Trazioni alla Sbarra', 'Schiena larga (Lat)', 'Sbarra',
      'Appeso alla sbarra con presa più larga delle spalle (palmi verso avanti). Tira il corpo verso l\'alto portando il mento sopra la sbarra, stringendo le scapole insieme. Scendi lentamente in 2-3 secondi — la discesa controllata è fondamentale per la crescita muscolare. Aggiungi il giubbotto quando superi 8 reps consecutive.'
    ],
    [
      'Rematore con Manubri', 'Schiena (medio-alta)', 'Manubri',
      'In piedi, inclina il busto a 45° con la schiena dritta e le ginocchia leggermente piegate. Tieni un manubrio per mano con le braccia tese verso il basso. Tira i manubri verso i fianchi, stringendo le scapole insieme in cima. Abbassa lentamente. Non oscillare con il busto.'
    ],
    // BICIPITI
    [
      'Curl Classico con Manubri', 'Bicipiti', 'Manubri',
      'In piedi, gomiti fermi ai fianchi (non spostarli durante il movimento). Porta i manubri verso le spalle ruotando il polso (supinazione — il pollice verso l\'esterno in cima). Contrai il bicipite in cima e scendi lentamente. Evita di usare lo slancio del busto.'
    ],
    [
      'Curl a Martello', 'Bicipiti / Brachiale', 'Manubri',
      'Come il curl classico ma con presa neutra: il pollice punta verso l\'alto per tutto il movimento, non ruotare il polso. Questo variante lavora anche il brachiale (sotto il bicipite) e il brachioradiale (avambraccio), dando spessore al braccio visto di lato.'
    ],
    // SPALLE
    [
      'Shoulder Press con Manubri', 'Spalle (deltoide)', 'Manubri',
      'In piedi o seduto, porta i manubri all\'altezza delle orecchie con i gomiti a 90°. Spingi verso l\'alto fino a quasi toccare i manubri sopra la testa, poi scendi controllato. Lavora tutto il deltoide (anteriore, laterale) e i tricipiti come muscolo ausiliario.'
    ],
    [
      'Alzate Laterali', 'Spalle (deltoide laterale)', 'Manubri',
      'In piedi con i manubri ai fianchi. Alza le braccia di lato fino all\'altezza delle spalle, con i gomiti leggermente piegati e il pollice leggermente verso il basso. Non usare slancio. Questo esercizio è fondamentale per la larghezza delle spalle — usa un peso leggero e fai le reps lentamente.'
    ],
    [
      'Alzate Frontali', 'Spalle (deltoide anteriore)', 'Manubri',
      'In piedi con i manubri davanti alle cosce. Alza le braccia davanti a te fino all\'altezza delle spalle (non oltre), poi abbassa lentamente. Lavora la parte frontale della spalla. Se hai già fatto bene la shoulder press, questo esercizio richiede poco peso.'
    ],
    // CORE
    [
      'Crunch', 'Core (addome)', 'Nessuno',
      'Sdraiati a terra con le ginocchia piegate e i piedi piatti. Metti le mani dietro la testa senza tirare il collo. Contrai l\'addome portando le spalle e la parte alta della schiena verso le ginocchia — non fare un sit-up completo, basta sollevare le spalle da terra. Tieni la contrazione 1 secondo in cima.'
    ],
    [
      'Plank', 'Core (stabilità)', 'Nessuno',
      'Appoggiati sugli avambracci e le punte dei piedi, corpo in linea retta dalla testa ai talloni. Contrai l\'addome e i glutei. Non far cedere i fianchi verso il basso né alzarli troppo. Respira normalmente. I secondi indicati sono il tempo da mantenere la posizione.'
    ],
    // GAMBE
    [
      'Goblet Squat', 'Gambe (quadricipiti / glutei)', 'Manubrio',
      'Tieni un manubrio verticale con entrambe le mani al petto (come un calice). Piedi larghezza spalle, punte leggermente verso fuori. Scendi lentamente piegando le ginocchia fino a che le cosce siano parallele al suolo (o più in basso se ci riesci), poi risali. Tieni il busto eretto e le ginocchia allineate con le punte dei piedi.'
    ],
    [
      'Affondi con Manubri', 'Gambe (quadricipiti / glutei)', 'Manubri',
      'In piedi con un manubrio per mano ai fianchi. Fai un passo lungo in avanti, abbassa il ginocchio posteriore quasi al suolo (senza toccarlo), poi spingi con il piede anteriore per tornare in piedi. Alterna le gambe. Mantieni il busto eretto durante tutto il movimento.'
    ],
    [
      'Calf Raise', 'Gambe (polpacci)', 'Manubri (opzionale)',
      'In piedi sul bordo di un gradino o rialzo con i talloni fuori dal bordo. Alzati sulle punte il più possibile, poi scendi lentamente fino a sentire lo stretch nel polpaccio (talloni sotto il livello del gradino). Puoi tenere un manubrio per mano per aggiungere resistenza quando diventa troppo facile.'
    ],
  ];

  for (const [name, muscle, equipment, instructions] of exercises) {
    await db.runAsync(
      'INSERT INTO exercises (name, muscle_group, equipment, instructions) VALUES (?, ?, ?, ?)',
      [name, muscle, equipment, instructions]
    );
  }

  // Training day exercises [tdId, exId, order, sets, repsMin, repsMax, suggestedWeight]
  // IDs: 1=PancaPiana, 2=InclinataSp, 3=InclCroci, 4=Dips, 5=Trazioni, 6=Rematore,
  //      7=CurlClass, 8=CurlMart, 9=ShoulderPress, 10=AlzateLat, 11=AlzateFront,
  //      12=Crunch, 13=Plank, 14=GobletSquat, 15=Affondi, 16=CalfRaise

  const plan = [
    // Lunedì: Petto + Tricipiti
    [1, 1, 1, 4, 10, 10, 18],   // Panca Piana 4×10 18kg
    [1, 2, 2, 3, 10, 10, 14.5], // Inclinata Spinte 3×10 14.5kg
    [1, 3, 3, 3, 12, 12, 8.5],  // Inclinata Croci 3×12 8.5kg
    [1, 4, 4, 3, 8, 12, 0],     // Dips 3×max bw

    // Martedì: Schiena + Bicipiti
    [2, 5, 1, 4, 5, 8, 0],      // Trazioni 4×max bw
    [2, 6, 2, 4, 10, 10, 14.5], // Rematore 4×10 14.5kg
    [2, 7, 3, 3, 10, 10, 12],   // Curl Classico 3×10 12kg
    [2, 8, 4, 3, 10, 10, 12],   // Curl Martello 3×10 12kg

    // Mercoledì: Spalle + Core
    [3, 9, 1, 4, 10, 10, 12],   // Shoulder Press 4×10 12kg
    [3, 10, 2, 3, 15, 15, 6],   // Alzate Laterali 3×15 6kg
    [3, 11, 3, 3, 12, 12, 7],   // Alzate Frontali 3×12 7kg
    [3, 12, 4, 3, 15, 20, 0],   // Crunch 3×15-20 bw
    [3, 13, 5, 3, 30, 45, 0],   // Plank 3×30-45s bw

    // Giovedì: Gambe
    [4, 14, 1, 3, 12, 12, 10],  // Goblet Squat 3×12 10kg
    [4, 15, 2, 3, 10, 10, 8],   // Affondi 3×10 per lato 8kg
    [4, 16, 3, 3, 20, 20, 0],   // Calf Raise 3×20 bw
  ];

  for (const [tdId, exId, ord, sets, rMin, rMax, sugW] of plan) {
    await db.runAsync(
      `INSERT INTO training_day_exercises
       (training_day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, suggested_weight)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tdId, exId, ord, sets, rMin, rMax, sugW]
    );
  }

  await seedFoods(db);
}

async function seedFoods(db) {
  const foods = [
    // [name, portion, unit, calories, protein, carbs, fats, category]
    // COLAZIONE
    ['Latte intero', 150, 'ml', 97, 5, 7, 5, 'Colazione'],
    ['Caffè espresso', 30, 'ml', 2, 0.1, 0.3, 0, 'Colazione'],
    ['Biscotti (2 pezzi)', 20, 'g', 90, 1, 13, 4, 'Colazione'],
    ['Farina di avena', 50, 'g', 185, 7, 31, 4, 'Colazione'],
    ['Yogurt greco (metà)', 75, 'g', 65, 9, 4, 2, 'Latticini'],
    ['Yogurt greco (intero)', 150, 'g', 130, 18, 8, 3, 'Latticini'],
    ['Taralli', 40, 'g', 175, 5, 26, 6, 'Snack'],
    ['Corn Flakes', 30, 'g', 113, 2, 26, 0.3, 'Cereali'],
    // PANE
    ['Pane bianco (1 fetta)', 50, 'g', 130, 4, 25, 1, 'Pane'],
    ['Pane bianco (2 fette)', 100, 'g', 265, 9, 52, 1, 'Pane'],
    // UOVA
    ['Uova (1 uovo)', 60, 'g', 85, 7, 0.5, 6, 'Uova'],
    ['Uova (2 uova)', 120, 'g', 170, 14, 1, 12, 'Uova'],
    ['Uova (4 uova)', 240, 'g', 340, 28, 2, 24, 'Uova'],
    ['Albume (150ml)', 150, 'ml', 78, 16, 1, 0.3, 'Uova'],
    // AFFETTATI
    ['Fesa di tacchino', 100, 'g', 107, 22, 1, 2, 'Affettati'],
    // CEREALI
    ['Riso bianco (crudo)', 120, 'g', 432, 9, 95, 1, 'Cereali'],
    ['Pasta (cruda)', 120, 'g', 428, 15, 86, 2, 'Cereali'],
    // PESCE
    ['Tonno sott\'olio sgocciolato (1 scatola 80g)', 80, 'g', 170, 21, 0, 9, 'Pesce'],
    ['Tonno sott\'olio sgocciolato (2 scatole)', 160, 'g', 340, 42, 0, 18, 'Pesce'],
    // CARNE
    ['Hamburger macinato manzo (100g)', 100, 'g', 250, 20, 0, 18, 'Carne'],
    ['Hamburger macinato manzo (200g)', 200, 'g', 500, 40, 0, 36, 'Carne'],
    ['Petto di pollo', 250, 'g', 298, 56, 0, 7, 'Carne'],
    ['Scaloppine di lonza', 200, 'g', 280, 42, 0, 12, 'Carne'],
    // LATTICINI
    ['Mozzarella di bufala (1 pezzo 80g)', 80, 'g', 195, 11, 1, 16, 'Latticini'],
    ['Mozzarella di bufala (2 pezzi)', 160, 'g', 390, 22, 2, 32, 'Latticini'],
    // VERDURE
    ['Lattuga', 100, 'g', 15, 1.3, 2, 0.2, 'Verdure'],
    ['Zucchine', 150, 'g', 25, 2, 4, 0.3, 'Verdure'],
    ['Carciofi', 150, 'g', 70, 5, 10, 0.3, 'Verdure'],
    ['Rucola', 100, 'g', 25, 2.6, 2, 0.7, 'Verdure'],
    ['Pomodori', 150, 'g', 27, 1.3, 5, 0.3, 'Verdure'],
    ['Pomodorini', 100, 'g', 20, 1, 4, 0.2, 'Verdure'],
    ['Melanzane grigliate', 150, 'g', 45, 1.5, 8, 1, 'Verdure'],
    ['Zucca', 150, 'g', 45, 1.5, 10, 0.2, 'Verdure'],
    // CONDIMENTI
    ['Pesto di rucola', 30, 'g', 110, 2, 2, 11, 'Condimenti'],
    ['Sugo al pomodoro', 100, 'g', 45, 1.5, 8, 1, 'Condimenti'],
    ['Besciamella', 50, 'g', 75, 2, 5, 5, 'Condimenti'],
    ['Olive', 30, 'g', 60, 0.5, 1, 6, 'Condimenti'],
    // PASTI COMPLETI
    ['Riso tonno olive pomodorini (piatto completo)', 1, 'porzione', 852, 52, 102, 20, 'Pasti completi'],
    ['Lasagna (porzione)', 1, 'porzione', 815, 37, 62, 43, 'Pasti completi'],
    ['Pancake proteici avena + yogurt greco + albume', 1, 'porzione', 330, 32, 36, 6, 'Pasti completi'],
    ['Frittatina 2 uova + pane', 1, 'porzione', 300, 18, 26, 13, 'Pasti completi'],
    ['Fesa tacchino + pane', 1, 'porzione', 237, 26, 26, 3, 'Pasti completi'],
  ];

  for (const [name, portion, unit, cal, pro, carb, fat, cat] of foods) {
    await db.runAsync(
      'INSERT INTO food_database (name, portion, unit, calories, protein_g, carbs_g, fats_g, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, portion, unit, cal, pro, carb, fat, cat]
    );
  }
}

async function seedFoodsV4(db) {
  // Valori per 100g se non diversamente indicato — fonte USDA/INRAN
  const foods = [
    // CARNE (per 100g)
    ['Petto di pollo cotto (100g)', 100, 'g', 165, 31, 0, 3.6, 'Carne'],
    ['Petto di pollo crudo (100g)', 100, 'g', 120, 23, 0, 2.6, 'Carne'],
    ['Coscia di pollo cotta (100g)', 100, 'g', 215, 18, 0, 15, 'Carne'],
    ['Macinato di manzo magro (100g)', 100, 'g', 137, 22, 0, 5, 'Carne'],
    ['Bistecca di manzo (100g)', 100, 'g', 250, 26, 0, 15, 'Carne'],
    ['Lonza di maiale (100g)', 100, 'g', 145, 21, 0, 6, 'Carne'],
    ['Prosciutto cotto (100g)', 100, 'g', 132, 15, 1.5, 7, 'Affettati'],
    ['Prosciutto crudo (100g)', 100, 'g', 268, 25, 0.3, 18, 'Affettati'],
    ['Bresaola (100g)', 100, 'g', 151, 33, 0.5, 2, 'Affettati'],
    ['Speck (100g)', 100, 'g', 296, 27, 0.4, 20, 'Affettati'],
    ['Mortadella (100g)', 100, 'g', 311, 14, 0.9, 28, 'Affettati'],
    // PESCE (per 100g)
    ['Salmone (100g)', 100, 'g', 208, 20, 0, 13, 'Pesce'],
    ['Merluzzo (100g)', 100, 'g', 82, 18, 0, 0.7, 'Pesce'],
    ['Sgombro (100g)', 100, 'g', 205, 19, 0, 14, 'Pesce'],
    ['Gamberetti (100g)', 100, 'g', 85, 18, 0.9, 1, 'Pesce'],
    ["Sardine sott'olio sgocciolate (100g)", 100, 'g', 208, 25, 0, 12, 'Pesce'],
    ['Trota (100g)', 100, 'g', 119, 20, 0, 4, 'Pesce'],
    // LATTICINI (per 100g)
    ['Ricotta vaccina (100g)', 100, 'g', 136, 9, 3.5, 10, 'Latticini'],
    ['Fiocchi di latte (100g)', 100, 'g', 98, 11, 3.4, 4.3, 'Latticini'],
    ['Parmigiano reggiano (100g)', 100, 'g', 431, 36, 0, 29, 'Latticini'],
    ['Grana Padano (100g)', 100, 'g', 384, 33, 0, 28, 'Latticini'],
    ['Fior di latte (100g)', 100, 'g', 254, 18, 2.2, 19, 'Latticini'],
    ['Latte scremato (100ml)', 100, 'ml', 34, 3.4, 4.9, 0.1, 'Latticini'],
    ['Kefir (100ml)', 100, 'ml', 60, 3.3, 4, 3.5, 'Latticini'],
    // CEREALI (per 100g crudo se non indicato)
    ['Avena (100g)', 100, 'g', 389, 17, 66, 7, 'Cereali'],
    ['Riso basmati (100g)', 100, 'g', 356, 7, 78, 0.6, 'Cereali'],
    ['Riso integrale (100g)', 100, 'g', 370, 8, 76, 3, 'Cereali'],
    ['Riso basmati cotto (100g)', 100, 'g', 130, 2.7, 28, 0.3, 'Cereali'],
    ['Pasta cotta (100g)', 100, 'g', 158, 5.8, 31, 0.9, 'Cereali'],
    ['Pasta integrale cruda (100g)', 100, 'g', 352, 13, 66, 2.5, 'Cereali'],
    ['Quinoa (100g)', 100, 'g', 368, 14, 64, 6, 'Cereali'],
    ['Farro (100g)', 100, 'g', 340, 14, 68, 2.5, 'Cereali'],
    ['Orzo perlato (100g)', 100, 'g', 352, 10, 77, 1.2, 'Cereali'],
    ['Gallette di riso (100g)', 100, 'g', 381, 7, 80, 3, 'Cereali'],
    // PANE (per 100g)
    ['Pane integrale (100g)', 100, 'g', 247, 9, 41, 4, 'Pane'],
    ['Pane di segale (100g)', 100, 'g', 229, 6, 48, 1.5, 'Pane'],
    ['Piadina (100g)', 100, 'g', 330, 8, 50, 11, 'Pane'],
    // LEGUMI (per 100g cotti)
    ['Lenticchie cotte (100g)', 100, 'g', 116, 9, 20, 0.4, 'Legumi'],
    ['Ceci cotti (100g)', 100, 'g', 164, 9, 27, 2.6, 'Legumi'],
    ['Fagioli borlotti cotti (100g)', 100, 'g', 111, 7, 20, 0.5, 'Legumi'],
    ['Edamame (100g)', 100, 'g', 121, 11, 9, 5, 'Legumi'],
    ['Tofu (100g)', 100, 'g', 76, 8, 1.9, 4.8, 'Legumi'],
    // VERDURE (per 100g)
    ['Spinaci (100g)', 100, 'g', 23, 2.9, 3.6, 0.4, 'Verdure'],
    ['Broccoli (100g)', 100, 'g', 34, 2.8, 7, 0.4, 'Verdure'],
    ['Asparagi (100g)', 100, 'g', 20, 2.2, 3.9, 0.1, 'Verdure'],
    ['Peperoni rossi (100g)', 100, 'g', 31, 1, 6, 0.3, 'Verdure'],
    ['Carote (100g)', 100, 'g', 41, 0.9, 10, 0.2, 'Verdure'],
    ['Cetrioli (100g)', 100, 'g', 15, 0.7, 3.6, 0.1, 'Verdure'],
    ['Funghi champignon (100g)', 100, 'g', 22, 3.1, 3.3, 0.3, 'Verdure'],
    ['Cipolla (100g)', 100, 'g', 40, 1.1, 9, 0.1, 'Verdure'],
    ['Piselli (100g)', 100, 'g', 81, 5.4, 14, 0.4, 'Verdure'],
    ['Cavolo cappuccio (100g)', 100, 'g', 25, 1.3, 6, 0.1, 'Verdure'],
    ['Fagioli verdi (100g)', 100, 'g', 31, 1.8, 7, 0.1, 'Verdure'],
    ['Patate (100g)', 100, 'g', 77, 2, 17, 0.1, 'Verdure'],
    ['Patate dolci (100g)', 100, 'g', 86, 1.6, 20, 0.1, 'Verdure'],
    // FRUTTA (per 100g)
    ['Banana (100g)', 100, 'g', 89, 1.1, 23, 0.3, 'Frutta'],
    ['Mela (100g)', 100, 'g', 52, 0.3, 14, 0.2, 'Frutta'],
    ['Arancia (100g)', 100, 'g', 47, 0.9, 12, 0.1, 'Frutta'],
    ['Fragole (100g)', 100, 'g', 32, 0.7, 8, 0.3, 'Frutta'],
    ['Avocado (100g)', 100, 'g', 160, 2, 9, 15, 'Frutta'],
    ['Mirtilli (100g)', 100, 'g', 57, 0.7, 14, 0.3, 'Frutta'],
    ['Kiwi (100g)', 100, 'g', 61, 1.1, 15, 0.5, 'Frutta'],
    ['Ananas (100g)', 100, 'g', 50, 0.5, 13, 0.1, 'Frutta'],
    ['Anguria (100g)', 100, 'g', 30, 0.6, 7.6, 0.2, 'Frutta'],
    // FRUTTA SECCA (per 100g)
    ['Mandorle (100g)', 100, 'g', 579, 21, 22, 50, 'Frutta secca'],
    ['Noci (100g)', 100, 'g', 654, 15, 14, 65, 'Frutta secca'],
    ['Arachidi (100g)', 100, 'g', 567, 26, 16, 49, 'Frutta secca'],
    ['Anacardi (100g)', 100, 'g', 553, 18, 30, 44, 'Frutta secca'],
    ['Nocciole (100g)', 100, 'g', 628, 15, 17, 61, 'Frutta secca'],
    ['Semi di chia (100g)', 100, 'g', 486, 17, 42, 31, 'Frutta secca'],
    // CONDIMENTI
    ['Olio EVO (100ml)', 100, 'ml', 884, 0, 0, 100, 'Condimenti'],
    ['Olio EVO (1 cucchiaio 10ml)', 10, 'ml', 88, 0, 0, 10, 'Condimenti'],
    ['Burro (100g)', 100, 'g', 717, 0.5, 0.1, 81, 'Condimenti'],
    ['Miele (100g)', 100, 'g', 304, 0.3, 82, 0, 'Condimenti'],
    ['Maionese (100g)', 100, 'g', 680, 1, 0.6, 75, 'Condimenti'],
    // DOLCI
    ['Cioccolato fondente 70% (100g)', 100, 'g', 598, 8, 46, 42, 'Dolci'],
    // BEVANDE
    ["Succo d'arancia 100% (200ml)", 200, 'ml', 90, 1.6, 22, 0.4, 'Bevande'],
    ['Latte di avena (200ml)', 200, 'ml', 90, 1.4, 15, 2, 'Bevande'],
    ['Latte di soia (200ml)', 200, 'ml', 76, 6, 4.8, 2.8, 'Bevande'],
    // SUPPLEMENTI
    ['Whey protein (1 scoop 30g)', 30, 'g', 120, 24, 3, 1.5, 'Supplementi'],
    ['Creatina monoidrato (5g)', 5, 'g', 0, 0, 0, 0, 'Supplementi'],
    ['Albumina in polvere (30g)', 30, 'g', 110, 26, 0.5, 0.5, 'Supplementi'],
  ];

  for (const [name, portion, unit, cal, pro, carb, fat, cat] of foods) {
    const exists = await db.getFirstAsync('SELECT id FROM food_database WHERE name = ?', [name]);
    if (!exists) {
      await db.runAsync(
        'INSERT INTO food_database (name, portion, unit, calories, protein_g, carbs_g, fats_g, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, portion, unit, cal, pro, carb, fat, cat]
      );
    }
  }
}

// ─── Training Day Helpers ─────────────────────────────────────────────────────

export async function getProfile(db) {
  return db.getFirstAsync('SELECT * FROM profile WHERE id = 1');
}

export async function updateProfile(db, fields) {
  const keys = Object.keys(fields);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  await db.runAsync(`UPDATE profile SET ${sets} WHERE id = 1`, keys.map(k => fields[k]));
}

export async function getTrainingDayForDate(db, date) {
  const iso = dateStr(date);
  const override = await db.getFirstAsync('SELECT * FROM day_overrides WHERE date = ?', [iso]);
  if (override) {
    if (override.training_day_id === null) return null;
    return db.getFirstAsync('SELECT * FROM training_days WHERE id = ?', [override.training_day_id]);
  }
  const profile = await db.getFirstAsync('SELECT schedule_offset FROM profile WHERE id = 1');
  const offset = profile?.schedule_offset ?? 0;
  const dow = (date.getDay() + 6) % 7;
  const lookupDow = (dow - offset + 7) % 7;
  return db.getFirstAsync('SELECT * FROM training_days WHERE day_of_week = ?', [lookupDow]);
}

export async function skipTrainingDay(db, date) {
  const iso = dateStr(date);
  await db.runAsync('INSERT OR REPLACE INTO day_overrides (date, training_day_id) VALUES (?, NULL)', [iso]);
}

export async function anticipateTrainingDay(db, date) {
  // Cerca il prossimo giorno di allenamento (salta i giorni di riposo)
  for (let i = 1; i <= 6; i++) {
    const next = new Date(date);
    next.setDate(next.getDate() + i);
    const td = await getTrainingDayForDate(db, next);
    if (td && !td.is_rest_day) {
      // Oggi diventa il giorno di allenamento trovato
      await db.runAsync('INSERT OR REPLACE INTO day_overrides (date, training_day_id) VALUES (?, ?)', [dateStr(date), td.id]);
      // Il giorno "rubato" diventa riposo (swap)
      await db.runAsync('INSERT OR REPLACE INTO day_overrides (date, training_day_id) VALUES (?, NULL)', [dateStr(next)]);
      return;
    }
  }
}

export async function resetDayOverride(db, date) {
  await db.runAsync('DELETE FROM day_overrides WHERE date = ?', [dateStr(date)]);
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

export async function getSessionForDate(db, trainingDayId, dateStr) {
  return db.getFirstAsync(
    'SELECT * FROM workout_sessions WHERE date = ? AND training_day_id = ?',
    [dateStr, trainingDayId]
  );
}

export async function getSetsForSession(db, sessionId) {
  return db.getAllAsync(
    'SELECT * FROM workout_sets WHERE session_id = ? ORDER BY exercise_id, set_number',
    [sessionId]
  );
}

export async function getLastSessionSets(db, trainingDayId, currentDate) {
  const lastSession = await db.getFirstAsync(
    `SELECT * FROM workout_sessions WHERE training_day_id = ? AND date < ? AND completed = 1
     ORDER BY date DESC LIMIT 1`,
    [trainingDayId, currentDate]
  );
  if (!lastSession) return [];
  return db.getAllAsync('SELECT * FROM workout_sets WHERE session_id = ?', [lastSession.id]);
}

export async function getExerciseHistory(db, exerciseId, limit = 8) {
  const sessions = await db.getAllAsync(
    `SELECT DISTINCT ws.date, ws.id as session_id
     FROM workout_sessions ws
     JOIN workout_sets wset ON wset.session_id = ws.id
     WHERE wset.exercise_id = ? AND ws.completed = 1
     ORDER BY ws.date DESC LIMIT ?`,
    [exerciseId, limit]
  );
  const result = [];
  for (const s of sessions) {
    const sets = await db.getAllAsync(
      'SELECT * FROM workout_sets WHERE session_id = ? AND exercise_id = ? ORDER BY set_number',
      [s.session_id, exerciseId]
    );
    result.push({ date: s.date, sets });
  }
  return result;
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

// ─── Nutrition ────────────────────────────────────────────────────────────────

export async function getNutritionForDate(db, dateStr) {
  return db.getAllAsync('SELECT * FROM nutrition_log WHERE date = ? ORDER BY id', [dateStr]);
}

export async function addMeal(db, dateStr, mealType, name, calories, protein, carbs, fats) {
  await db.runAsync(
    'INSERT INTO nutrition_log (date, meal_type, name, calories, protein_g, carbs_g, fats_g) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [dateStr, mealType, name, calories, protein, carbs, fats]
  );
}

export async function getRecentFoods(db, limit = 10) {
  return db.getAllAsync(
    `SELECT name, calories, protein_g, carbs_g, fats_g
     FROM nutrition_log
     GROUP BY name
     ORDER BY MAX(id) DESC
     LIMIT ?`,
    [limit]
  );
}

export async function saveToFoodDatabase(db, name, calories, protein, carbs, fats) {
  const existing = await db.getFirstAsync('SELECT id FROM food_database WHERE name = ?', [name]);
  if (existing) return;
  await db.runAsync(
    'INSERT INTO food_database (name, portion, unit, calories, protein_g, carbs_g, fats_g, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, 1, 'porzione', calories, protein, carbs, fats, 'I miei pasti']
  );
}

export async function deleteMeal(db, id) {
  await db.runAsync('DELETE FROM nutrition_log WHERE id = ?', [id]);
}

export async function searchFoods(db, query) {
  if (!query || query.trim().length === 0) {
    return db.getAllAsync('SELECT * FROM food_database ORDER BY category, name LIMIT 50');
  }
  return db.getAllAsync(
    "SELECT * FROM food_database WHERE name LIKE ? ORDER BY name LIMIT 30",
    [`%${query}%`]
  );
}

// ─── Water ────────────────────────────────────────────────────────────────────

export async function getWaterForDate(db, dateStr) {
  const row = await db.getFirstAsync('SELECT glasses FROM water_log WHERE date = ?', [dateStr]);
  return row ? row.glasses : 0;
}

export async function setWaterGlasses(db, dateStr, glasses) {
  const existing = await db.getFirstAsync('SELECT id FROM water_log WHERE date = ?', [dateStr]);
  if (existing) {
    await db.runAsync('UPDATE water_log SET glasses = ? WHERE id = ?', [glasses, existing.id]);
  } else {
    await db.runAsync('INSERT INTO water_log (date, glasses) VALUES (?, ?)', [dateStr, glasses]);
  }
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export async function getWeeklySessions(db, mondayStr, sundayStr) {
  return db.getAllAsync(
    `SELECT ws.*, td.name, td.is_rest_day FROM workout_sessions ws
     JOIN training_days td ON td.id = ws.training_day_id
     WHERE ws.date >= ? AND ws.date <= ?`,
    [mondayStr, sundayStr]
  );
}

export async function getSessionHistory(db, limit = 30) {
  return db.getAllAsync(
    `SELECT ws.*, td.name FROM workout_sessions ws
     JOIN training_days td ON td.id = ws.training_day_id
     WHERE ws.completed = 1 ORDER BY ws.date DESC LIMIT ?`,
    [limit]
  );
}

export async function getNutritionHistory(db, days = 14) {
  return db.getAllAsync(
    `SELECT date, SUM(calories) as total_calories, SUM(protein_g) as total_protein,
            SUM(carbs_g) as total_carbs, SUM(fats_g) as total_fats
     FROM nutrition_log GROUP BY date ORDER BY date DESC LIMIT ?`,
    [days]
  );
}

export async function addWeightLog(db, dateStr, weightKg) {
  const existing = await db.getFirstAsync('SELECT id FROM weight_log WHERE date = ?', [dateStr]);
  if (existing) {
    await db.runAsync('UPDATE weight_log SET weight_kg = ? WHERE id = ?', [weightKg, existing.id]);
  } else {
    await db.runAsync('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)', [dateStr, weightKg]);
  }
}

export async function getExerciseMaxWeightExcluding(db, exerciseId, sessionId) {
  const row = await db.getFirstAsync(
    `SELECT MAX(weight_kg) as max_w FROM workout_sets
     WHERE exercise_id = ? AND session_id != ? AND weight_kg > 0`,
    [exerciseId, sessionId]
  );
  return row?.max_w ?? 0;
}

export async function getWeightHistory(db, limit = 30) {
  return db.getAllAsync('SELECT * FROM weight_log ORDER BY date DESC LIMIT ?', [limit]);
}

// ─── Utils ───────────────────────────────────────────────────────────────────

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function dateStr(date) {
  return date.toISOString().slice(0, 10);
}
