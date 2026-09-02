import { useStore, todayISO, newId } from "../data/store.jsx";
import { DAY, EX, RUN_TYPE } from "../data/program.js";
import {
  nextDayId, checkRules, currentPhase, weekStats, dow, addDays, suggestFor,
  nextRun, checkRunRules,
} from "../data/logic.js";

const DOW = ["L", "M", "M", "G", "V", "S", "D"];

export default function Today({ open }) {
  const { state, update } = useStore();
  const iso = todayISO();
  const phase = currentPhase(state);
  const week = weekStats(state, iso);

  const run = nextRun(state, iso);
  const runRule = run.next ? checkRunRules(state, run.next.type, iso) : null;

  const openSession = state.sessions.find((s) => !s.endedAt);
  const dayId = openSession ? openSession.dayId : nextDayId(state);
  const day = DAY[dayId];
  const rule = openSession ? null : checkRules(state, dayId, iso);

  function startSession(forcedDayId) {
    const id = newId();
    const targetId = forcedDayId || dayId;
    const target = DAY[targetId];
    update((s) => {
      const sets = [];
      for (const item of target.items) {
        const sug = suggestFor(s, targetId, item);
        for (let i = 1; i <= sug.sets; i++) {
          sets.push({
            exId: item.exId, setNumber: i,
            weight: sug.weight, reps: sug.reps, done: false,
          });
        }
      }
      s.sessions.push({
        id, dayId: targetId, date: iso,
        startedAt: new Date().toISOString(), endedAt: null, sets, note: "",
      });
      return s;
    });
    open({ kind: "session", sessionId: id });
  }

  function logMatch() {
    update((s) => {
      if (!s.matches.some((m) => m.date === iso)) s.matches.push({ date: iso });
      return s;
    });
  }

  const monday = addDays(iso, -dow(iso));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <>
      <header>
        <p className="eyebrow">{longDate(iso)}</p>
        <h1>{greeting()}</h1>
      </header>

      {rule && (
        <div className="card warn">
          <p className="eyebrow">{rule.title}</p>
          <p style={{ fontSize: 14 }}>{rule.body}</p>
          {rule.suggest && (
            <button className="btn small" onClick={() => startSession(rule.suggest)}>
              Fai invece {DAY[rule.suggest].name}
            </button>
          )}
        </div>
      )}

      <div className="card hero">
        <p className="eyebrow">
          {openSession ? "Seduta in corso" : `Prossima seduta · ${state.rotationPos + 1} di ${state.rotation.length}`}
        </p>
        <h2>{day.name} — {day.subtitle}</h2>
        <p className="sub">
          {day.items.map((i) => EX[i.exId]?.name.split(" ")[0]).join(", ")} · circa {day.minutes} minuti
        </p>
        <button className="btn wide" onClick={() => (openSession ? open({ kind: "session", sessionId: openSession.id }) : startSession())}>
          {openSession ? "Riprendi" : "Inizia"}
        </button>
      </div>

      <div className="btnrow">
        <button className="btn ghost" onClick={logMatch}>
          {week.matches.some((m) => m.date === iso) ? "Calcetto ✓" : "Oggi calcetto"}
        </button>
        <button className="btn ghost" onClick={() => open({ kind: "run" })}>Registra corsa</button>
      </div>

      {run.next ? (
        <div className="card aer">
          <p className="eyebrow">Prossima corsa · {run.done + 1} di {run.total} questa settimana</p>
          <h2>{RUN_TYPE[run.next.type].label}</h2>
          <p className="sub">
            {run.next.minutes} minuti · {RUN_TYPE[run.next.type].speed} · pendenza{" "}
            {RUN_TYPE[run.next.type].incline}
          </p>
          <p className="tiny">{RUN_TYPE[run.next.type].hint}</p>
          {runRule ? (
            <>
              <p className="tiny" style={{ color: "var(--forza)" }}><b>{runRule.title}.</b> {runRule.body}</p>
              <button className="btn aer wide" onClick={() => open({ kind: "run", preset: { ...run.next, type: runRule.suggest } })}>
                Fai la camminata in salita
              </button>
            </>
          ) : (
            <button className="btn aer wide" onClick={() => open({ kind: "run", preset: run.next })}>
              Registra questa corsa
            </button>
          )}
        </div>
      ) : (
        <div className="card aer">
          <p className="eyebrow">Corsa</p>
          <h2>Settimana completata</h2>
          <p className="sub">
            Hai chiuso tutte e {run.total} le sedute aerobiche previste. Se hai voglia di
            muoverti ancora, una camminata in salita non toglie recupero a niente.
          </p>
        </div>
      )}

      <div className="card">
        <p className="eyebrow">Questa settimana</p>
        <div className="weekstrip">
          {days.map((d) => {
            // Una sola classe per casella, in ordine di importanza: la seduta di forza
            // vince sulla partita, che vince sulla corsa. "Oggi" solo se non c'è altro.
            const cls =
              state.sessions.some((s) => s.date === d && s.endedAt) ? "done"
              : state.matches.some((m) => m.date === d) ? "match"
              : state.runs.some((r) => r.date === d) ? "run"
              : d === iso ? "today"
              : "";
            return <div key={d} className={cls}>{DOW[dow(d)]}</div>;
          })}
        </div>
        <p className="sub">
          {week.sessions.length} {week.sessions.length === 1 ? "seduta" : "sedute"} ·{" "}
          {Math.round(week.runMinutes)} di {phase.runTarget} minuti di corsa
          {week.matches.length > 0 && " · calcetto giocato"}
        </p>
        <div className="progbar aer">
          <i style={{ width: `${Math.min(100, (week.runMinutes / phase.runTarget) * 100)}%` }} />
        </div>
      </div>

      <div className="card">
        <p className="eyebrow">Fase</p>
        <h3>Settimana {phase.week} · {phase.name}</h3>
        <p className="sub">{phase.rule}</p>
      </div>
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

const GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

function longDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${GIORNI[dow(iso)]} ${d.getDate()} ${MESI[d.getMonth()]}`;
}
