import { useState } from "react";
import { useStore, todayISO } from "../data/store.jsx";
import { dow, addDays } from "../data/logic.js";

const GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const label = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return `${GIORNI[dow(iso)]} ${d.getDate()}/${d.getMonth() + 1}`;
};

// I giorni fuori casa: il piano non ci mette sedute e sposta le altre prima e dopo.
// L'app non può sapere quando viaggi: si segna qui, anche settimane prima.
export default function AwaySheet({ onClose }) {
  const { state, update } = useStore();
  const oggi = todayISO();
  const [from, setFrom] = useState(oggi);
  const [to, setTo] = useState(addDays(oggi, 2));

  const away = [...(state.away || [])].sort((a, b) => a.from.localeCompare(b.from));
  const future = away.filter((a) => a.to >= oggi);
  const valid = from && to && to >= from;

  const add = () => update((s) => {
    s.away = [...(s.away || []), { from, to }];
    return s;
  });
  const remove = (a) => update((s) => {
    s.away = (s.away || []).filter((x) => !(x.from === a.from && x.to === a.to));
    return s;
  });

  return (
    <div className="sheet" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <button className="close" onClick={onClose} aria-label="Chiudi">×</button>
        <h2>Sono via</h2>
        <p className="sub">
          Segna i giorni in cui sei fuori casa. Il piano non ci mette sedute e sposta le altre
          prima e dopo il viaggio. Poi aggiorna il calendario dalla schermata Oggi.
        </p>

        <div className="row">
          <div className="field grow">
            <label htmlFor="awayfrom">Dal</label>
            <input id="awayfrom" type="date" value={from}
                   onChange={(e) => { const v = e.target.value || oggi; setFrom(v); if (to < v) setTo(v); }} />
          </div>
          <div className="field grow">
            <label htmlFor="awayto">Al</label>
            <input id="awayto" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value || from)} />
          </div>
        </div>
        <button className="btn wide" disabled={!valid} onClick={add}>Segna il viaggio</button>

        {future.length > 0 && (
          <div className="card flat">
            <p className="eyebrow">In programma</p>
            <div className="list">
              {future.map((a) => (
                <div key={a.from + a.to}>
                  <div className="lead">
                    <b>{a.from === a.to ? label(a.from) : `${label(a.from)} → ${label(a.to)}`}</b>
                  </div>
                  <button className="btn danger small" onClick={() => remove(a)}>Elimina</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
