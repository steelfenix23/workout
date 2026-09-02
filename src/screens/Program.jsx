import { useStore } from "../data/store.jsx";
import { DAYS, DAY, EX, PHASES } from "../data/program.js";
import { currentPhase, nextDayId, nextMatchIn, fmt, suggestFor } from "../data/logic.js";

const DOW_LABELS = [
  { v: 0, l: "Lunedì" }, { v: 1, l: "Martedì" }, { v: 2, l: "Mercoledì" },
  { v: 3, l: "Giovedì" }, { v: 4, l: "Venerdì" }, { v: 5, l: "Sabato" }, { v: 6, l: "Domenica" },
];

export default function Program({ open }) {
  const { state, update } = useStore();
  const phase = currentPhase(state);
  const next = nextDayId(state);
  const inDays = nextMatchIn(state);

  function move(idx, dir) {
    const to = idx + dir;
    if (to < 0 || to >= state.rotation.length) return;
    update((s) => {
      const r = s.rotation;
      [r[idx], r[to]] = [r[to], r[idx]];
      return s;
    });
  }

  function setPos(idx) {
    update((s) => { s.rotationPos = idx; return s; });
  }

  return (
    <>
      <h1>La rotazione</h1>
      <p className="sub">
        La scheda avanza per posizione, non per giorno della settimana: se salti una seduta,
        quella diventa la prossima. Tocca una riga per farla diventare la prossima, usa le
        frecce per riordinare.
      </p>

      <div className="list">
        {state.rotation.map((id, i) => {
          const d = DAY[id];
          const isNext = id === next;
          return (
            <div key={id} style={isNext ? { background: "var(--forza-soft)", outline: "1px solid var(--forza)" } : undefined}>
              <button className="lead" onClick={() => setPos(i)} style={{ background: "none", padding: 0 }}>
                <b>{d.name} — {d.subtitle}</b>
                <small>
                  {isNext ? "prossima · " : ""}{d.items.length} esercizi · {d.minutes}'
                  {d.nordic ? " · vuole 3 giorni dalla partita" : d.legs ? " · gambe" : ""}
                </small>
              </button>
              <button className="btn ghost small" onClick={() => move(i, -1)} aria-label="Sposta su">↑</button>
              <button className="btn ghost small" onClick={() => move(i, 1)} aria-label="Sposta giù">↓</button>
            </div>
          );
        })}
      </div>

      <div className="card">
        <p className="eyebrow">Giorno del calcetto</p>
        <div className="field">
          <select
            value={state.profile.matchDay ?? ""}
            onChange={(e) => update((s) => {
              s.profile.matchDay = e.target.value === "" ? null : Number(e.target.value);
              return s;
            })}
          >
            <option value="">Variabile — lo segno di volta in volta</option>
            {DOW_LABELS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
          </select>
        </div>
        <p className="tiny">
          {inDays === null
            ? "Senza un giorno impostato non posso avvisarti quando una seduta cade troppo vicino alla partita."
            : inDays === 0
              ? "La partita è oggi."
              : `Prossima partita fra ${inDays} ${inDays === 1 ? "giorno" : "giorni"}. Le gambe pesanti non vanno il giorno prima, il Nordic curl vuole tre giorni pieni.`}
        </p>
      </div>

      <div className="card">
        <p className="eyebrow">Fase · settimana {phase.week} di 12</p>
        <h3>{phase.name}</h3>
        <p className="sub">{phase.rule}</p>
        <div className="progbar"><i style={{ width: `${Math.min(100, (phase.week / 12) * 100)}%` }} /></div>
        <p className="tiny">
          {phase.setsCap < 9
            ? `In questa fase le serie sono limitate a ${phase.setsCap} per esercizio.`
            : "Serie piene e doppia progressione attiva."}
          {phase.loadFactor < 1 && ` Carichi al ${Math.round(phase.loadFactor * 100)}% di quelli d'ingresso.`}
        </p>
      </div>

      {DAYS.map((d) => (
        <div className="card" key={d.id}>
          <div className="row between">
            <div>
              <p className="eyebrow">{d.subtitle}</p>
              <h3>{d.name}</h3>
            </div>
            <span className="badge">{d.minutes} min</span>
          </div>
          <div className="list">
            {d.items.map((item) => {
              const ex = EX[item.exId];
              const sug = suggestFor(state, d.id, item);
              return (
                <button key={item.exId + d.id} onClick={() => open({ kind: "exercise", exId: item.exId })}>
                  <div className="lead">
                    <b>{ex.name}</b>
                    <small>
                      {sug.sets}×{item.repsMin === item.repsMax ? item.repsMin : `${item.repsMin}-${item.repsMax}`}
                      {ex.unilateral && " per gamba"}{ex.timed && " sec"}
                    </small>
                  </div>
                  <span className="badge num">{ex.bodyweight ? "corpo libero" : fmt(sug.weight) + " kg"}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="card">
        <p className="eyebrow">Le cinque regole</p>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-2)" }}>
          <li>Mai gambe pesanti il giorno prima del calcetto.</li>
          <li>Il giorno dopo la partita è sempre parte alta.</li>
          <li>La camminata in salita si può mettere ovunque: è recupero attivo.</li>
          <li>Gli intervalli non stanno mai a meno di 24 ore dalle gambe pesanti.</li>
          <li>Un giorno di riposo pieno a settimana. Non negoziabile.</li>
        </ol>
      </div>
    </>
  );
}
