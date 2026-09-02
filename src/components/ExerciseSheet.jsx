import { useStore } from "../data/store.jsx";
import { EX } from "../data/program.js";
import { historyFor, estimated1RM, fmt } from "../data/logic.js";
import { useState } from "react";

export default function ExerciseSheet({ exId, onClose }) {
  const { state } = useStore();
  const [tab, setTab] = useState("come");
  const ex = EX[exId];
  if (!ex) return null;

  const history = historyFor(state, exId).slice(-12).reverse();

  return (
    <div className="sheet" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <button className="close" onClick={onClose} aria-label="Chiudi">×</button>

        <div>
          <h2>{ex.name}</h2>
          <p className="sub">{ex.equipment}</p>
        </div>

        <div className="segmented">
          <button aria-pressed={tab === "come"} onClick={() => setTab("come")}>Come si fa</button>
          <button aria-pressed={tab === "storico"} onClick={() => setTab("storico")}>Storico</button>
        </div>

        {tab === "come" ? (
          <>
            {ex.note && (
              <div className="card warn">
                <p className="eyebrow">Da ricordare</p>
                <p style={{ fontSize: 14 }}>{ex.note}</p>
              </div>
            )}

            <div className="card">
              <p className="eyebrow">Muscoli</p>
              <p style={{ fontSize: 14 }}>
                <b>{ex.primary}</b>
                {ex.secondary && ex.secondary !== "—" && (
                  <span className="sub"> · {ex.secondary}</span>
                )}
              </p>
            </div>

            <div className="card">
              <p className="eyebrow">Esecuzione</p>
              <ol className="steps">
                {ex.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>

            <div className="card">
              <p className="eyebrow">Errori comuni</p>
              <ul className="mistakes">
                {ex.mistakes.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>

            <div className="card">
              <p className="eyebrow">Tempo di esecuzione</p>
              <p style={{ fontSize: 14 }}>{ex.tempo}</p>
            </div>

            <a className="btn wide" href={ex.video} target="_blank" rel="noopener noreferrer">
              Guarda come si esegue
            </a>
            <p className="tiny center">
              Il link porta alla ricerca su YouTube e non a un video singolo: un video può
              sparire, una ricerca no.
            </p>
          </>
        ) : (
          <div className="list">
            {history.length === 0 && <div className="emptyish">Ancora nessuna sessione con questo esercizio.</div>}
            {history.map((h, i) => {
              const best = h.sets.reduce((m, s) => Math.max(m, estimated1RM(s.weight, s.reps)), 0);
              return (
                <div key={i}>
                  <div className="lead">
                    <b className="num">{h.date.slice(8)}/{h.date.slice(5, 7)}</b>
                    <small>{h.sets.map((s) => `${fmt(s.weight)}×${s.reps}`).join("  ·  ")}</small>
                  </div>
                  {best > 0 && <span className="badge forza num">{fmt(best)} kg</span>}
                </div>
              );
            })}
          </div>
        )}

        <button className="btn ghost wide" onClick={onClose}>Chiudi</button>
      </div>
    </div>
  );
}
