import { useState } from "react";
import { todayISO } from "../data/store.jsx";
import { dow } from "../data/logic.js";
import {
  WEEK, COLAZIONE, PANCAKE, merenda, dayTotals,
  SWAP_CARBO, SWAP_PROT, COMBO, RULES, OFFICE,
} from "../data/diet.js";

const SIGLE = ["L", "M", "M", "G", "V", "S", "D"];

// Solo consultazione: niente da compilare, niente da spuntare. Si apre sul
// giorno di oggi perché la domanda è quasi sempre "cosa mangio adesso".
export default function Diet() {
  const oggi = dow(todayISO());
  const [i, setI] = useState(oggi);
  const d = WEEK[i];
  const tot = dayTotals(d);
  const m = merenda(d.affettato);

  return (
    <>
      <header>
        <p className="eyebrow">{i === oggi ? "Oggi" : "Scheda alimentare"}</p>
        <h1>{d.day}</h1>
        <p className="sub num">{tot.kcal} kcal · {Math.round(tot.prot)} g di proteine</p>
      </header>

      <div className="daypick" role="tablist" aria-label="Giorno della settimana">
        {SIGLE.map((s, k) => (
          <button
            key={k} role="tab" aria-selected={k === i}
            className={k === oggi ? "is-today" : ""}
            onClick={() => setI(k)}
          >
            {s}
          </button>
        ))}
      </div>

      <Meal m={COLAZIONE} />
      <Meal m={PANCAKE} />
      <Meal m={d.pranzo} label="Pranzo" main alt={d.alt} />

      <div className="card">
        <MealHead label={m.label} kcal={m.kcal} />
        <p className="meal-what">{m.what}</p>
        <p className="tiny">{m.note}</p>
        <details>
          <summary>Cambia la merenda</summary>
          <p className="tiny">Una riga per colonna: ogni voce vale quanto le altre.</p>
          <div className="swaps">
            <div>
              <p className="eyebrow">Al posto del pane</p>
              {SWAP_CARBO.map(([a, b]) => <p key={a}><span>{a}</span><b className="num">{b}</b></p>)}
            </div>
            <div>
              <p className="eyebrow">Al posto dell'affettato</p>
              {SWAP_PROT.map(([a, b]) => <p key={a}><span>{a}</span><b className="num">{b}</b></p>)}
            </div>
          </div>
          <p className="eyebrow" style={{ marginTop: 12 }}>Già pronte</p>
          <div className="list">
            {COMBO.map((c) => (
              <div key={c.name}>
                <div className="lead"><b>{c.name}</b><small>{c.what}</small></div>
                <span className="badge">{c.where}</span>
              </div>
            ))}
          </div>
        </details>
      </div>

      <Meal m={d.cena} label="Cena" main />

      <details className="card">
        <summary>Le regole</summary>
        <div className="list">
          {RULES.map((r) => (
            <div key={r.title}><div className="lead"><b>{r.title}</b><small>{r.body}</small></div></div>
          ))}
        </div>
      </details>

      <details className="card">
        <summary>Il giorno in ufficio</summary>
        <ol className="office">
          {OFFICE.map((t) => <li key={t}>{t}</li>)}
        </ol>
      </details>

      <p className="tiny center" style={{ paddingBottom: 8 }}>
        Il controllo è la bilancia: una volta a settimana, in Progressi → Corpo.
      </p>
    </>
  );
}

function MealHead({ label, kcal }) {
  return (
    <div className="row between">
      <p className="eyebrow" style={{ margin: 0 }}>{label}</p>
      <span className="tiny num">{kcal} kcal</span>
    </div>
  );
}

function Meal({ m, label, main, alt }) {
  return (
    <div className={"card" + (main ? " hero" : "")}>
      <MealHead label={label || m.label} kcal={m.kcal} />
      {m.name && <h2>{m.name}</h2>}
      <p className="meal-what">{m.what}</p>
      {m.note && <p className="tiny">{m.note}</p>}
      {alt && (
        <p className="meal-alt">
          <b>oppure</b> {alt.name}
          <small>{alt.what}</small>
        </p>
      )}
      {m.alt && <p className="tiny">{m.alt}</p>}
    </div>
  );
}
