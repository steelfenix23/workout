import { useState } from "react";
import { useStore, todayISO, newId } from "../data/store.jsx";
import { RUN_TYPES, RUN_TYPE } from "../data/program.js";
import { currentPhase, weekStats, fmt } from "../data/logic.js";

const EFFORT = [
  { id: "facile", label: "Facile" },
  { id: "giusta", label: "Giusta" },
  { id: "dura", label: "Dura" },
];

export default function RunLog({ onClose }) {
  const { state, update } = useStore();
  const [type, setType] = useState("salita");
  const [minutes, setMinutes] = useState("");
  const [km, setKm] = useState("");
  const [incline, setIncline] = useState("");
  const [effort, setEffort] = useState("giusta");

  const iso = todayISO();
  const phase = currentPhase(state);
  const week = weekStats(state, iso);
  const t = RUN_TYPE[type];

  const min = Number(minutes) || 0;
  const dist = Number(km) || 0;
  const speed = min > 0 && dist > 0 ? (dist / (min / 60)) : 0;
  const paceSec = dist > 0 ? (min * 60) / dist : 0;

  const verdict = buildVerdict(type, speed, effort, dist, state);
  const canSave = min > 0;

  function save() {
    update((s) => {
      s.runs.push({
        id: newId(), date: iso, type,
        minutes: min, km: dist,
        incline: Number(incline) || 0,
        effort,
      });
      return s;
    });
    onClose();
  }

  return (
    <div className="sheet" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <button className="close" onClick={onClose} aria-label="Chiudi">×</button>
        <h2>Registra corsa</h2>

        <div className="chips">
          {RUN_TYPES.map((r) => (
            <button key={r.id} className="chip aer" aria-pressed={type === r.id} onClick={() => setType(r.id)}>
              {r.short}
            </button>
          ))}
        </div>

        <div className="card flat">
          <p className="eyebrow">{t.label} · {t.speed} · pendenza {t.incline}</p>
          <p style={{ fontSize: 13.5 }}>{t.hint}</p>
        </div>

        <div className="grid2">
          <div className="field">
            <label htmlFor="min">Durata (min)</label>
            <input id="min" className="num" type="number" inputMode="numeric" value={minutes}
                   onChange={(e) => setMinutes(e.target.value)} placeholder="30" />
          </div>
          <div className="field">
            <label htmlFor="km">Distanza (km)</label>
            <input id="km" className="num" type="number" inputMode="decimal" step="0.1" value={km}
                   onChange={(e) => setKm(e.target.value)} placeholder="4,0" />
          </div>
          <div className="field">
            <label htmlFor="inc">Pendenza (%)</label>
            <input id="inc" className="num" type="number" inputMode="decimal" step="0.5" value={incline}
                   onChange={(e) => setIncline(e.target.value)} placeholder="1" />
          </div>
          <div className="field">
            <label>Velocità media</label>
            <input className="num" value={speed ? fmt(Math.round(speed * 10) / 10) + " km/h" : "—"} readOnly />
          </div>
        </div>

        <div className="field">
          <label>Come è andata</label>
          <div className="chips">
            {EFFORT.map((e) => (
              <button key={e.id} className="chip aer" aria-pressed={effort === e.id} onClick={() => setEffort(e.id)}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {verdict && (
          <div className="card aer">
            {paceSec > 0 && <p className="eyebrow">Passo {paceLabel(paceSec)} al km</p>}
            <p style={{ fontSize: 14 }}>{verdict}</p>
          </div>
        )}

        <div className="card">
          <p className="eyebrow">Questa settimana</p>
          <h3 className="num">
            {Math.round(week.runMinutes + min)}{" "}
            <span className="sub" style={{ fontWeight: 600 }}>di {phase.runTarget} minuti</span>
          </h3>
          <div className="progbar aer">
            <i style={{ width: `${Math.min(100, ((week.runMinutes + min) / phase.runTarget) * 100)}%` }} />
          </div>
        </div>

        <button className="btn aer wide" disabled={!canSave} onClick={save}>Salva</button>
      </div>
    </div>
  );
}

function paceLabel(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Il coaching della schermata: dice se quella corsa è caduta nella fascia utile.
 * L'errore che vogliamo intercettare è sempre lo stesso — andare troppo forte.
 */
function buildVerdict(type, speed, effort, km, state) {
  if (!speed && type !== "salita") return null;

  if (type === "salita") {
    return effort === "dura"
      ? "In salita l'andatura giusta è quella in cui respiri pesante ma cammini a lungo. Se è stata dura, abbassa la pendenza di un paio di punti la prossima volta."
      : "Questa è la seduta che costruisce il motore senza consumare le gambe. Puoi metterla anche il giorno dopo lo squat.";
  }

  if (type === "intervalli") {
    return "Sui 400 conta il recupero: 90 secondi camminando, poi si riparte. Se l'ultima ripetuta è molto più lenta della prima, hai iniziato troppo forte.";
  }

  if (effort === "dura" || speed > 9) {
    return "Sei andato troppo forte. Nelle corse facili e lunghe devi riuscire a dire una frase intera senza spezzare il fiato: se non ci riesci, quel giorno non stai allenando il motore, lo stai prosciugando. Prova 1 km/h più piano.";
  }

  const best = Math.max(0, ...state.runs.filter((r) => r.type === type).map((r) => Number(r.km) || 0));
  if (km > best && km > 0) {
    return "Sei nella fascia giusta, e questa è la distanza più lunga che hai coperto con questa seduta. È esattamente così che si arriva ai 5 km.";
  }
  return "Sei nella fascia giusta: se riuscivi a parlare, questa è la corsa che serve. La lentezza adesso è la velocità di dopo.";
}
