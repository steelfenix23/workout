import { useMemo, useState } from "react";
import { useStore } from "../data/store.jsx";
import { DAY, EX } from "../data/program.js";
import {
  suggestFor, lastSetsFor, advanceRotation, sessionVolume, estimated1RM, fmt,
} from "../data/logic.js";

export default function Session({ sessionId, onClose, onExercise }) {
  const { state, update, flush } = useStore();
  const [idx, setIdx] = useState(0);
  const [summary, setSummary] = useState(null);

  const session = state.sessions.find((s) => s.id === sessionId);
  const day = session ? DAY[session.dayId] : null;
  const item = day?.items[Math.min(idx, (day?.items.length ?? 1) - 1)] ?? null;
  const ex = item ? EX[item.exId] : null;

  // Tutti gli hook prima di qualsiasi uscita anticipata: React non ammette
  // che il loro numero cambi fra un render e l'altro.
  const suggestion = useMemo(
    () => (item && session ? suggestFor(state, session.dayId, item, sessionId) : null),
    [state, session?.dayId, item, sessionId]
  );

  if (summary) return <Summary summary={summary} day={day} onClose={onClose} />;
  if (!session || !day || !item) {
    return (
      <div className="app">
        <div className="scroll">
          <div className="emptyish">Questa seduta non esiste più.</div>
          <button className="btn wide" onClick={onClose}>Torna alla home</button>
        </div>
      </div>
    );
  }

  const sets = session.sets.filter((s) => s.exId === item.exId);
  const last = lastSetsFor(state, item.exId, sessionId);

  const doneCount = session.sets.filter((s) => s.done).length;
  const pct = Math.round((doneCount / Math.max(1, session.sets.length)) * 100);

  function patchSet(setNumber, patch) {
    update((s) => {
      const ses = s.sessions.find((x) => x.id === sessionId);
      const target = ses.sets.find((x) => x.exId === item.exId && x.setNumber === setNumber);
      if (target) Object.assign(target, patch);
      return s;
    });
  }

  function bumpWeight(delta) {
    const step = state.profile.weightStep || 1.5;
    update((s) => {
      const ses = s.sessions.find((x) => x.id === sessionId);
      for (const st of ses.sets) {
        if (st.exId === item.exId && !st.done) {
          st.weight = Math.max(0, Math.round((st.weight + delta * step) * 10) / 10);
        }
      }
      return s;
    });
  }

  function addSet() {
    update((s) => {
      const ses = s.sessions.find((x) => x.id === sessionId);
      const mine = ses.sets.filter((x) => x.exId === item.exId);
      const lastSet = mine[mine.length - 1];
      ses.sets.push({
        exId: item.exId,
        setNumber: (lastSet?.setNumber || 0) + 1,
        weight: lastSet?.weight ?? suggestion.weight,
        reps: lastSet?.reps ?? suggestion.reps,
        done: false,
      });
      return s;
    });
  }

  function removeSet(setNumber) {
    update((s) => {
      const ses = s.sessions.find((x) => x.id === sessionId);
      ses.sets = ses.sets.filter((x) => !(x.exId === item.exId && x.setNumber === setNumber));
      return s;
    });
  }

  async function finish() {
    const done = session.sets.filter((s) => s.done);
    const volume = sessionVolume(session);
    const prs = [];
    for (const set of done) {
      const prev = lastSetsFor(state, set.exId, sessionId);
      const before = prev ? Math.max(...prev.sets.map((p) => estimated1RM(p.weight, p.reps))) : 0;
      const now = estimated1RM(set.weight, set.reps);
      if (now > before && now > 0 && !prs.some((p) => p.exId === set.exId)) {
        prs.push({ exId: set.exId, weight: set.weight, reps: set.reps });
      }
    }
    update((s) => {
      const ses = s.sessions.find((x) => x.id === sessionId);
      ses.endedAt = new Date().toISOString();
      ses.sets = ses.sets.filter((x) => x.done); // le serie non fatte non finiscono nello storico
      if (ses.sets.length === 0) {
        s.sessions = s.sessions.filter((x) => x.id !== sessionId); // seduta vuota: non esiste
      } else {
        advanceRotation(s);
      }
      return s;
    });
    await flush();
    setSummary({ volume, prs, count: done.length });
  }

  function abandon() {
    if (!confirm("Esci e cancelli questa seduta? Le serie registrate vanno perse.")) return;
    update((s) => { s.sessions = s.sessions.filter((x) => x.id !== sessionId); return s; });
    onClose();
  }

  return (
    <div className="app">
      <div className="scroll">
        <div className="row between">
          <div className="grow">
            <p className="eyebrow">{day.name} · esercizio {idx + 1} di {day.items.length}</p>
          </div>
          <button className="btn ghost small" onClick={onClose}>Sospendi</button>
        </div>
        <div className="progbar"><i style={{ width: `${pct}%` }} /></div>

        <div className="row between">
          <button className="grow" style={{ textAlign: "left" }} onClick={() => onExercise(item.exId)}>
            <h2>{ex.name}</h2>
            <p className="sub">
              {item.sets}×{item.repsMin === item.repsMax ? item.repsMin : `${item.repsMin}-${item.repsMax}`}
              {ex.unilateral && " per gamba"}
              {ex.timed && " secondi"} · tocca per la scheda
            </p>
          </button>
        </div>

        <div className="setgrid">
          <div className="setrow head">
            <span />
            <span>Prec.</span>
            <span>{ex.bodyweight ? "zavorra" : "kg"}</span>
            <span>{ex.timed ? "sec" : "reps"}</span>
            <span />
          </div>

          {sets.map((s, i) => {
            const prev = last?.sets[i];
            return (
              <div key={s.setNumber} className={"setrow" + (s.done ? " done" : "")}>
                <span className="n">{s.setNumber}</span>
                <span className="prev">
                  {prev ? `${fmt(prev.weight)}×${prev.reps}` : "—"}
                </span>
                <input
                  className="fld" type="number" inputMode="decimal" step="0.5"
                  value={s.weight === 0 && ex.bodyweight ? "" : s.weight}
                  placeholder={ex.bodyweight ? "0" : ""}
                  onChange={(e) => patchSet(s.setNumber, { weight: Number(e.target.value) || 0 })}
                />
                <input
                  className="fld" type="number" inputMode="numeric" step="1"
                  value={s.reps || ""}
                  onChange={(e) => patchSet(s.setNumber, { reps: Number(e.target.value) || 0 })}
                />
                <button
                  className="tick"
                  aria-label={s.done ? "Annulla serie" : "Conferma serie"}
                  onClick={() => patchSet(s.setNumber, { done: !s.done })}
                  onDoubleClick={() => removeSet(s.setNumber)}
                >
                  {s.done ? "✓" : ""}
                </button>
              </div>
            );
          })}
        </div>

        {!ex.bodyweight && (
          <div className="stepper">
            <button onClick={() => bumpWeight(-1)} aria-label="Meno">−</button>
            <span className="val">{fmt(sets.find((s) => !s.done)?.weight ?? sets[0]?.weight ?? 0)} kg</span>
            <button onClick={() => bumpWeight(1)} aria-label="Più">+</button>
          </div>
        )}

        <button className="btn ghost small" onClick={addSet}>+ Aggiungi serie</button>

        <div className="card flat">
          <p className="eyebrow">{suggestion.progressed ? "Si sale" : "Obiettivo"}</p>
          <p style={{ fontSize: 14 }}>{suggestion.reason}</p>
          {ex.note && <p className="tiny">{ex.note}</p>}
        </div>

        <div className="btnrow">
          <button className="btn ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Indietro</button>
          {idx < day.items.length - 1 ? (
            <button className="btn" onClick={() => setIdx(idx + 1)}>Avanti</button>
          ) : (
            <button className="btn" onClick={finish}>Chiudi seduta</button>
          )}
        </div>

        {idx === day.items.length - 1 && (
          <p className="tiny center">Doppio tocco sulla spunta per eliminare una serie.</p>
        )}
        <button className="btn danger small" onClick={abandon}>Annulla la seduta</button>
      </div>
    </div>
  );
}

function Summary({ summary, day, onClose }) {
  return (
    <div className="app">
      <div className="scroll">
        <div style={{ height: 20 }} />
        <h1 className="center">Seduta chiusa</h1>
        <p className="sub center">{day ? `${day.name} — ${day.subtitle}` : ""}</p>

        <div className="stats">
          <div><b className="num">{summary.count}</b><small>serie<br />fatte</small></div>
          <div><b className="num">{Math.round(summary.volume)}</b><small>kg di<br />volume</small></div>
          <div><b className="num">{summary.prs.length}</b><small>nuovi<br />record</small></div>
        </div>

        {summary.prs.length > 0 && (
          <div className="card">
            <p className="eyebrow">Nuovi record</p>
            <div className="list">
              {summary.prs.map((p) => (
                <div key={p.exId}>
                  <div className="lead"><b>{EX[p.exId]?.name}</b></div>
                  <span className="badge forza num">{fmt(p.weight)} × {p.reps}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn wide" onClick={onClose}>Torna alla home</button>
      </div>
    </div>
  );
}
