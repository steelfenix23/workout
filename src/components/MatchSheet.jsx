import { useState } from "react";
import { useStore, todayISO } from "../data/store.jsx";
import { dow } from "../data/logic.js";

const GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
const label = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return `${GIORNI[dow(iso)]} ${d.getDate()}/${d.getMonth() + 1}`;
};

// Il calcetto cambia giorno: si registra con la data, anche in anticipo.
// Una partita futura è quello che fa scattare le regole sulle gambe.
export default function MatchSheet({ onClose }) {
  const { state, update } = useStore();
  const oggi = todayISO();
  const [date, setDate] = useState(oggi);

  const matches = [...state.matches].sort((a, b) => b.date.localeCompare(a.date));
  const future = matches.filter((m) => m.date > oggi).reverse();
  const past = matches.filter((m) => m.date <= oggi).slice(0, 6);
  const exists = state.matches.some((m) => m.date === date);

  const add = () => update((s) => {
    if (!s.matches.some((m) => m.date === date)) s.matches.push({ date });
    return s;
  });
  const remove = (d) => update((s) => { s.matches = s.matches.filter((m) => m.date !== d); return s; });

  const Row = ({ m }) => (
    <div>
      <div className="lead"><b>{label(m.date)}</b>{m.date === oggi && <small>oggi</small>}</div>
      <button className="btn danger small" onClick={() => remove(m.date)}>Elimina</button>
    </div>
  );

  return (
    <div className="sheet" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <button className="close" onClick={onClose} aria-label="Chiudi">×</button>
        <h2>Calcetto</h2>
        <p className="sub">
          Registra la partita col suo giorno, anche in anticipo: se sai che giovedì giochi,
          segnalo adesso e l'app terrà le gambe pesanti lontane da quel giorno.
        </p>

        <div className="field">
          <label htmlFor="matchdate">Giorno della partita</label>
          <input id="matchdate" type="date" value={date} onChange={(e) => setDate(e.target.value || oggi)} />
        </div>
        <button className="btn wide" disabled={exists} onClick={add}>
          {exists ? "Già registrata" : date > oggi ? "Segna la prossima partita" : "Registra la partita"}
        </button>

        {future.length > 0 && (
          <div className="card flat">
            <p className="eyebrow">In programma</p>
            <div className="list">{future.map((m) => <Row key={m.date} m={m} />)}</div>
          </div>
        )}

        {past.length > 0 && (
          <div className="card">
            <p className="eyebrow">Giocate</p>
            <div className="list">{past.map((m) => <Row key={m.date} m={m} />)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
