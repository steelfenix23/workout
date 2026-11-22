import { useStore, todayISO, newId } from "../data/store.jsx";
import { DAY, EX, RUN_TYPE, runGuidance } from "../data/program.js";
import {
  nextDayId, checkRules, currentPhase, weekStats, dow, addDays, suggestFor, goalBoard,
  nextRun, checkRunRules,
} from "../data/logic.js";
import { planDays } from "../data/planner.js";

const DOW = ["L", "M", "M", "G", "V", "S", "D"];

export default function Today({ open }) {
  const { state, update } = useStore();
  const iso = todayISO();
  const phase = currentPhase(state);
  const week = weekStats(state, iso);

  const run = nextRun(state, iso);
  const runRule = run.next ? checkRunRules(state, run.next.type, iso) : null;

  const plan = planDays(state, { from: iso });
  const todayPlan = plan.days[0];
  const nextTrain = plan.days.find((d) => d.kind === "train" && d.date > iso);

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
        {!openSession && todayPlan && todayPlan.kind !== "train" && (
          <p className="tiny">
            {todayPlan.kind === "done" ? "Oggi hai già fatto la tua seduta." : todayPlan.kind === "away" ? "Oggi sei via." : "Oggi è giorno di riposo."}
            {nextTrain && ` Questa tocca ${dayLabel(nextTrain.date)}.`} Se vuoi, puoi farla comunque.
          </p>
        )}
        <button className="btn wide" onClick={() => (openSession ? open({ kind: "session", sessionId: openSession.id }) : startSession())}>
          {openSession ? "Riprendi" : "Inizia"}
        </button>
      </div>

      <div className="btnrow" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <button className="btn ghost" onClick={() => open({ kind: "match" })}>
          {state.matches.some((m) => m.date === iso) ? "Calcetto ✓" : "Calcetto"}
        </button>
        <button className="btn ghost" onClick={() => open({ kind: "away" })}>Sono via</button>
        <button className="btn ghost" onClick={() => open({ kind: "run" })}>Corsa</button>
      </div>

      <div className="card">
        <p className="eyebrow">I prossimi giorni</p>
        <div className="list">
          {plan.days.slice(0, 7).map((d) => (
            <div key={d.date}>
              <div className="lead">
                <b>{d.kind === "train" ? DAY[d.dayId].name : d.kind === "done" ? `${DAY[d.dayId].name} ✓` : d.kind === "away" ? "Via" : "Riposo"}</b>
                <small>
                  {d.date === iso ? "oggi" : dayLabel(d.date)}
                  {d.kind === "train" && ` · ${d.inProgress ? "in corso" : d.time}`}
                  {d.match && " · calcetto"}
                </small>
              </div>
              {d.kind === "train" && <span className="badge forza">{DAY[d.dayId].subtitle}</span>}
            </div>
          ))}
        </div>
        {plan.shortWeeks.map((w) => (
          <p className="tiny" key={w.monday}>
            Settimana del {dayLabel(w.monday)}: con il viaggio ci stanno {w.planned} sedute su {w.quota}. Va bene così.
          </p>
        ))}
        <p className="tiny">
          Si ricalcola da solo se salti una seduta, segni una partita o un viaggio. La camminata
          in salita falla quando vuoi, anche nei giorni di riposo.
        </p>
      </div>

      {run.next ? (
        <div className="card aer">
          <p className="eyebrow">Prossima corsa · {run.done + 1} di {run.total} questa settimana</p>
          <h2>{RUN_TYPE[run.next.type].label}</h2>
          <p className="sub">
            {run.next.minutes} minuti · {runGuidance(run.next.type, phase.week).speed} · pendenza{" "}
            {runGuidance(run.next.type, phase.week).incline}
          </p>
          <p className="tiny">{runGuidance(run.next.type, phase.week).note}</p>
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
        <h3>
          {phase.block > 1 ? `Blocco ${phase.block} · settimana ${phase.blockWeek} di ${phase.blockLength}` : `Settimana ${phase.week}`}
          {" · "}{phase.name}
        </h3>
        <p className="sub">{phase.rule}</p>
      </div>

      <div className="card">
        <p className="eyebrow">Obiettivi</p>
        {goalBoard(state).filter((g) => g.active).map((g) => (
          <div key={g.id} style={{ marginBottom: 10 }}>
            <div className="row between">
              <b>{g.title}</b>
              <span className="tiny">{g.reachedCount} di {g.goals.length} · mancano {g.daysLeft} giorni</span>
            </div>
            <div className="progbar" style={{ marginTop: 6 }}><i style={{ width: `${(g.reachedCount / g.goals.length) * 100}%` }} /></div>
          </div>
        ))}
        <p className="tiny">Il dettaglio è in Progressi.</p>
      </div>
    </>
  );
}

const GG = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
function dayLabel(iso) {
  return `${GG[dow(iso)]} ${Number(iso.slice(8))}/${Number(iso.slice(5, 7))}`;
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
