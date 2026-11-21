import assert from "node:assert/strict";
import test from "node:test";
import { planDays, calendarICS, exportedMap, calendarDiff, isFestivo, sessionTime } from "../src/data/planner.js";
import { ROTATION, DAY } from "../src/data/program.js";
import { addDays } from "../src/data/logic.js";

// Date fisse ma passate esplicitamente al pianificatore: il risultato non dipende
// dal giorno in cui girano i test. Lunedì 7/12/2026 è in progressione (settimana 14).
const LUN = "2026-12-07";
const base = (over = {}) => ({
  profile: { startedAt: "2026-09-04", heightCm: 185, matchDay: null, weightStep: 1.5 },
  rotation: [...ROTATION], rotationPos: 0,
  sessions: [], runs: [], weights: [], matches: [], away: [], legacy: [], settings: {},
  ...over,
});
const train = (p) => p.days.filter((d) => d.kind === "train");
const plan = (s, from = LUN, hour = 8) => planDays(s, { from, days: 7, hour });

test("una settimana libera: 4 sedute in rotazione, mai tre giorni di fila", () => {
  const p = plan(base());
  const t = train(p);
  assert.equal(t.length, 4);
  assert.deepEqual(t.map((d) => d.dayId), ROTATION);
  const days = new Set(t.map((d) => d.date));
  for (const d of days) assert.ok(!(days.has(addDays(d, 1)) && days.has(addDays(d, 2))), "tre di fila");
  assert.equal(p.days.length, 7);
});

test("nei giorni di viaggio non ci sono sedute, e se non ci stanno tutte lo dice", () => {
  const s = base({ away: [{ from: "2026-12-08", to: "2026-12-11" }] }); // mar → ven
  const p = plan(s);
  for (const d of p.days.filter((x) => x.date >= "2026-12-08" && x.date <= "2026-12-11")) {
    assert.equal(d.kind, "away");
  }
  assert.equal(train(p).length, 3, "restano lunedì, sabato e domenica");
  assert.equal(p.shortWeeks.length, 1);
});

test("le regole del calcetto valgono anche nel piano", () => {
  const s = base({ matches: [{ date: "2026-12-10" }] });      // giovedì
  for (const d of train(plan(s))) {
    const day = DAY[d.dayId];
    if (day.legs) assert.ok(d.date !== "2026-12-09" && d.date !== "2026-12-10", `gambe il ${d.date}`);
    if (day.nordic) assert.ok(d.date !== "2026-12-08", "femorali due giorni prima");
  }
});

test("le sedute già fatte in settimana contano, e si riparte dalla fila", () => {
  const s = base({ rotationPos: 2 });
  s.sessions.push({ id: "a", dayId: "upper_a", date: LUN, endedAt: "x", sets: [] });
  s.sessions.push({ id: "b", dayId: "lower_a", date: "2026-12-08", endedAt: "x", sets: [] });
  const p = plan(s, "2026-12-09");
  const t = train(p).filter((d) => d.date <= "2026-12-13");   // solo questa settimana
  assert.equal(t.length, 2, "4 previste meno le 2 fatte");
  assert.equal(t[0].dayId, "upper_b");
  assert.notEqual(t[0].date, "2026-12-09", "mercoledì sarebbe il terzo giorno di fila");
});

test("oggi: dopo le 21 non si propone più niente, e una seduta fatta risulta fatta", () => {
  assert.notEqual(plan(base(), LUN, 22).days[0].kind, "train");
  const s = base({ rotationPos: 1 });                         // chiudere la seduta fa avanzare la fila
  s.sessions.push({ id: "a", dayId: "upper_a", date: LUN, endedAt: "x", sets: [] });
  const p = plan(s);
  assert.equal(p.days[0].kind, "done");
  assert.equal(train(p)[0].dayId, "lower_a");
});

test("feste e orari: sera nei feriali, mattina nel weekend e nelle feste", () => {
  assert.equal(sessionTime(LUN), "19:00");
  assert.equal(sessionTime("2026-12-12"), "10:00");          // sabato
  assert.ok(isFestivo("2026-12-08"));                        // Immacolata
  assert.ok(isFestivo("2027-03-29"));                        // Pasquetta 2027
  assert.ok(!isFestivo("2027-03-30"));
});

test("il calendario ha un evento per seduta con due promemoria, e annulla quelle spostate", () => {
  const p = plan(base());
  const ics = calendarICS(p, { "2026-12-13": "lower_b", ...exportedMap(p) }, 2);
  const events = ics.split("BEGIN:VEVENT").length - 1;
  const t = train(p);
  const cancelled = t.some((d) => d.date === "2026-12-13") ? 0 : 1;
  assert.equal(events, t.length + cancelled);
  assert.equal(ics.split("BEGIN:VALARM").length - 1, t.length * 2);
  assert.match(ics, /TRIGGER:-PT22H/, "sera prima alle 21 per una seduta alle 19");
  assert.match(ics, /TRIGGER:-PT1H30M/, "giorno stesso alle 17:30");
  if (cancelled) assert.match(ics, /STATUS:CANCELLED/);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});

test("il piano cambiato rispetto al calendario esportato viene segnalato", () => {
  const s = base();
  const exported = exportedMap(plan(s));
  assert.deepEqual(calendarDiff(plan(s), exported), []);
  s.away = [{ from: LUN, to: LUN }];
  assert.ok(calendarDiff(plan(s), exported).includes(LUN));
});

test("una seduta fatta oggi non fa dire che il piano è cambiato", () => {
  const s = base();
  const exported = exportedMap(plan(s));               // esportato prima di allenarsi
  s.sessions.push({ id: "a", dayId: exported[LUN], date: LUN, endedAt: "x", sets: [] });
  s.rotationPos = 1;
  assert.deepEqual(calendarDiff(plan(s), exported), []);
  // Anche esportando a seduta in corso (oggi escluso dal calendario) e poi chiudendola.
  const during = { ...exported }; delete during[LUN];
  assert.deepEqual(calendarDiff(plan(s), during), []);
});
