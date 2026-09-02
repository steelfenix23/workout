import { useState } from "react";
import { useStore, todayISO } from "../data/store.jsx";
import { EXERCISES, EX } from "../data/program.js";
import { LineChart, BarChart } from "../components/Chart.jsx";
import {
  historyFor, bestE1RM, personalRecords, weekStats, weekBounds, addDays,
  programWeek, currentPhase, sessionVolume, fmt,
} from "../data/logic.js";

export default function Progress({ open }) {
  const [tab, setTab] = useState("forza");
  return (
    <>
      <h1>Progressi</h1>
      <div className="segmented">
        <button aria-pressed={tab === "forza"} onClick={() => setTab("forza")}>Forza</button>
        <button aria-pressed={tab === "corsa"} onClick={() => setTab("corsa")}>Corsa</button>
        <button aria-pressed={tab === "corpo"} onClick={() => setTab("corpo")}>Corpo</button>
      </div>
      {tab === "forza" && <Forza open={open} />}
      {tab === "corsa" && <Corsa />}
      {tab === "corpo" && <Corpo />}
    </>
  );
}

function Forza({ open }) {
  const { state } = useStore();
  const done = state.sessions.filter((s) => s.endedAt);
  const trained = EXERCISES.filter((e) => historyFor(state, e.id).length > 0);
  const [exId, setExId] = useState(trained[0]?.id ?? "panca_piana");

  const history = historyFor(state, exId);
  const points = history.map((h) => ({ y: bestE1RM(h.sets), label: h.date.slice(5).replace("-", "/") }))
                        .filter((p) => p.y > 0);
  const prs = personalRecords(state);

  const month = state.sessions.filter((s) => s.endedAt && s.date >= addDays(todayISO(), -30));
  const prevMonth = state.sessions.filter(
    (s) => s.endedAt && s.date >= addDays(todayISO(), -60) && s.date < addDays(todayISO(), -30)
  );
  const vol = month.reduce((t, s) => t + sessionVolume(s), 0);
  const volPrev = prevMonth.reduce((t, s) => t + sessionVolume(s), 0);
  const delta = volPrev > 0 ? Math.round(((vol - volPrev) / volPrev) * 100) : null;

  return (
    <>
      <div className="stats">
        <div><b className="num">{done.length}</b><small>sedute<br />fatte</small></div>
        <div><b className="num">{prs.length}</b><small>record<br />recenti</small></div>
        <div><b className="num">{delta === null ? "—" : (delta > 0 ? "+" : "") + delta + "%"}</b><small>volume<br />vs 30gg</small></div>
      </div>

      {trained.length === 0 ? (
        <div className="card"><div className="emptyish">Chiudi la prima seduta e qui compaiono i grafici.</div></div>
      ) : (
        <div className="card">
          <p className="eyebrow">Massimale stimato</p>
          <div className="field">
            <select value={exId} onChange={(e) => setExId(e.target.value)}>
              {trained.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <LineChart points={points} unit=" kg" label={EX[exId]?.name} />
          <p className="tiny">
            Stima calcolata dalle serie svolte: serve a vedere la tendenza, non a testare il massimale.
            Una linea piatta per più sessioni è uno stallo — è quello che a maggio è successo al rematore.
          </p>
        </div>
      )}

      {prs.length > 0 && (
        <div className="card">
          <p className="eyebrow">Record recenti</p>
          <div className="list">
            {prs.map((p) => (
              <button key={p.exId} onClick={() => open({ kind: "exercise", exId: p.exId })}>
                <div className="lead">
                  <b>{EX[p.exId]?.name ?? p.exId}</b>
                  <small>{p.date.slice(8)}/{p.date.slice(5, 7)}</small>
                </div>
                <span className="badge forza num">{fmt(p.weight)} × {p.reps}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Corsa() {
  const { state } = useStore();
  const iso = todayISO();
  const phase = currentPhase(state);

  // Ultime 8 settimane di minuti aerobici
  const bars = [];
  for (let i = 7; i >= 0; i--) {
    const ref = addDays(iso, -7 * i);
    const { start, end } = weekBounds(ref);
    const mins = state.runs
      .filter((r) => r.date >= start && r.date <= end)
      .reduce((t, r) => t + (Number(r.minutes) || 0), 0);
    bars.push({ y: mins, label: "S" + programWeek(state, ref) });
  }

  const runs = [...state.runs].sort((a, b) => b.date.localeCompare(a.date));
  const continuous = state.runs.filter((r) => r.type === "facile" || r.type === "lunga");
  const longest = Math.max(0, ...continuous.map((r) => Number(r.km) || 0));
  const totalKm = state.runs.reduce((t, r) => t + (Number(r.km) || 0), 0);
  const week = weekStats(state, iso);

  const paced = continuous
    .filter((r) => r.km > 0 && r.minutes > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ y: Math.round((r.km / (r.minutes / 60)) * 10) / 10, label: r.date.slice(5).replace("-", "/") }));

  return (
    <>
      <div className="stats">
        <div><b className="num">{fmt(Math.round(longest * 10) / 10)}</b><small>km più<br />lunghi</small></div>
        <div><b className="num">{Math.round(week.runMinutes)}</b><small>minuti<br />settimana</small></div>
        <div><b className="num">{Math.round(totalKm)}</b><small>km<br />totali</small></div>
      </div>

      <div className="card">
        <p className="eyebrow">Minuti aerobici a settimana</p>
        <p className="tiny">Obiettivo di questa settimana: {phase.runTarget} minuti.</p>
        <BarChart bars={bars} unit=" min" label="Minuti aerobici" />
      </div>

      {paced.length >= 2 && (
        <div className="card">
          <p className="eyebrow">Velocità nelle corse continue</p>
          <LineChart points={paced} unit=" km/h" color="var(--corsa)" label="Velocità media" />
          <p className="tiny">
            Non deve salire in fretta. Se sale troppo vuol dire che stai correndo forte invece
            che a lungo, ed è l'errore che blocca il motore aerobico.
          </p>
        </div>
      )}

      <div className="card">
        <p className="eyebrow">Ultime uscite</p>
        {runs.length === 0 ? (
          <div className="emptyish">Nessuna corsa registrata.</div>
        ) : (
          <div className="list">
            {runs.slice(0, 12).map((r) => (
              <div key={r.id}>
                <div className="lead">
                  <b>{labelFor(r.type)}</b>
                  <small>{r.date.slice(8)}/{r.date.slice(5, 7)} · {r.minutes} min{r.km ? ` · ${fmt(r.km)} km` : ""}{r.incline ? ` · ${fmt(r.incline)}%` : ""}</small>
                </div>
                {r.km > 0 && r.minutes > 0 && (
                  <span className="badge corsa num">{fmt(Math.round((r.km / (r.minutes / 60)) * 10) / 10)} km/h</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const RUN_LABELS = { salita: "Camminata in salita", facile: "Corsa facile", lunga: "Corsa lunga lenta", intervalli: "Intervalli" };
const labelFor = (t) => RUN_LABELS[t] ?? t;

function Corpo() {
  const { state, update } = useStore();
  const [kg, setKg] = useState("");
  const iso = todayISO();
  const sorted = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const first = sorted[0];

  function save() {
    const v = parseFloat(String(kg).replace(",", "."));
    if (!v || v < 35 || v > 200) return;
    update((s) => {
      s.weights = s.weights.filter((w) => w.date !== iso);
      s.weights.push({ date: iso, kg: v });
      return s;
    });
    setKg("");
  }

  return (
    <>
      <div className="card">
        <p className="eyebrow">Peso di oggi</p>
        <div className="row">
          <input className="fld grow" type="number" inputMode="decimal" step="0.1" value={kg}
                 onChange={(e) => setKg(e.target.value)} placeholder={last ? String(last.kg) : "73"} />
          <button className="btn" onClick={save}>Salva</button>
        </div>
        <p className="tiny">
          Pesati la mattina appena sveglio, sempre nelle stesse condizioni. Un valore alla
          settimana basta: il grasso non cambia da un giorno all'altro, l'acqua sì.
        </p>
      </div>

      {sorted.length >= 2 ? (
        <div className="card">
          <p className="eyebrow">Andamento</p>
          <LineChart
            points={sorted.map((w) => ({ y: w.kg, label: w.date.slice(5).replace("-", "/") }))}
            unit=" kg" label="Peso corporeo"
          />
          <p className="sub">
            Da {fmt(first.kg)} a {fmt(last.kg)} kg ({last.kg >= first.kg ? "+" : ""}
            {fmt(Math.round((last.kg - first.kg) * 10) / 10)} kg)
          </p>
        </div>
      ) : (
        <div className="card"><div className="emptyish">Registra il peso almeno due volte per vedere l'andamento.</div></div>
      )}
    </>
  );
}
