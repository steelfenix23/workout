// La scheda alimentare, in sola lettura. Niente da registrare o spuntare: il
// tracciamento del cibo era stato tolto dall'app di proposito perché costava
// troppo tempo. Questa è la stessa scheda del documento "Le Calorie Mancanti",
// messa dove si consulta davvero — cioè sul telefono, in cucina.
//
// I totali della giornata NON sono scritti a mano: si calcolano sommando i
// pasti, così non possono divergere dai pasti stessi. Il test li confronta con
// quelli del documento pubblicato.

// ─── Colazione e pancake: uguali tutti i giorni ─────────────────────────────

export const COLAZIONE = {
  label: "Colazione", kcal: 710, prot: 26,
  what: "90 g fiocchi d'avena · 250 ml latte intero · 30 g mandorle · 10 g miele",
  note: "Avena e latte in un barattolo in frigo la sera prima. La mattina aggiungi mandorle e miele.",
  alts: [
    { name: "Piadina con fior di latte e pomodoro", kcal: 690, prot: 27,
      what: "1 piadina (100 g) · 100 g fior di latte · pomodoro a fette con 1 cucchiaio d'olio · un caffè se vuoi, senza latte. Martedì e venerdì hanno già mozzarella più tardi: quei giorni meglio l'avena" },
  ],
};

export const PANCAKE = {
  label: "Merenda mattina", kcal: 565, prot: 36,
  what: "Pancake: 90 g farina di riso · 150 g albume · 75 g yogurt greco · 1 uovo intero · 15 g miele sopra",
};

// ─── La merenda del pomeriggio ───────────────────────────────────────────────
// Prima c'era affettato tutti i giorni: circa 490 g di salumi a settimana contro
// i 50 g occasionali delle linee guida italiane. Ora la proteina è la carne
// AVANZATA dalla cena della sera prima — carne fresca, non lavorata — e il
// salume resta una volta a settimana.

const PANE_MERENDA = "80 g pane";
const NOTA_MERENDA = "Un'ora e mezza prima di allenarti: è il tuo pre-allenamento.";

const merenda = (proteina, kcal, prot, extra = " · 10 g mandorle") => ({
  label: "Merenda", kcal, prot, note: NOTA_MERENDA,
  what: `${PANE_MERENDA} · ${proteina}${extra}`,
});

const M = {
  carne: (quale) => merenda(`70 g di ${quale}`, 395, 32),
  uova: merenda("2 uova sode", 420, 22),
  mozzarella: merenda("80 g di fior di latte", 422, 22, ""),
  salume: merenda("70 g di affettato — il salume della settimana", 385, 32),
};

// ─── Pranzi ──────────────────────────────────────────────────────────────────

const PANE_PRANZO = "40 g pane · verdure";

const P = {
  ragu:      { name: "Pasta al ragù", kcal: 955, prot: 46,
               what: `100 g pasta · 150 g macinato · passata · 2 cucchiai olio · ${PANE_PRANZO}` },
  carbonara: { name: "Carbonara", kcal: 915, prot: 40,
               what: `100 g pasta · 2 uova · 60 g pancetta · ${PANE_PRANZO} (niente olio in più). La pancetta è un salume: conta come quello della settimana` },
  pomodoro:  { name: "Pasta al pomodoro con 3 uova", kcal: 935, prot: 35,
               what: `100 g pasta · passata · 2 cucchiai olio · 3 uova · ${PANE_PRANZO}` },
  zucchine:  { name: "Pasta con zucchine o melanzane e 3 uova", kcal: 935, prot: 35,
               what: `100 g pasta · verdure nel condimento · 2 cucchiai olio · 3 uova · 40 g pane` },
  insalata:  { name: "Insalata di riso col tonno", kcal: 935, prot: 44,
               what: `100 g riso · 160 g tonno sgocciolato (2 scatolette) · 2 cucchiai olio · verdure e mais · 40 g pane` },
  fagioli:   { name: "Pasta e fagioli", kcal: 875, prot: 30,
               what: `80 g pasta · 250 g fagioli cotti (1 scatola) · 2 cucchiai olio · ${PANE_PRANZO}` },
  lenticchie:{ name: "Riso e lenticchie", kcal: 915, prot: 32,
               what: `80 g riso · 250 g lenticchie cotte (1 scatola) · 2 cucchiai olio · ${PANE_PRANZO}` },
  zucca:     { name: "Pasta o riso con la zucca e 3 uova", kcal: 915, prot: 35,
               what: `100 g pasta o riso · 200 g zucca · 2 cucchiai olio · 3 uova · 40 g pane` },
  pesto:     { name: "Pasta al pesto con 3 uova", kcal: 950, prot: 39,
               what: `100 g pasta · 30 g pesto · 3 uova · 1 cucchiaio olio · ${PANE_PRANZO}` },
  aglio:     { name: "Aglio, olio e peperoncino con 3 uova", kcal: 960, prot: 35,
               what: `90 g pasta · 3 cucchiai olio · 3 uova · ${PANE_PRANZO}` },
  forno:     { name: "Pasta al forno", kcal: 1010, prot: 45,
               what: `100 g pasta · 100 g mozzarella · 2 uova sode · passata · 1 cucchiaio olio · ${PANE_PRANZO}` },
};

// ─── Cene ────────────────────────────────────────────────────────────────────

const AVANZO = "Cuocine 100 g in più: 70 g cotti sono la merenda di domani.";

const CARNE = (nome, avanzo) => ({ name: nome, kcal: 645, prot: 45,
  what: "180 g · 60 g pane (oppure 250 g di patate lesse) · verdure · 2 cucchiai olio",
  ...(avanzo ? { note: AVANZO } : {}) });

const C = {
  pesce:  { name: "Pesce", kcal: 645, prot: 45,
            what: "200 g · 60 g pane (oppure 250 g di patate lesse) · verdure · 2 cucchiai olio",
            note: "Pesce spada al massimo una volta ogni 2-3 settimane. Le altre: salmone, merluzzo, orata, branzino." },
  bufala: { name: "Mozzarella di bufala", kcal: 735, prot: 25,
            what: "125 g (una mozzarella) · 60 g pane · insalata e pomodorini · 2 cucchiai olio" },
  pizza:  { name: "Pizza", kcal: 880, prot: 35,
            what: "Una pizza intera.",
            note: "Una margherita va benissimo. Il crudo sopra tienilo come eccezione: è un salume." },
};

// ─── La settimana: indice 0 = lunedì, come dow() in logic.js ────────────────
// La merenda di ogni giorno usa l'avanzo della cena del giorno PRIMA. Dove la
// sera prima non c'è carne (bufala, pesce, pizza) la merenda cambia fonte.

export const WEEK = [
  { day: "Lunedì",    pranzo: P.ragu,       alt: P.carbonara,  merenda: M.carne("carne avanzata da domenica"), cena: CARNE("Pollo", true) },
  { day: "Martedì",   pranzo: P.pomodoro,   alt: P.zucchine,   merenda: M.carne("pollo avanzato da ieri"),     cena: C.bufala },
  { day: "Mercoledì", pranzo: P.insalata,   alt: P.ragu,       merenda: M.uova,                                 cena: CARNE("Tacchino", true) },
  { day: "Giovedì",   pranzo: P.fagioli,    alt: P.lenticchie, merenda: M.carne("tacchino avanzato da ieri"),  cena: C.pesce },
  { day: "Venerdì",   pranzo: P.lenticchie, alt: P.zucca,      merenda: M.mozzarella,                           cena: CARNE("Manzo", true) },
  { day: "Sabato",    pranzo: P.pesto,      alt: P.aglio,      merenda: M.carne("manzo avanzato da ieri"),     cena: C.pizza },
  { day: "Domenica",  pranzo: P.forno,      alt: P.carbonara,  merenda: M.salume,                               cena: CARNE("Maiale o carne a scelta", true) },
];

export function dayTotals(d) {
  return {
    kcal: COLAZIONE.kcal + PANCAKE.kcal + d.pranzo.kcal + d.merenda.kcal + d.cena.kcal,
    prot: COLAZIONE.prot + PANCAKE.prot + d.pranzo.prot + d.merenda.prot + d.cena.prot,
  };
}

// ─── Scambi della merenda ────────────────────────────────────────────────────

export const SWAP_CARBO = [
  ["Pane", "80 g"], ["Gallette di riso", "55 g"], ["Crackers", "50 g"],
  ["Piadina", "65 g"], ["Fiocchi d'avena", "55 g"], ["Patate lesse", "250 g"],
];

export const SWAP_PROT = [
  ["Carne avanzata dalla cena", "70 g"], ["Uova sode", "2"], ["Fior di latte", "80 g"],
  ["Barretta proteica", "1"], ["Proteine in polvere, se le hai", "1 misurino"],
  ["Affettato, una volta a settimana", "70 g"],
];

export const COMBO = [
  { where: "Casa", name: "Frullato d'avena", what: "250 ml latte intero · 30 g avena · 10 g miele (+ proteine in polvere se le hai), frullato" },
  { where: "Casa", name: "Piadina e pollo", what: "65 g piadina · 70 g pollo avanzato · 10 g mandorle" },
  { where: "Casa", name: "Uova sode e gallette", what: "2 uova · 40 g gallette · 10 g mandorle" },
  { where: "Ufficio", name: "Barretta e frutta secca", what: "1 barretta (almeno 20 g proteine, niente versioni light) · 30 g mandorle" },
];

// ─── Le regole ───────────────────────────────────────────────────────────────

export const RULES = [
  { title: "Salumi al massimo una volta a settimana", body: "Prosciutto, bresaola, speck, fesa di tacchino e pancetta sono carni lavorate. Le linee guida italiane dicono 50 g, occasionalmente. Per questo la merenda si fa con la carne avanzata dalla cena." },
  { title: "Le patate sostituiscono il pane, non le verdure", body: "250 g di patate lesse valgono 60 g di pane: la sera che le fai, salti il pane." },
  { title: "Insalata, rucola, pomodorini: a volontà", body: "Sono verdure vere. Il cucchiaio d'olio sopra è già contato." },
  { title: "Una frittata di 4 uova sostituisce la carne", body: "In qualunque cena. Stesse calorie, un po' meno proteine: va bene." },
  { title: "Il ragù fallo con l'hamburger", body: "150 g di macinato nel sugo sono 30 g di proteine che non si vedono. Il macinato è carne fresca, non un salume." },
  { title: "Latte intero, mai scremato", body: "Sono calorie in più senza differenza di gusto. Nel tuo caso lo scremato è un danno." },
  { title: "La pizza del sabato non è uno sgarro", body: "Una volta a settimana, ti avvicina all'obiettivo invece di allontanarti." },
];

export const OFFICE = [
  "Primo più secondo più il pane del cestino. Mai solo il primo: al ristorante è metà porzione.",
  "Pizza intera: una margherita va bene.",
  "La merenda portala da casa: pane e carne avanzata in un contenitore, più le mandorle.",
  "Colazione e cena restano quelle di casa.",
];
