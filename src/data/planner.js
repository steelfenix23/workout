// Il piano dei prossimi giorni: quando allenarsi e quando riposare.
//
// Chiesto da Daniele il 21/11 per essere più costante. Si ricalcola ogni volta
// che l'app si apre, quindi si adatta da solo a quello che succede: una seduta
// saltata, una partita segnata, un viaggio di lavoro. Non deduce niente: i
// viaggi li segna lui (state.away), le partite pure.
//
// Per ogni settimana (lunedì-domenica) si sceglie fra tutte le combinazioni di
// giorni liberi quella che rispetta le regole e distribuisce meglio le sedute:
// sono al massimo 2^7, si fa prima a provarle tutte che a essere furbi.

import { DAY } from "./program.js";
import { addDays, dow, daysBetween, programWeek } from "./logic.js";
import { phaseForWeek } from "./program.js";
import { todayISO } from "./dates.js";

// Oltre quest'ora una seduta serale non si comincia più.
const LATE_HOUR = 21;

// ─── Feste ───────────────────────────────────────────────────────────────────

function easter(y) {
  // Algoritmo di Meeus/Jones/Butcher, calendario gregoriano.
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const FIXED_HOLIDAYS = ["01-01", "01-06", "04-25", "05-01", "06-02", "08-15", "11-01", "12-08", "12-25", "12-26"];

/** Sabato, domenica o festa nazionale: si allena la mattina. */
export function isFestivo(iso) {
  if (dow(iso) >= 5) return true;
  if (FIXED_HOLIDAYS.includes(iso.slice(5))) return true;
  return iso === addDays(easter(Number(iso.slice(0, 4))), 1); // Pasquetta
}

/** L'ora della seduta: feriali dopo il lavoro, festivi la mattina. */
export const sessionTime = (iso) => (isFestivo(iso) ? "10:00" : "19:00");

export function isAway(state, iso) {
  return (state.away || []).some((a) => iso >= a.from && iso <= a.to);
}

// ─── Regole sul singolo giorno ───────────────────────────────────────────────

/** La stessa logica di checkRules, guardando le partite segnate rispetto a QUEL giorno. */
function allowedOn(state, dayId, iso) {
  const day = DAY[dayId];
  const matchIn = (n) => state.matches.some((m) => m.date === addDays(iso, n));
  if (day.legs && (matchIn(0) || matchIn(1))) return false;  // gambe: né il giorno prima né lo stesso
  if (day.nordic && matchIn(2)) return false;               // femorali: almeno 3 giorni prima
  return true;
}

// ─── Il piano ────────────────────────────────────────────────────────────────

/**
 * I prossimi `days` giorni a partire da `from`. Ogni voce:
 *   { date, kind: "done" | "train" | "rest" | "away", dayId?, time?, match }
 * e in più, per settimana, se i viaggi hanno lasciato meno sedute del previsto.
 */
export function planDays(state, { from = todayISO(), days = 14, hour = new Date().getHours() } = {}) {
  const closed = state.sessions.filter((s) => s.endedAt);
  const open = state.sessions.find((s) => !s.endedAt && s.date === from);
  const trainedOn = new Set(closed.map((s) => s.date));

  let pos = state.rotationPos;
  const rot = state.rotation;
  const out = [];
  const shortWeeks = [];

  // Allenamenti già fatti (o in corso oggi) nei giorni prima del piano: servono
  // a non mettere un terzo giorno di fila a cavallo fra passato e piano.
  const trained = new Set([...trainedOn]);
  if (open) trained.add(from);

  const end = addDays(from, days - 1);
  let monday = addDays(from, -dow(from));

  while (monday <= end) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    const quota = phaseForWeek(programWeek(state, monday)).sessions;
    const doneInWeek = week.filter((d) => d <= from && trainedOn.has(d)).length
      + (open && week.includes(from) && !trainedOn.has(from) ? 1 : 0);
    const wanted = Math.max(0, quota - doneInWeek);

    const candidates = week.filter((d) =>
      d >= from && !isAway(state, d) &&
      !(d === from && (trainedOn.has(from) || open || hour >= LATE_HOUR))
    );

    const best = bestSchedule(state, candidates, wanted, pos, rot, trained);
    if (best.days.length < wanted && week.some((d) => d >= from && isAway(state, d))) {
      shortWeeks.push({ monday, planned: best.days.length + doneInWeek, quota });
    }

    for (const d of best.days) trained.add(d);
    const byDate = new Map(best.days.map((d, i) => [d, rot[(pos + i) % rot.length]]));
    pos = (pos + best.days.length) % rot.length;

    for (const d of week) {
      if (d < from || d > end) continue;
      const match = state.matches.some((m) => m.date === d);
      if (d === from && open) out.push({ date: d, kind: "train", dayId: open.dayId, time: "ora", match, inProgress: true });
      else if (d === from && trainedOn.has(from)) {
        const s = closed.find((x) => x.date === from);
        out.push({ date: d, kind: "done", dayId: s.dayId, match });
      } else if (byDate.has(d)) {
        // Oggi, se l'ora è già passata, la seduta si fa quando si può (entro le 21).
        const t = sessionTime(d);
        const late = d === from && hour >= Number(t.slice(0, 2));
        out.push({ date: d, kind: "train", dayId: byDate.get(d), time: late ? "in giornata" : t, match });
      }
      else if (isAway(state, d)) out.push({ date: d, kind: "away", match });
      else out.push({ date: d, kind: "rest", match });
    }
    monday = addDays(monday, 7);
  }
  return { days: out, shortWeeks };
}

/** Fra tutte le combinazioni di giorni, quella valida con più sedute e meglio distribuita. */
function bestSchedule(state, candidates, wanted, pos, rot, trainedBefore) {
  const n = candidates.length;
  let best = null;
  for (let k = Math.min(wanted, n); k >= 0 && !best; k--) {
    for (let mask = 0; mask < 1 << n; mask++) {
      if (popcount(mask) !== k) continue;
      const days = candidates.filter((_, i) => mask & (1 << i));
      const score = scoreOf(state, days, pos, rot, trainedBefore);
      if (score !== null && (!best || score < best.score)) best = { days, score };
    }
  }
  return best || { days: [], score: 0 };
}

function popcount(x) {
  let c = 0;
  while (x) { c += x & 1; x >>= 1; }
  return c;
}

/** null se la combinazione viola una regola; altrimenti più basso è meglio. */
function scoreOf(state, days, pos, rot, trainedBefore) {
  const trained = new Set(trainedBefore);
  let score = 0;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const dayId = rot[(pos + i) % rot.length];
    if (!allowedOn(state, dayId, d)) return null;
    const y1 = trained.has(addDays(d, -1)), y2 = trained.has(addDays(d, -2));
    if (y1 && y2) return null;                                  // mai tre giorni di fila
    if (y1) score += 10;                                        // due di fila: si può, ma meglio di no
    if (state.matches.some((m) => m.date === d)) score += 4;    // il giorno della partita, meglio riposare
    if (DAY[dayId].legs && state.matches.some((m) => m.date === addDays(d, -1))) score += 6; // dopo la partita, parte alta
    trained.add(d);
  }
  // A parità, prima è meglio: una seduta rimandata a domenica è una seduta a rischio.
  score += days.reduce((t, d) => t + daysBetween(days[0] ?? d, d), 0) * 0.01;
  return score;
}

// ─── Calendario (.ics) ───────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, "0");
const icsDate = (iso, hhmm) => `${iso.replaceAll("-", "")}T${hhmm.replace(":", "")}00`;

function minutesOf(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function trigger(minutesBefore) {
  const h = Math.floor(minutesBefore / 60), m = minutesBefore % 60;
  return `-PT${h ? h + "H" : ""}${m ? m + "M" : ""}${!h && !m ? "0M" : ""}`;
}

/** Il testo di una riga .ics, con i caratteri speciali protetti e le righe lunghe piegate. */
function line(s) {
  const out = [];
  let rest = s;
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = " " + rest.slice(74); }
  out.push(rest);
  return out.join("\r\n");
}
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");

/**
 * Il calendario delle prossime sedute, con due promemoria per ciascuna: la sera
 * prima alle 21 e il giorno stesso (17:30 nei feriali, 9:00 nei festivi).
 *
 * Le sedute già esportate che nel piano nuovo non ci sono più escono come
 * annullate con lo stesso UID, così il calendario le può togliere.
 */
export function calendarICS(plan, previous = {}, seq = 1) {
  const train = plan.days.filter((d) => d.kind === "train" && !d.inProgress)
    .map((d) => (/^\d\d:\d\d$/.test(d.time) ? d : { ...d, time: sessionTime(d.date) }));
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//workout//piano//IT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
             "X-WR-CALNAME:Allenamenti"];

  for (const d of train) {
    const day = DAY[d.dayId];
    const start = minutesOf(d.time);
    const endMin = start + day.minutes;
    const sameDay = isFestivo(d.date) ? minutesOf("09:00") : minutesOf("17:30");
    const evening = start + (24 * 60 - minutesOf("21:00"));        // la sera prima alle 21
    L.push("BEGIN:VEVENT",
      `UID:allenamento-${d.date}@workout`,
      `SEQUENCE:${seq}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(d.date, d.time)}`,
      `DTEND:${icsDate(d.date, `${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`)}`,
      line(`SUMMARY:${esc(`${day.name} — ${day.subtitle}`)}`),
      line(`DESCRIPTION:${esc(`Circa ${day.minutes} minuti. Se salti, il piano nell'app si ricalcola: riapri e aggiorna il calendario.`)}`),
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:Domani ${esc(day.name)}`, `TRIGGER:${trigger(evening)}`, "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:Oggi ${esc(day.name)} alle ${d.time}`, `TRIGGER:${trigger(start - sameDay)}`, "END:VALARM",
      "END:VEVENT");
  }

  const nowPlanned = new Set(train.map((d) => d.date));
  const first = plan.days[0]?.date ?? "";
  for (const [date, dayId] of Object.entries(previous)) {
    if (date < first || nowPlanned.has(date)) continue;
    L.push("BEGIN:VEVENT", `UID:allenamento-${date}@workout`, `SEQUENCE:${seq}`, `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(date, sessionTime(date))}`, line(`SUMMARY:${esc(`${DAY[dayId]?.name ?? "Allenamento"} — spostato`)}`),
      "STATUS:CANCELLED", "END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.join("\r\n") + "\r\n";
}

/** Le sedute in calendario come {data: seduta}: si confronta col piano per sapere se è cambiato. */
export function exportedMap(plan) {
  return Object.fromEntries(plan.days.filter((d) => d.kind === "train" && !d.inProgress).map((d) => [d.date, d.dayId]));
}

/** Le differenze fra il calendario esportato e il piano di adesso, solo da oggi in poi. */
export function calendarDiff(plan, exported) {
  if (!exported) return null;
  // Una seduta in calendario che oggi risulta fatta (o in corso) non è un cambiamento.
  const now = Object.fromEntries(plan.days.filter((d) => d.dayId).map((d) => [d.date, d.dayId]));
  const last = Object.keys(exported).sort().pop() ?? "";
  const changed = [];
  for (const d of plan.days) {
    if (d.date > last) break;
    if ((now[d.date] ?? null) !== (exported[d.date] ?? null)) changed.push(d.date);
  }
  return changed;
}
