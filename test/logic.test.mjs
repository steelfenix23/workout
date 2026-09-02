import assert from "node:assert/strict";
import test from "node:test";
import {
  suggestFor, checkRules, nextDayId, advanceRotation, currentPhase,
  estimated1RM, lastSetsFor, weekStats, personalRecords, nextMatchIn,
  nextRun, checkRunRules,
} from "../src/data/logic.js";
import { DAY, ROTATION, phaseForWeek, runTargetForWeek, runPlanForWeek, EXERCISES } from "../src/data/program.js";

const base = (over = {}) => ({
  profile: { startedAt: "2026-09-07", heightCm: 185, matchDay: null, weightStep: 1.5 },
  rotation: [...ROTATION], rotationPos: 0,
  sessions: [], runs: [], weights: [], matches: [], legacy: [],
  settings: {}, ...over,
});

const session = (dayId, date, sets) => ({
  id: date + dayId, dayId, date, startedAt: date, endedAt: date + "T19:00:00", sets, note: "",
});

test("ogni esercizio della scheda ha video, passi ed errori", () => {
  for (const ex of EXERCISES) {
    assert.match(ex.video, /^https:\/\/www\.youtube\.com\/results\?search_query=/, ex.name);
    assert.ok(ex.steps.length >= 3, `${ex.name}: pochi passi`);
    assert.ok(ex.mistakes.length >= 1, `${ex.name}: nessun errore comune`);
  }
});

test("tutte le sedute puntano a esercizi esistenti", () => {
  const ids = new Set(EXERCISES.map((e) => e.id));
  for (const d of Object.values(DAY)) {
    for (const it of d.items) assert.ok(ids.has(it.exId), `${d.name} → ${it.exId}`);
  }
});

test("le fasi coprono le 12 settimane senza buchi", () => {
  for (let w = 1; w <= 12; w++) {
    assert.ok(phaseForWeek(w), `settimana ${w} senza fase`);
    assert.ok(runTargetForWeek(w) > 0, `settimana ${w} senza obiettivo corsa`);
  }
  assert.equal(phaseForWeek(1).name, "Riadattamento");
  assert.equal(phaseForWeek(9).name, "Scarico");
  assert.equal(runTargetForWeek(12), 115);
});

test("in riadattamento i carichi sono scontati e le serie limitate", () => {
  const s = base();
  const item = DAY.upper_a.items[0]; // panca 4 serie
  const sug = suggestFor(s, "upper_a", item);
  assert.equal(sug.sets, 2, "in fase 1 al massimo 2 serie");
  assert.ok(sug.weight < 17.5, "carico scontato rispetto all'ingresso");
});

test("doppia progressione: tutte le serie al massimo fanno salire di uno scatto", () => {
  const s = base({ profile: { ...base().profile, startedAt: "2026-06-01" } }); // fase piena
  const item = DAY.upper_a.items[0]; // 4 × 6-10
  s.sessions.push(session("upper_a", "2026-09-01", [
    { exId: "panca_piana", setNumber: 1, weight: 19, reps: 10, done: true },
    { exId: "panca_piana", setNumber: 2, weight: 19, reps: 10, done: true },
    { exId: "panca_piana", setNumber: 3, weight: 19, reps: 10, done: true },
    { exId: "panca_piana", setNumber: 4, weight: 19, reps: 10, done: true },
  ]));
  const sug = suggestFor(s, "upper_a", item);
  assert.equal(sug.progressed, true);
  assert.equal(sug.weight, 20.5, "19 + 1,5 kg");
  assert.equal(sug.reps, 6, "si riparte dal minimo dell'intervallo");
});

test("se anche una sola serie non arriva al massimo, il carico resta", () => {
  const s = base({ profile: { ...base().profile, startedAt: "2026-06-01" } });
  s.sessions.push(session("upper_a", "2026-09-01", [
    { exId: "panca_piana", setNumber: 1, weight: 19, reps: 10, done: true },
    { exId: "panca_piana", setNumber: 2, weight: 19, reps: 10, done: true },
    { exId: "panca_piana", setNumber: 3, weight: 19, reps: 8, done: true },
    { exId: "panca_piana", setNumber: 4, weight: 19, reps: 7, done: true },
  ]));
  const sug = suggestFor(s, "upper_a", DAY.upper_a.items[0]);
  assert.equal(sug.progressed, false);
  assert.equal(sug.weight, 19);
});

test("la fila slitta: la seduta saltata resta la prossima", () => {
  const s = base();
  assert.equal(nextDayId(s), "upper_a");
  advanceRotation(s);                      // chiusa upper_a
  assert.equal(nextDayId(s), "lower_a");
  // Passano tre giorni senza allenarsi: la prossima è ancora lower_a.
  assert.equal(nextDayId(s), "lower_a");
  advanceRotation(s); advanceRotation(s); advanceRotation(s);
  assert.equal(nextDayId(s), "upper_a", "la rotazione torna all'inizio");
});

test("regola: niente gambe pesanti il giorno prima della partita", () => {
  // 2026-09-08 è un martedì; con partita al mercoledì il lunedì è "il giorno prima".
  const s = base({ profile: { ...base().profile, matchDay: 2 } });
  const r = checkRules(s, "lower_a", "2026-09-08"); // martedì, partita mercoledì
  assert.ok(r, "la regola deve scattare");
  assert.match(r.title, /giorno prima/i);
  assert.equal(DAY[r.suggest].legs, undefined, "l'alternativa non carica le gambe");
});

test("regola: il Nordic curl vuole tre giorni pieni prima della partita", () => {
  const s = base({ profile: { ...base().profile, matchDay: 3 } }); // giovedì
  const martedi = checkRules(s, "lower_b", "2026-09-08");
  assert.ok(martedi, "a due giorni dalla partita deve avvisare");
  assert.match(martedi.title, /Nordic/);
  const venerdi = checkRules(s, "lower_b", "2026-09-11"); // 6 giorni prima
  assert.equal(venerdi, null, "a distanza di sicurezza non deve avvisare");
});

test("senza giorno partita impostato nessuna regola blocca nulla", () => {
  const s = base();
  assert.equal(nextMatchIn(s, "2026-09-08"), null);
  assert.equal(checkRules(s, "lower_b", "2026-09-08"), null);
});

test("il massimale stimato cresce col carico e con le ripetizioni", () => {
  assert.equal(estimated1RM(20, 1), 20);
  assert.ok(estimated1RM(20, 10) > estimated1RM(20, 5));
  assert.ok(estimated1RM(25, 8) > estimated1RM(20, 8));
  assert.equal(estimated1RM(0, 10), 0);
});

test("lo storico ignora le sedute non chiuse", () => {
  const s = base();
  s.sessions.push({ id: "aperta", dayId: "upper_a", date: "2026-09-09", endedAt: null,
    sets: [{ exId: "panca_piana", setNumber: 1, weight: 99, reps: 10, done: true }] });
  assert.equal(lastSetsFor(s, "panca_piana"), null);
});

test("il riepilogo settimanale somma sedute, corse e partite", () => {
  const s = base();
  s.sessions.push(session("upper_a", "2026-09-09", []));
  s.runs.push({ id: "r1", date: "2026-09-10", type: "lunga", minutes: 30, km: 4 });
  s.runs.push({ id: "r2", date: "2026-09-11", type: "salita", minutes: 25, km: 2.5 });
  s.matches.push({ date: "2026-09-10" });
  const w = weekStats(s, "2026-09-09");
  assert.equal(w.sessions.length, 1);
  assert.equal(w.runMinutes, 55);
  assert.equal(w.matches.length, 1);
});

test("i record personali prendono la prestazione migliore per esercizio", () => {
  const s = base();
  s.sessions.push(session("upper_a", "2026-09-01", [
    { exId: "panca_piana", setNumber: 1, weight: 19, reps: 8, done: true },
  ]));
  s.sessions.push(session("upper_a", "2026-09-08", [
    { exId: "panca_piana", setNumber: 1, weight: 22, reps: 8, done: true },
  ]));
  const prs = personalRecords(s);
  assert.equal(prs.length, 1);
  assert.equal(prs[0].weight, 22);
});

test("il piano di corsa copre 12 settimane e i totali coincidono col programma", () => {
  const attesi = [45, 50, 60, 65, 75, 80, 90, 95, 50, 100, 110, 115];
  for (let w = 1; w <= 12; w++) {
    const plan = runPlanForWeek(w);
    assert.ok(plan.length >= 2, `settimana ${w}: troppe poche sedute`);
    assert.equal(runTargetForWeek(w), attesi[w - 1], `settimana ${w}`);
    assert.equal(plan.reduce((t, r) => t + r.minutes, 0), attesi[w - 1],
      `settimana ${w}: la somma del piano deve essere l'obiettivo`);
  }
});

test("la corsa lunga non cresce mai piu' del 12% a settimana", () => {
  let prev = 0;
  for (let w = 3; w <= 12; w++) {
    if (w === 9) continue;                       // scarico: solo camminate
    const lunga = runPlanForWeek(w).find((r) => r.type === "lunga");
    if (!lunga) continue;
    if (prev) assert.ok(lunga.minutes <= prev * 1.12,
      `settimana ${w}: da ${prev} a ${lunga.minutes} minuti è un salto troppo grosso`);
    prev = lunga.minutes;
  }
});

test("nextRun propone le sedute in ordine e si accorge di quelle fatte", () => {
  const s = base();
  const oggi = "2026-09-07";
  s.profile.startedAt = oggi;                    // settimana 1: salita + facile
  let r = nextRun(s, oggi);
  assert.equal(r.total, 2);
  assert.equal(r.next.type, "salita");
  s.runs.push({ id: "a", date: oggi, type: "salita", minutes: 25 });
  r = nextRun(s, oggi);
  assert.equal(r.done, 1);
  assert.equal(r.next.type, "facile");
  s.runs.push({ id: "b", date: oggi, type: "facile", minutes: 20 });
  assert.equal(nextRun(s, oggi).next, null, "settimana completata");
});

test("regola 4: niente intervalli entro 24 ore dalle gambe pesanti", () => {
  const s = base();
  assert.equal(checkRunRules(s, "intervalli", "2026-09-10"), null);
  s.sessions.push(session("lower_a", "2026-09-09", [
    { exId: "front_squat", setNumber: 1, weight: 14, reps: 8, done: true },
  ]));
  const r = checkRunRules(s, "intervalli", "2026-09-10");
  assert.ok(r, "il giorno dopo le gambe deve avvisare");
  assert.equal(r.suggest, "salita");
  assert.equal(checkRunRules(s, "lunga", "2026-09-10"), null, "vale solo per gli intervalli");
});
