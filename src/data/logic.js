// Rotazione, regole del calcetto, doppia progressione, fasi.
// Qui c'è tutto il "cervello" della scheda: le schermate si limitano a mostrarlo.

import { DAY, EX, phaseForWeek, runTargetForWeek, runPlanForWeek } from "./program.js";
import { todayISO } from "./dates.js";

const DAY_MS = 86400000;

export function parseISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(aISO, bISO) {
  return Math.round((parseISO(bISO) - parseISO(aISO)) / DAY_MS);
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

/** Lunedì = 0 … domenica = 6 */
export function dow(iso) {
  return (parseISO(iso).getDay() + 6) % 7;
}

// ─── Settimana e fase del programma ──────────────────────────────────────────

export function programWeek(state, iso = todayISO()) {
  const start = state.profile.startedAt;
  if (!start) return 1;
  return Math.floor(daysBetween(start, iso) / 7) + 1;
}

export function currentPhase(state, iso = todayISO()) {
  const week = programWeek(state, iso);
  return { week, ...phaseForWeek(week), runTarget: runTargetForWeek(week) };
}

// ─── La fila ─────────────────────────────────────────────────────────────────

export function nextDayId(state) {
  const rot = state.rotation.length ? state.rotation : ["upper_a"];
  return rot[state.rotationPos % rot.length];
}

/** Fa avanzare la fila di una posizione. La seduta saltata resta la prossima. */
export function advanceRotation(state) {
  state.rotationPos = (state.rotationPos + 1) % state.rotation.length;
  return state;
}

// ─── Le cinque regole ────────────────────────────────────────────────────────

/**
 * Quando cade la prossima partita. Usa il giorno abituale dichiarato nel profilo;
 * se è "variabile" guarda l'ultima partita giocata e assume cadenza settimanale.
 * Restituisce null quando non c'è modo di saperlo: in quel caso nessuna regola scatta.
 */
export function nextMatchIn(state, iso = todayISO()) {
  const { matchDay } = state.profile;
  if (matchDay !== null && matchDay !== undefined) {
    const delta = (matchDay - dow(iso) + 7) % 7;
    return delta;
  }
  const last = [...state.matches].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return null;
  const delta = (dow(last.date) - dow(iso) + 7) % 7;
  return delta;
}

/**
 * Applica le regole alla seduta proposta. Non blocca mai nulla: restituisce
 * un suggerimento con la motivazione, e la schermata Oggi lascia comunque
 * la possibilità di procedere.
 */
export function checkRules(state, dayId, iso = todayISO()) {
  const day = DAY[dayId];
  if (!day) return null;
  const inDays = nextMatchIn(state, iso);
  if (inDays === null) return null;

  if (day.nordic && inDays < 3 && inDays > 0) {
    return {
      severity: "warn",
      title: "Il Nordic curl è troppo vicino alla partita",
      body: `Giochi fra ${inDays} ${inDays === 1 ? "giorno" : "giorni"}. I dolori dei Nordic durano 3-4 giorni: rischi di andare in campo con i femorali a pezzi. Meglio anticipare un'altra seduta e fare questa dopo la partita.`,
      suggest: alternativeTo(state, dayId),
    };
  }
  if (day.legs && inDays === 1) {
    return {
      severity: "warn",
      title: "Gambe pesanti il giorno prima della partita",
      body: "Domani giochi. Sposta questa seduta e fai oggi una parte alta: le gambe le vuoi fresche in campo.",
      suggest: alternativeTo(state, dayId),
    };
  }
  const yesterdayMatch = state.matches.some((m) => m.date === addDays(iso, -1));
  if (day.legs && yesterdayMatch) {
    return {
      severity: "info",
      title: "Hai giocato ieri",
      body: "Le gambe hanno ancora la partita addosso. Se le senti pesanti, fai oggi una parte alta e rimanda questa di un giorno.",
      suggest: alternativeTo(state, dayId),
    };
  }
  return null;
}

/** Prima seduta della fila che non carica le gambe. */
function alternativeTo(state, dayId) {
  const rot = state.rotation;
  const start = rot.indexOf(dayId);
  for (let i = 1; i <= rot.length; i++) {
    const cand = rot[(start + i) % rot.length];
    if (!DAY[cand]?.legs) return cand;
  }
  return null;
}

// ─── Storico per esercizio ───────────────────────────────────────────────────

/** Le serie dell'ultima volta che quell'esercizio è stato effettivamente svolto. */
export function lastSetsFor(state, exId, beforeSessionId = null) {
  const done = state.sessions
    .filter((s) => s.endedAt && s.id !== beforeSessionId)
    .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  for (const s of done) {
    const sets = s.sets.filter((x) => x.exId === exId && x.done && x.reps > 0);
    if (sets.length) return { date: s.date, sets };
  }
  return null;
}

export function historyFor(state, exId, limit = 40) {
  return state.sessions
    .filter((s) => s.endedAt && s.sets.some((x) => x.exId === exId && x.done))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit)
    .map((s) => ({ date: s.date, sets: s.sets.filter((x) => x.exId === exId && x.done) }));
}

/** Formula di Epley, troncata: serve a vedere la tendenza, non a testare il massimale. */
export function estimated1RM(weight, reps) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + Math.min(reps, 12) / 30) * 10) / 10;
}

export function bestE1RM(sets) {
  return sets.reduce((m, s) => Math.max(m, estimated1RM(s.weight, s.reps)), 0);
}

// ─── Doppia progressione ─────────────────────────────────────────────────────

/**
 * Il carico e le ripetizioni da proporre oggi.
 *
 * Regola: quando l'ultima volta hai chiuso TUTTE le serie al massimo dell'intervallo,
 * si sale di uno scatto e si riparte dal minimo. Altrimenti si riprova lo stesso
 * carico. In fase di riadattamento i carichi d'ingresso sono scontati.
 */
export function suggestFor(state, dayId, item, sessionId = null) {
  const ex = EX[item.exId];
  const phase = currentPhase(state);
  const step = state.profile.weightStep || 1.5;
  const last = lastSetsFor(state, item.exId, sessionId);
  const sets = Math.min(item.sets, phase.setsCap);

  if (!last) {
    const base = (ex.entryWeight || 0) + (item.weightBump || 0);
    const weight = ex.bodyweight ? 0 : roundToStep(base * phase.loadFactor, step, ex);
    return {
      sets, weight, reps: item.repsMin,
      reason: phase.loadFactor < 1
        ? `Fase "${phase.name}": carico ridotto e ${item.repsMin} ripetizioni bastano. Se le senti facili resta comunque lontano dal cedimento — è il punto della fase.`
        : `Prima volta su questo esercizio. Punta al massimo del range (${item.repsMax}) restando 2-3 ripetizioni dal cedimento, poi correggi il numero.`,
      progressed: false,
    };
  }

  const w = last.sets[0].weight;
  const allMaxed = last.sets.length >= sets && last.sets.every((s) => s.reps >= item.repsMax);

  if (allMaxed && !ex.bodyweight) {
    const weight = roundToStep(w + step, step, ex);
    return {
      sets, weight, reps: item.repsMin, progressed: true,
      reason: `Hai chiuso tutte le serie a ${item.repsMax}: si sale a ${fmt(weight)} kg e si riparte da ${item.repsMin}.`,
    };
  }
  if (allMaxed && ex.bodyweight) {
    return {
      sets, weight: w, reps: item.repsMax, progressed: true,
      reason: "Tutte le serie al massimo: aggiungi una ripetizione o la zavorra.",
    };
  }

  const bestReps = Math.max(...last.sets.map((s) => s.reps));
  return {
    sets, weight: w, reps: Math.min(bestReps, item.repsMax), progressed: false,
    reason: `Ultima volta ${fmt(w)} kg × ${last.sets.map((s) => s.reps).join("/")}. Obiettivo: ${item.repsMax} in tutte e ${sets}.`,
  };
}

function roundToStep(value, step, ex) {
  if (ex?.singleWeight) return Math.max(0, Math.round(value));
  const min = 4; // il manubrio più leggero che ha
  const n = Math.round((value - min) / step);
  return Math.max(min, Math.round((min + n * step) * 10) / 10);
}

export const fmt = (n) =>
  Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10).replace(".", ",");

// ─── Riepiloghi ──────────────────────────────────────────────────────────────

export function sessionVolume(session) {
  return session.sets
    .filter((s) => s.done)
    .reduce((t, s) => t + (s.weight || 0) * (s.reps || 0), 0);
}

export function weekBounds(iso = todayISO()) {
  const start = addDays(iso, -dow(iso));
  return { start, end: addDays(start, 6) };
}

export function weekStats(state, iso = todayISO()) {
  const { start, end } = weekBounds(iso);
  const inWeek = (d) => d >= start && d <= end;
  const sessions = state.sessions.filter((s) => s.endedAt && inWeek(s.date));
  const runs = state.runs.filter((r) => inWeek(r.date));
  const matches = state.matches.filter((m) => inWeek(m.date));
  return {
    start, end, sessions, runs, matches,
    runMinutes: runs.reduce((t, r) => t + (Number(r.minutes) || 0), 0),
    runKm: runs.reduce((t, r) => t + (Number(r.km) || 0), 0),
  };
}

export function personalRecords(state, limit = 6) {
  const best = new Map();
  for (const s of state.sessions) {
    if (!s.endedAt) continue;
    for (const set of s.sets) {
      if (!set.done || !set.reps) continue;
      const score = estimated1RM(set.weight, set.reps) || set.reps;
      const cur = best.get(set.exId);
      if (!cur || score > cur.score) {
        best.set(set.exId, { exId: set.exId, weight: set.weight, reps: set.reps, date: s.date, score });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

// ─── La corsa ────────────────────────────────────────────────────────────────

/**
 * Quale seduta di corsa tocca adesso. Confronta il piano della settimana con
 * quello che è già stato registrato, per tipo: se hai già fatto la camminata in
 * salita, la prossima è la corsa facile.
 */
export function nextRun(state, iso = todayISO()) {
  const week = programWeek(state, iso);
  const plan = runPlanForWeek(week);
  const { start, end } = weekBounds(iso);

  const fatte = new Map();
  for (const r of state.runs) {
    if (r.date >= start && r.date <= end) fatte.set(r.type, (fatte.get(r.type) || 0) + 1);
  }

  const rimaste = [];
  for (const p of plan) {
    const n = fatte.get(p.type) || 0;
    if (n > 0) { fatte.set(p.type, n - 1); continue; }
    rimaste.push(p);
  }

  return {
    week, plan, total: plan.length,
    done: plan.length - rimaste.length,
    next: rimaste[0] ?? null,
  };
}

/**
 * Regola 4: gli intervalli non stanno mai a meno di 24 ore dalle gambe pesanti.
 * Restituisce l'avviso, oppure null se si può fare.
 */
export function checkRunRules(state, type, iso = todayISO()) {
  if (type !== "intervalli") return null;
  const ieri = addDays(iso, -1);
  const gambe = state.sessions.some(
    (s) => s.endedAt && (s.date === iso || s.date === ieri) && DAY[s.dayId]?.legs
  );
  if (!gambe) return null;
  return {
    title: "Gambe pesanti troppo vicine",
    body: "Hai allenato le gambe da meno di 24 ore. Gli intervalli su gambe stanche non allenano il fiato, aumentano solo il rischio. Fai oggi la camminata in salita e sposta gli intervalli.",
    suggest: "salita",
  };
}
