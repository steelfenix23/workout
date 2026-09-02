import assert from "node:assert/strict";
import test, { before } from "node:test";
import { build } from "esbuild";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { ROTATION, DAY } from "../src/data/program.js";

let render;

before(async () => {
  // Il bundle vive dentro il progetto: React resta esterno e Node lo risolve
  // dal node_modules locale.
  const dir = "node_modules/.cache";
  mkdirSync(dir, { recursive: true });
  const outfile = join(process.cwd(), dir, `render-${process.pid}.mjs`);
  await build({
    entryPoints: ["test/fixtures/render-entry.jsx"],
    bundle: true, format: "esm", platform: "node", outfile,
    jsx: "automatic", loader: { ".js": "jsx" },
    external: ["react", "react-dom", "react-dom/server"],
    logLevel: "silent",
  });
  const mod = await import(outfile);
  // React SSR separa i pezzi interpolati con commenti <!-- -->: li tolgo,
  // altrimenti "Oggi: 2 serie" non combacia mai con l'HTML prodotto.
  render = (...args) => mod.render(...args).replaceAll("<!-- -->", "");
});

const state = (over = {}) => ({
  schemaVersion: 1,
  profile: { startedAt: "2026-09-02", heightCm: 185, matchDay: 3, summerMode: false, weightStep: 1.5 },
  rotation: [...ROTATION], rotationPos: 1,
  sessions: [], runs: [], weights: [], matches: [], legacy: [],
  settings: { supabaseUrl: "", supabaseKey: "", lastSync: null },
  ...over,
});

const withHistory = () => state({
  sessions: [{
    id: "s1", dayId: "upper_a", date: "2026-08-20", startedAt: "x", endedAt: "y", note: "",
    sets: [
      { exId: "panca_piana", setNumber: 1, weight: 19, reps: 10, done: true },
      { exId: "panca_piana", setNumber: 2, weight: 19, reps: 9, done: true },
    ],
  }, {
    id: "s2", dayId: "upper_a", date: "2026-08-27", startedAt: "x", endedAt: "y", note: "",
    sets: [
      { exId: "panca_piana", setNumber: 1, weight: 20.5, reps: 8, done: true },
      { exId: "panca_piana", setNumber: 2, weight: 20.5, reps: 8, done: true },
    ],
  }],
  runs: [{ id: "r1", date: "2026-08-28", type: "lunga", minutes: 30, km: 3.8, incline: 1, effort: "giusta" }],
  weights: [{ date: "2026-08-01", kg: 73 }, { date: "2026-08-28", kg: 73.6 }],
  matches: [{ date: "2026-08-27" }],
});

test("Oggi si apre a stato vuoto e propone la seduta giusta", () => {
  const html = render("Today", state());
  assert.match(html, /Lower A/);         // rotationPos = 1
  assert.match(html, /Inizia/);
  assert.match(html, /Riadattamento/);
});

test("Oggi mostra il riepilogo con dati reali", () => {
  const html = render("Today", withHistory());
  assert.match(html, /minuti di corsa/);
  assert.match(html, /calcetto/i);
});

test("Scheda elenca tutte le sedute e i carichi", () => {
  const html = render("Program", state());
  for (const d of Object.values(DAY)) assert.match(html, new RegExp(d.name));
  assert.match(html, /Le cinque regole/);
  assert.match(html, /Nordic/);
});

test("Progressi regge sia lo stato vuoto sia lo storico", () => {
  assert.match(render("Progress", state()), /Progressi/);
  const html = render("Progress", withHistory());
  assert.match(html, /Massimale stimato|record/i);
});

test("Altro mostra profilo, backup e zona pericolosa", () => {
  const html = render("More", state());
  assert.match(html, /Supabase/);
  assert.match(html, /Cancella tutti i dati/);
  assert.match(html, /Variante estiva/);
});

test("La schermata corsa si apre con i quattro tipi di seduta", () => {
  const html = render("RunLog", state());
  assert.match(html, /Salita/);
  assert.match(html, /Intervalli/);
  assert.match(html, /Registra corsa/);
});

test("La scheda esercizio mostra passi, errori e link al video", () => {
  const html = render("ExerciseSheet", state(), { exId: "nordic_curl" });
  assert.match(html, /Nordic Curl/);
  assert.match(html, /Errori comuni/);
  assert.match(html, /youtube\.com\/results/);
  assert.match(html, /una serie da tre ripetizioni/i);
});

test("Una seduta in corso mostra la colonna Prec. con i dati dell'ultima volta", () => {
  const s = withHistory();
  s.sessions.push({
    id: "live", dayId: "upper_a", date: "2026-09-02", startedAt: "x", endedAt: null, note: "",
    sets: [
      { exId: "panca_piana", setNumber: 1, weight: 22, reps: 8, done: false },
      { exId: "panca_piana", setNumber: 2, weight: 22, reps: 8, done: false },
    ],
  });
  const html = render("Session", s, { sessionId: "live" });
  assert.match(html, /Panca Piana/);
  assert.match(html, /Prec\./);
  assert.match(html, /20,5×8/, "deve mostrare la prestazione precedente");
});

test("Una seduta inesistente non fa esplodere la schermata", () => {
  const html = render("Session", state(), { sessionId: "boh" });
  assert.match(html, /non esiste più/);
});

test("la seduta mostra le serie di OGGI, non quelle nominali della scheda", () => {
  const s = state();               // settimana 1 = riadattamento, serie limitate a 2
  s.sessions.push({
    id: "live", dayId: "upper_a", date: "2026-09-02", startedAt: "x", endedAt: null, note: "",
    sets: [
      { exId: "panca_piana", setNumber: 1, weight: 13, reps: 6, done: false },
      { exId: "panca_piana", setNumber: 2, weight: 13, reps: 6, done: false },
    ],
  });
  const html = render("Session", s, { sessionId: "live" });
  assert.match(html, /Oggi: 2 serie/, "deve dire 2 serie, non le 4 a regime");
  assert.match(html, /ridotte da 4 per la fase in corso/, "e deve spiegare perché");
  assert.match(html, /1ª volta/, "la colonna Prec. deve dire che non c'è storico");
  assert.doesNotMatch(html, /Oggi: 4 serie/);
});
