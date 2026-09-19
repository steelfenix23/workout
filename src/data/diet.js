// La scheda alimentare, in sola lettura. Niente da registrare o spuntare: il
// tracciamento del cibo era stato tolto dall'app di proposito perché costava
// troppo tempo. Questa è la stessa scheda del documento "Le Calorie Mancanti",
// messa dove si consulta davvero — cioè sul telefono, in cucina.
//
// I totali della giornata NON sono scritti a mano: si calcolano sommando i
// pasti, così non possono divergere dai pasti stessi. Il test li confronta con
// quelli del documento pubblicato.

// ─── I tre pasti uguali tutti i giorni ───────────────────────────────────────

export const COLAZIONE = {
  label: "Colazione", kcal: 710, prot: 26,
  what: "90 g fiocchi d'avena · 250 ml latte intero · 30 g mandorle · 10 g miele",
  note: "Avena e latte in un barattolo in frigo la sera prima. La mattina aggiungi mandorle e miele.",
  alt: "Con le proteine in polvere: 80 g avena, 20 g mandorle e la dose che dà 24 g di proteine.",
};

export const PANCAKE = {
  label: "Merenda mattina", kcal: 565, prot: 36,
  what: "Pancake: 90 g farina di riso · 150 g albume · 75 g yogurt greco · 1 uovo intero · 15 g miele sopra",
};

export const merenda = (affettato) => ({
  label: "Merenda", kcal: 385, prot: 32,
  what: `80 g pane · 70 g ${affettato} · 10 g mandorle`,
  note: "Un'ora e mezza prima di allenarti: è il tuo pre-allenamento.",
});

// ─── Pranzi e cene ───────────────────────────────────────────────────────────

const PANE_PRANZO = "40 g pane · verdure";

const P = {
  ragu:      { name: "Pasta al ragù", kcal: 955, prot: 46,
               what: `100 g pasta · 150 g macinato · passata · 2 cucchiai olio · ${PANE_PRANZO}` },
  carbonara: { name: "Carbonara", kcal: 915, prot: 40,
               what: `100 g pasta · 2 uova · 60 g pancetta · ${PANE_PRANZO} (niente olio in più)` },
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

const CARNE = (nome) => ({ name: nome, kcal: 645, prot: 45,
  what: "180 g · 60 g pane (oppure 250 g di patate lesse) · verdure · 2 cucchiai olio" });

const C = {
  pesce:  { name: "Pesce", kcal: 645, prot: 45,
            what: "200 g · 60 g pane (oppure 250 g di patate lesse) · verdure · 2 cucchiai olio",
            note: "Pesce spada al massimo una volta ogni 2-3 settimane. Le altre: salmone, merluzzo, orata, branzino." },
  bufala: { name: "Mozzarella di bufala", kcal: 735, prot: 25,
            what: "125 g (una mozzarella) · 60 g pane · insalata e pomodorini · 2 cucchiai olio" },
  pizza:  { name: "Pizza", kcal: 880, prot: 35,
            what: "Una pizza intera.",
            note: "Chiedila con prosciutto crudo o bresaola sopra: la margherita da sola ha poche proteine." },
};

// ─── La settimana: indice 0 = lunedì, come dow() in logic.js ────────────────

export const WEEK = [
  { day: "Lunedì",    pranzo: P.ragu,       alt: P.carbonara, cena: CARNE("Pollo"),   affettato: "bresaola" },
  { day: "Martedì",   pranzo: P.pomodoro,   alt: P.zucchine,  cena: C.bufala,         affettato: "prosciutto crudo" },
  { day: "Mercoledì", pranzo: P.insalata,   alt: P.ragu,      cena: CARNE("Tacchino"), affettato: "fesa di tacchino" },
  { day: "Giovedì",   pranzo: P.fagioli,    alt: P.lenticchie, cena: C.pesce,          affettato: "bresaola" },
  { day: "Venerdì",   pranzo: P.lenticchie, alt: P.zucca,     cena: CARNE("Manzo"),   affettato: "prosciutto crudo" },
  { day: "Sabato",    pranzo: P.pesto,      alt: P.aglio,     cena: C.pizza,          affettato: "speck" },
  { day: "Domenica",  pranzo: P.forno,      alt: P.carbonara, cena: CARNE("Maiale o carne a scelta"), affettato: "bresaola" },
];

export function dayTotals(d) {
  const m = merenda(d.affettato);
  return {
    kcal: COLAZIONE.kcal + PANCAKE.kcal + d.pranzo.kcal + m.kcal + d.cena.kcal,
    prot: COLAZIONE.prot + PANCAKE.prot + d.pranzo.prot + m.prot + d.cena.prot,
  };
}

// ─── Scambi della merenda ────────────────────────────────────────────────────

export const SWAP_CARBO = [
  ["Pane", "80 g"], ["Gallette di riso", "55 g"], ["Crackers", "50 g"],
  ["Piadina", "65 g"], ["Fiocchi d'avena", "55 g"], ["Patate lesse", "250 g"],
];

export const SWAP_PROT = [
  ["Affettato magro", "70 g"], ["Proteine in polvere", "1 misurino"], ["Uova sode", "3"],
  ["Fior di latte", "100 g"], ["Barretta proteica", "1"], ["Tonno", "1 scatoletta"],
];

export const COMBO = [
  { where: "Casa", name: "Frullato d'avena", what: "250 ml latte intero · 30 g avena · 10 g miele (+ proteine in polvere se le hai), frullato" },
  { where: "Casa", name: "Piadina e affettato", what: "65 g piadina · 70 g bresaola · 10 g mandorle" },
  { where: "Casa", name: "Uova sode e gallette", what: "3 uova · 40 g gallette · 10 g mandorle" },
  { where: "Ufficio", name: "Barretta e frutta secca", what: "1 barretta (almeno 20 g proteine, niente versioni light) · 30 g mandorle" },
];

// ─── Le regole ───────────────────────────────────────────────────────────────

export const RULES = [
  { title: "Le patate sostituiscono il pane, non le verdure", body: "250 g di patate lesse valgono 60 g di pane: la sera che le fai, salti il pane." },
  { title: "Insalata, rucola, pomodorini: a volontà", body: "Sono verdure vere. Il cucchiaio d'olio sopra è già contato." },
  { title: "Una frittata di 4 uova sostituisce la carne", body: "In qualunque cena. Stesse calorie, un po' meno proteine: va bene." },
  { title: "Il ragù fallo con l'hamburger", body: "150 g di macinato nel sugo sono 30 g di proteine che non si vedono." },
  { title: "Latte intero, mai scremato", body: "Sono calorie in più senza differenza di gusto. Nel tuo caso lo scremato è un danno." },
  { title: "La pizza del sabato non è uno sgarro", body: "Una volta a settimana, ti avvicina all'obiettivo invece di allontanarti." },
];

export const OFFICE = [
  "Primo più secondo più il pane del cestino. Mai solo il primo: al ristorante è metà porzione.",
  "Pizza intera, con prosciutto crudo o bresaola sopra.",
  "La merenda portala da casa: pane e affettato in un contenitore, più le mandorle.",
  "Colazione e cena restano quelle di casa.",
];
