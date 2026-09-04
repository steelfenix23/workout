// Il programma "Forza e Fiato" — 12 settimane, 4 sedute in rotazione.
// Tutti i carichi sono per manubrio salvo diversa indicazione.

const yt = (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);

// ─── Esercizi ────────────────────────────────────────────────────────────────
// bodyweight: il campo carico diventa opzionale (o zavorra)
// unilateral: le ripetizioni indicate sono PER GAMBA
// timed:      si registrano secondi al posto delle ripetizioni

export const EXERCISES = [
  {
    id: "panca_piana", name: "Panca Piana con Manubri", muscle: "Pettorali", equipment: "Manubri + panca",
    primary: "Pettorali", secondary: "Tricipiti, deltoide anteriore", entryWeight: 17.5,
    steps: [
      "Sdraiati con un manubrio per mano all'altezza del petto, gomiti a circa 45° rispetto al busto.",
      "Spingi i manubri verso l'alto fino a quasi distendere le braccia, avvicinandoli leggermente in cima.",
      "Scendi controllato in 2-3 secondi sentendo lo stretch sul petto.",
      "Tieni le scapole addotte e i piedi ben piantati a terra.",
    ],
    mistakes: ["Gomiti spalancati a 90°: stress inutile sulle spalle.", "Rimbalzare i manubri in basso senza controllo.", "Inarcare troppo la schiena."],
    tempo: "2s discesa · 1s spinta · inspira scendendo, espira spingendo",
    video: yt("panca piana con manubri tecnica esecuzione"),
  },
  {
    id: "trazioni", name: "Trazioni alla Sbarra", muscle: "Gran dorsale", equipment: "Sbarra", bodyweight: true,
    primary: "Gran dorsale", secondary: "Bicipiti, romboidi, trapezio", entryWeight: 0,
    steps: [
      "Impugna la sbarra poco più larga delle spalle, palmi in avanti.",
      "Parti da braccia distese e attiva le scapole tirandole verso il basso.",
      "Tira il petto verso la sbarra portando il mento sopra di essa.",
      "Scendi controllato in 2-3 secondi fino a distendere le braccia.",
    ],
    mistakes: ["Usare slancio o kipping.", "Non completare la distensione in basso.", "Tirare solo con le braccia senza il dorso."],
    tempo: "Tirata esplosiva · 2-3s di discesa",
    note: "Serie corte da fresco, MAI a cedimento: è così che si sbloccano le ripetizioni.",
    video: yt("trazioni alla sbarra tecnica corretta principianti"),
  },
  {
    id: "military_press", name: "Military Press con Manubri", muscle: "Deltoidi", equipment: "Manubri",
    primary: "Deltoidi (anteriore e laterale)", secondary: "Tricipiti, trapezio, core", entryWeight: 10,
    steps: [
      "In piedi, manubri all'altezza delle orecchie, gomiti a circa 90°.",
      "Contrai glutei e addome per non inarcare la schiena.",
      "Spingi verso l'alto fino a quasi far toccare i manubri sopra la testa.",
      "Scendi controllato fino alle orecchie senza rimbalzare.",
    ],
    mistakes: ["Inarcare la schiena spingendo: attiva il core.", "Scendere troppo poco.", "Allargare troppo i gomiti."],
    tempo: "1s salita · 2s discesa",
    note: "In piedi, non seduto: fa lavorare anche il core.",
    video: yt("military press manubri in piedi tecnica"),
  },
  {
    id: "rematore", name: "Rematore con Manubri", muscle: "Dorsali", equipment: "Manubri",
    primary: "Dorsali (parte medio-alta)", secondary: "Bicipiti, deltoide posteriore, trapezio", entryWeight: 11.5,
    steps: [
      "Busto inclinato ~45°, schiena neutra, ginocchia morbide.",
      "Braccia tese verso il basso con i manubri.",
      "Tira i manubri verso i fianchi stringendo le scapole.",
      "Abbassa controllato senza ruotare il busto.",
    ],
    mistakes: ["Schiena curva.", "Usare lo slancio del busto.", "Tirare verso le spalle invece che ai fianchi."],
    tempo: "1s tirata · 2s discesa",
    video: yt("rematore con manubri busto inclinato tecnica"),
  },
  {
    id: "alzate_laterali", name: "Alzate Laterali", muscle: "Deltoide laterale", equipment: "Manubri",
    primary: "Deltoide laterale", secondary: "Trapezio", entryWeight: 5.5,
    steps: [
      "In piedi, manubri ai fianchi, gomiti leggermente piegati.",
      "Alza le braccia di lato fino all'altezza delle spalle.",
      "Guida il movimento con i gomiti, mignolo leggermente più alto.",
      "Scendi lento resistendo alla gravità.",
    ],
    mistakes: ["Usare slancio e troppo peso.", "Salire sopra le spalle reclutando il trapezio.", "Movimento troppo veloce."],
    tempo: "1s salita · 2-3s discesa · carico leggero",
    video: yt("alzate laterali manubri tecnica corretta"),
  },
  {
    id: "panca_inclinata", name: "Panca Inclinata 30°", muscle: "Petto alto", equipment: "Manubri + panca",
    primary: "Parte alta dei pettorali", secondary: "Deltoide anteriore, tricipiti", entryWeight: 13,
    steps: [
      "Imposta l'inclinazione a circa 30°, non di più.",
      "Parti con i manubri all'altezza delle spalle, gomiti sotto i polsi.",
      "Spingi verso l'alto e leggermente verso l'interno.",
      "Scendi lento controllando lo stretch.",
    ],
    mistakes: ["Inclinazione oltre i 45°: il lavoro passa alle spalle.", "Aprire troppo i gomiti."],
    tempo: "2s discesa · 1s spinta",
    video: yt("panca inclinata 30 gradi manubri tecnica"),
  },
  {
    id: "dips", name: "Dips alle Parallele", muscle: "Tricipiti e petto basso", equipment: "Parallele", bodyweight: true,
    primary: "Tricipiti, parte bassa dei pettorali", secondary: "Deltoide anteriore", entryWeight: 0,
    steps: [
      "Sali sulle parallele con braccia tese, busto leggermente inclinato in avanti.",
      "Scendi piegando i gomiti finché le spalle vanno sotto il livello dei gomiti.",
      "Spingi verso l'alto fino a quasi distendere le braccia.",
      "Per enfasi sui tricipiti tieni il busto più verticale e i gomiti vicini.",
    ],
    mistakes: ["Scendere troppo poco: mezza ripetizione non conta.", "Gomiti che si aprono troppo.", "Spalle in su: tienile basse, lontane dalle orecchie."],
    tempo: "2s discesa · 1s spinta",
    note: "Fermarsi 2-3 ripetizioni PRIMA del cedimento. Il crollo da 12 a 5 era fatica, non mancanza di forza.",
    video: yt("dips alle parallele tecnica corretta"),
  },
  {
    id: "alzate_posteriori", name: "Alzate Posteriori", muscle: "Deltoide posteriore", equipment: "Manubri",
    primary: "Deltoide posteriore", secondary: "Trapezio medio, romboidi", entryWeight: 5.5,
    steps: [
      "Busto inclinato in avanti a ~45°, o seduto sul bordo della panca, manubri sotto il petto.",
      "Braccia leggermente piegate e fisse.",
      "Apri le braccia di lato portando i manubri all'altezza delle spalle, stringendo le scapole.",
      "Scendi lento controllando il movimento.",
    ],
    mistakes: ["Usare troppo peso e slancio.", "Tirare con le braccia invece di aprire.", "Scrollare le spalle verso le orecchie."],
    tempo: "1s apertura · 2s ritorno · carico leggero",
    note: "Compensa tutte le spinte. Era assente dalla vecchia scheda.",
    video: yt("alzate posteriori manubri deltoide posteriore tecnica"),
  },
  {
    id: "curl_martello", name: "Curl a Martello", muscle: "Bicipiti e brachiale", equipment: "Manubri",
    primary: "Bicipiti, brachiale", secondary: "Brachioradiale (avambraccio)", entryWeight: 8.5,
    steps: [
      "Presa neutra: pollice verso l'alto per tutto il movimento.",
      "Gomiti fissi ai fianchi, solleva senza ruotare il polso.",
      "Contrai in cima.",
      "Scendi controllato fino a distendere.",
    ],
    mistakes: ["Oscillare il busto.", "Gomiti che si spostano in avanti."],
    tempo: "1s salita · 2s discesa",
    video: yt("curl a martello manubri tecnica"),
  },
  {
    id: "front_squat", name: "Front Squat con Manubri", muscle: "Quadricipiti e glutei", equipment: "2 manubri",
    primary: "Quadricipiti, glutei", secondary: "Core, adduttori", entryWeight: 12,
    steps: [
      "Porta due manubri sulle spalle, presa neutra, gomiti alti e petto in fuori.",
      "Piedi a larghezza spalle, punte leggermente in fuori.",
      "Scendi spingendo i fianchi indietro e in basso tenendo il busto eretto.",
      "Almeno fino a cosce parallele, poi risali spingendo con i talloni.",
    ],
    mistakes: ["Gomiti che cadono in basso: il busto ti segue in avanti.", "Ginocchia che cedono verso l'interno.", "Talloni che si staccano da terra."],
    tempo: "2s discesa · 1s risalita",
    note: "Sostituisce il goblet squat: due manubri arrivano a 64 kg totali contro i 32 di uno solo.",
    video: yt("dumbbell front squat due manubri tecnica"),
  },
  {
    id: "stacco_rumeno", name: "Stacco Rumeno con Manubri", muscle: "Femorali e glutei", equipment: "Manubri",
    primary: "Femorali, glutei", secondary: "Lombari (erettori spinali), trapezio", entryWeight: 11.5,
    steps: [
      "In piedi, un manubrio per mano davanti alle cosce, piedi a larghezza anche.",
      "Spingi i fianchi indietro con schiena neutra e ginocchia appena flesse e fisse.",
      "Fai scorrere i manubri lungo le gambe fino a sentire lo stretch sui femorali, circa a metà stinco.",
      "Risali spingendo i fianchi in avanti e contraendo i glutei in cima.",
    ],
    mistakes: ["Curvare la schiena: deve restare neutra.", "Piegare le ginocchia come in uno squat.", "Allontanare i manubri dalle gambe."],
    tempo: "2-3s discesa · 1s risalita · è un movimento d'anca, non di ginocchio",
    note: "Il buco più grosso della vecchia scheda: femorali e glutei erano completamente assenti.",
    video: yt("stacco rumeno con manubri tecnica"),
  },
  {
    id: "affondi_inversi", name: "Affondi Inversi con Manubri", muscle: "Quadricipiti e glutei", equipment: "Manubri", unilateral: true,
    primary: "Quadricipiti, glutei", secondary: "Femorali, core", entryWeight: 7,
    steps: [
      "Manubri ai fianchi, in piedi, core attivo.",
      "Fai un passo lungo all'indietro.",
      "Abbassa il ginocchio posteriore quasi a terra tenendo il busto eretto.",
      "Spingi con il tallone anteriore per tornare in piedi, poi alterna.",
    ],
    mistakes: ["Passo troppo corto: sovraccarica il ginocchio.", "Busto troppo in avanti.", "Perdere l'equilibrio: rallenta e attiva il core."],
    tempo: "Controllato, 1-2s per fase",
    note: "Inversi e non in avanti: molto più gentili con il ginocchio.",
    video: yt("affondi inversi con manubri tecnica reverse lunge"),
  },
  {
    id: "calf_raise", name: "Calf Raise in Piedi", muscle: "Polpacci", equipment: "Manubri + gradino",
    primary: "Polpacci (gastrocnemio e soleo)", secondary: "—", entryWeight: 14.5,
    steps: [
      "In piedi sul bordo di un gradino, talloni nel vuoto, un manubrio per mano.",
      "Sollevati sulle punte il più in alto possibile.",
      "Contrai 1 secondo in cima.",
      "Scendi lento sentendo lo stretch sotto il livello del gradino.",
    ],
    mistakes: ["Mezzo range di movimento.", "Rimbalzare velocemente.", "Non fermarsi in cima."],
    tempo: "1s salita · pausa · 2s discesa",
    video: yt("calf raise in piedi con manubri tecnica"),
  },
  {
    id: "bulgarian", name: "Bulgarian Split Squat", muscle: "Quadricipiti e glutei", equipment: "Manubri + panca", unilateral: true,
    primary: "Quadricipiti, glutei", secondary: "Femorali, adduttori, core", entryWeight: 7,
    steps: [
      "Appoggia il collo del piede posteriore sulla panca dietro di te.",
      "Un manubrio per mano ai fianchi, piede anteriore avanzato alla distanza giusta.",
      "Scendi piegando la gamba anteriore fino a coscia parallela, busto leggermente in avanti.",
      "Spingi con il tallone anteriore per risalire. Completa le reps, poi cambia gamba.",
    ],
    mistakes: ["Passo troppo corto: sovraccarica il ginocchio.", "Spingere con la gamba posteriore.", "Perdere l'equilibrio: tieni il core attivo."],
    tempo: "2s discesa · 1s risalita",
    note: "Carichi enormi sulla gamba con pesi ridicoli in mano. Perfetto per casa.",
    video: yt("bulgarian split squat con manubri tecnica"),
  },
  {
    id: "nordic_curl", name: "Nordic Curl", muscle: "Femorali", equipment: "Piedi bloccati sotto il tapis", bodyweight: true,
    primary: "Femorali (lavoro eccentrico)", secondary: "Glutei, core", entryWeight: 0,
    steps: [
      "Tapis roulant SPENTO e staccato dalla corrente. Talloni sotto una parte fissa del telaio, mai sotto il nastro.",
      "Ginocchia su un tappetino o un cuscino, altrimenti smetti per le rotule e non per i femorali.",
      "Corpo dritto come una tavola dalle ginocchia alla testa, senza piegarti in avanti dall'anca.",
      "Scendi il più lentamente che riesci. Quando non tieni più, ti pari con le mani a terra e ti spingi su con le braccia.",
    ],
    mistakes: [
      "Piegarsi in avanti dall'anca: annulla l'esercizio.",
      "Scendere veloce: la discesa lenta È l'esercizio, la risalita non conta.",
      "Farne troppe la prima volta: i dolori durano 3-4 giorni.",
    ],
    tempo: "Discesa più lenta possibile · risalita aiutandosi con le braccia",
    note: "LA PRIMA VOLTA: una serie da tre ripetizioni. Una. Poi 2×3 per due settimane, 2×5, e 3×6-8 dalla quinta.",
    video: yt("nordic hamstring curl tecnica progressione principianti"),
  },
  {
    id: "hip_thrust", name: "Hip Thrust a Terra", muscle: "Glutei", equipment: "Manubrio",
    primary: "Glutei", secondary: "Femorali, core", entryWeight: 20, singleWeight: true,
    steps: [
      "Sdraiato a terra, ginocchia piegate e piedi piatti vicino ai glutei.",
      "Appoggia un manubrio sull'anca tenendolo con entrambe le mani.",
      "Spingi con i talloni sollevando il bacino fino ad allineare spalle, anche e ginocchia.",
      "Contrai i glutei 1 secondo in cima, poi scendi senza appoggiare del tutto.",
    ],
    mistakes: ["Iperestendere la schiena in cima: il movimento è dei glutei.", "Spingere con le punte invece che con i talloni.", "Range troppo corto."],
    tempo: "1s salita · pausa in cima · 2s discesa",
    video: yt("hip thrust a terra con manubrio tecnica"),
  },
  {
    id: "calf_unilaterale", name: "Calf Raise su Una Gamba", muscle: "Polpacci", equipment: "Gradino", bodyweight: true, unilateral: true,
    primary: "Polpacci", secondary: "Stabilizzatori della caviglia", entryWeight: 0,
    steps: [
      "In piedi su una gamba sul bordo di un gradino, tallone nel vuoto.",
      "Appoggiati con una mano a un muro per l'equilibrio.",
      "Sollevati sulla punta il più in alto possibile.",
      "Scendi lento fino allo stretch completo. Poi cambia gamba.",
    ],
    mistakes: ["Rimbalzare.", "Usare il muro per spingere invece che per l'equilibrio."],
    tempo: "1s salita · 2s discesa",
    note: "Scopre e corregge gli squilibri fra destra e sinistra.",
    video: yt("calf raise su una gamba tecnica"),
  },
  {
    id: "plank", name: "Plank", muscle: "Core", equipment: "Nessuno", bodyweight: true, timed: true,
    primary: "Core (trasverso e retto addominale)", secondary: "Spalle, glutei", entryWeight: 0,
    steps: [
      "Appoggio su avambracci e punte dei piedi.",
      "Corpo in linea retta dalla testa ai talloni.",
      "Contrai addome e glutei, sguardo a terra.",
      "Respira normalmente mantenendo la posizione.",
    ],
    mistakes: ["Far cedere i fianchi verso il basso.", "Alzare troppo il bacino.", "Trattenere il respiro."],
    tempo: "Tenuta isometrica per i secondi indicati",
    video: yt("plank esecuzione corretta"),
  },
  {
    id: "dead_bug", name: "Dead Bug", muscle: "Core", equipment: "Nessuno", bodyweight: true,
    primary: "Core profondo (trasverso)", secondary: "Flessori dell'anca", entryWeight: 0,
    steps: [
      "Sdraiato sulla schiena, braccia tese verso il soffitto, ginocchia a 90°.",
      "Schiaccia la parte bassa della schiena contro il pavimento: non deve mai staccarsi.",
      "Allunga contemporaneamente il braccio destro dietro la testa e la gamba sinistra in avanti.",
      "Torna al centro e alterna. Una ripetizione = un lato.",
    ],
    mistakes: ["Staccare la schiena da terra: è l'unico errore che conta.", "Andare veloce.", "Trattenere il respiro."],
    tempo: "Lento e controllato · espira allungando",
    video: yt("dead bug esercizio core tecnica"),
  },
];

export const EX = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

// ─── Le quattro sedute ───────────────────────────────────────────────────────
// legs: true      → seduta con gambe pesanti (regola: mai il giorno prima della partita)
// nordic: true    → contiene il Nordic curl (regola: almeno 3 giorni prima della partita)

export const DAYS = [
  {
    id: "upper_a", name: "Upper A", subtitle: "Spinta", minutes: 40,
    items: [
      { exId: "panca_piana", sets: 4, repsMin: 6, repsMax: 10 },
      { exId: "trazioni", sets: 5, repsMin: 3, repsMax: 3 },
      { exId: "military_press", sets: 3, repsMin: 8, repsMax: 12 },
      { exId: "rematore", sets: 3, repsMin: 8, repsMax: 12 },
      { exId: "alzate_laterali", sets: 2, repsMin: 12, repsMax: 20 },
    ],
  },
  {
    id: "lower_a", name: "Lower A", subtitle: "Pesante", minutes: 40, legs: true,
    items: [
      { exId: "front_squat", sets: 4, repsMin: 6, repsMax: 10 },
      { exId: "stacco_rumeno", sets: 4, repsMin: 8, repsMax: 12 },
      { exId: "affondi_inversi", sets: 3, repsMin: 8, repsMax: 10 },
      { exId: "calf_raise", sets: 3, repsMin: 12, repsMax: 20 },
    ],
  },
  {
    id: "upper_b", name: "Upper B", subtitle: "Tirata", minutes: 40,
    items: [
      { exId: "rematore", sets: 4, repsMin: 6, repsMax: 10, weightBump: 1.5 },
      { exId: "panca_inclinata", sets: 3, repsMin: 8, repsMax: 12 },
      { exId: "dips", sets: 4, repsMin: 6, repsMax: 6 },
      { exId: "alzate_posteriori", sets: 3, repsMin: 15, repsMax: 20 },
      { exId: "curl_martello", sets: 2, repsMin: 10, repsMax: 15 },
    ],
  },
  {
    id: "lower_b", name: "Lower B", subtitle: "Nordic e unilaterale", minutes: 30, legs: true, nordic: true,
    items: [
      { exId: "bulgarian", sets: 3, repsMin: 8, repsMax: 12 },
      { exId: "nordic_curl", sets: 2, repsMin: 3, repsMax: 3 },
      { exId: "hip_thrust", sets: 3, repsMin: 12, repsMax: 15 },
      { exId: "calf_unilaterale", sets: 3, repsMin: 12, repsMax: 15 },
      { exId: "plank", sets: 3, repsMin: 30, repsMax: 60 },
      { exId: "dead_bug", sets: 3, repsMin: 8, repsMax: 12 },
    ],
  },
];

export const DAY = Object.fromEntries(DAYS.map((d) => [d.id, d]));
export const ROTATION = ["upper_a", "lower_a", "upper_b", "lower_b"];

// ─── Tipi di corsa ───────────────────────────────────────────────────────────

export const RUN_TYPES = [
  { id: "salita", label: "Camminata in salita", short: "Salita",
    hint: "Costruisce il motore senza affaticare le gambe. Puoi metterla ovunque, anche il giorno dopo lo squat." },
  { id: "facile", label: "Corsa facile", short: "Facile",
    hint: "Devi riuscire a dire una frase intera senza spezzare il fiato. Se non ci riesci, stai andando troppo forte." },
  { id: "lunga", label: "Corsa lunga lenta", short: "Lunga",
    hint: "La seduta che sposta davvero l'ago. Cresce al massimo del 10% a settimana." },
  { id: "intervalli", label: "Intervalli", short: "Intervalli",
    hint: "Recupero camminando 90 secondi fra una ripetuta e l'altra. È il pezzo che si trasferisce al calcetto." },
];

/**
 * Velocità e pendenza da usare QUESTA settimana.
 *
 * I valori d'ingresso della prima stesura erano troppo alti: 6 km/h all'8% di
 * pendenza sono un lavoro vigoroso, non la fascia aerobica di chi riparte da
 * fermo. Adesso si parte basso e si sale — la pendenza di un punto ogni due
 * settimane, la corsa continua solo dopo un mese di alternato.
 */
export function runGuidance(type, week) {
  const w = Math.min(12, Math.max(1, week));

  if (type === "salita") {
    const incline = Math.min(10, 4 + Math.floor((w - 1) / 2));
    return {
      speed: "5-5,5 km/h", incline: `${incline}%`,
      note: `Pendenza ${incline}% questa settimana, poi sale di un punto ogni due settimane. Se a metà seduta non riesci più a parlare, scendi di due punti: deve essere sostenibile a lungo, non dura.`,
    };
  }

  if (type === "facile") {
    if (w <= 4) return {
      speed: "2' a 7 km/h + 2' a 5 km/h", incline: "1%",
      note: "Alterna due minuti di corsa e due di camminata fino a completare i minuti previsti. Correre di fila viene dopo: adesso il motore si costruisce così.",
    };
    return {
      speed: "7-7,5 km/h", incline: "1%",
      note: "Ora continua. Il test è sempre lo stesso: devi riuscire a dire una frase intera senza spezzare il fiato.",
    };
  }

  if (type === "lunga") {
    if (w <= 6) return {
      speed: "3' a 7 km/h + 2' a 5 km/h", incline: "1%",
      note: "Alterna tre minuti di corsa e due di camminata. Qui conta la durata totale, non correre senza fermarsi.",
    };
    return {
      speed: "7-8 km/h", incline: "1%",
      note: "Continua e lenta. È la seduta che sposta davvero l'ago.",
    };
  }

  return {
    speed: "10-11 km/h", incline: "1%",
    note: "6-8 volte 400 metri, camminando 90 secondi fra una e l'altra. Se l'ultima ripetuta è molto più lenta della prima, hai iniziato troppo forte.",
  };
}

export const RUN_TYPE = Object.fromEntries(RUN_TYPES.map((r) => [r.id, r]));

// ─── Le 12 settimane ─────────────────────────────────────────────────────────
// setsCap:    tetto alle serie per esercizio
// loadFactor: moltiplicatore sui carichi d'ingresso

export const PHASES = [
  { from: 1,  to: 2,  name: "Riadattamento",  setsCap: 2, loadFactor: 0.7,  sessions: 3,
    rule: "Zero cedimento, zero eroismi. Devi finire ogni seduta pensando \"potevo fare di più\"." },
  { from: 3,  to: 4,  name: "Costruzione",    setsCap: 3, loadFactor: 0.85, sessions: 4,
    rule: "Struttura piena. La tecnica prima del carico." },
  { from: 5,  to: 8,  name: "Progressione",   setsCap: 9, loadFactor: 1,    sessions: 4,
    rule: "Doppia progressione attiva su tutto. È qui che si mette massa." },
  { from: 9,  to: 9,  name: "Scarico",        setsCap: 2, loadFactor: 1,    sessions: 3,
    rule: "Settimana leggera programmata, presa prima che la chieda il corpo." },
  { from: 10, to: 12, name: "Consolidamento", setsCap: 9, loadFactor: 1,    sessions: 4,
    rule: "Si chiude puntando ai 5 km continui e ai record sui fondamentali." },
];

export function phaseForWeek(week) {
  const w = Math.max(1, week);
  return PHASES.find((p) => w >= p.from && w <= p.to) || PHASES[PHASES.length - 1];
}

// ─── Il piano di corsa, settimana per settimana ──────────────────────────────
// La corsa lunga cresce di circa il 10% a settimana: è il limite oltre il quale
// ci si infortuna. La settimana 9 è di scarico: solo camminate.

export const RUN_PLAN = {
  1:  [{ type: "salita", minutes: 25 }, { type: "facile", minutes: 20 }],
  2:  [{ type: "salita", minutes: 25 }, { type: "facile", minutes: 25 }],
  3:  [{ type: "salita", minutes: 25 }, { type: "facile", minutes: 15 }, { type: "lunga", minutes: 20 }],
  4:  [{ type: "salita", minutes: 25 }, { type: "facile", minutes: 18 }, { type: "lunga", minutes: 22 }],
  5:  [{ type: "salita", minutes: 26 }, { type: "intervalli", minutes: 25 }, { type: "lunga", minutes: 24 }],
  6:  [{ type: "salita", minutes: 29 }, { type: "intervalli", minutes: 25 }, { type: "lunga", minutes: 26 }],
  7:  [{ type: "salita", minutes: 36 }, { type: "intervalli", minutes: 25 }, { type: "lunga", minutes: 29 }],
  8:  [{ type: "salita", minutes: 38 }, { type: "intervalli", minutes: 25 }, { type: "lunga", minutes: 32 }],
  9:  [{ type: "salita", minutes: 25 }, { type: "salita", minutes: 25 }],
  10: [{ type: "salita", minutes: 40 }, { type: "intervalli", minutes: 25 }, { type: "lunga", minutes: 35 }],
  11: [{ type: "salita", minutes: 47 }, { type: "intervalli", minutes: 25 }, { type: "lunga", minutes: 38 }],
  12: [{ type: "salita", minutes: 48 }, { type: "intervalli", minutes: 25 }, { type: "lunga", minutes: 42 }],
};

export function runPlanForWeek(week) {
  const w = Math.min(12, Math.max(1, week));
  return RUN_PLAN[w] || RUN_PLAN[12];
}

/** L'obiettivo settimanale è la somma del piano: i due numeri non possono divergere. */
export function runTargetForWeek(week) {
  return runPlanForWeek(week).reduce((t, r) => t + r.minutes, 0);
}
