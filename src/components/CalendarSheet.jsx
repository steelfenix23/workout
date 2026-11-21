import { useState } from "react";
import { useStore, todayISO } from "../data/store.jsx";
import { planDays, calendarICS, exportedMap } from "../data/planner.js";

// Portare il piano nel Calendario dell'iPhone.
//
// Dall'app aperta con l'icona sulla Home, aprire il file direttamente (la prima
// versione, 21/11) non faceva niente: iOS lo ignorava in silenzio. Qui ci sono
// due strade, perché da fuori non si può provare quale funzioni sul suo iPhone:
// aprire il file in una finestra a parte, oppure passarlo al foglio Condividi.
// La terza, la mail a se stessi, funziona sempre: Mail riconosce l'allegato.
export default function CalendarSheet({ onClose }) {
  const { state, update } = useStore();
  const iso = todayISO();
  const [esito, setEsito] = useState(null);

  const plan = planDays(state, { from: iso });
  const calendar = state.settings.calendar;
  const count = Object.keys(exportedMap(plan)).length;

  function file() {
    const seq = (calendar?.seq || 0) + 1;
    const ics = calendarICS(plan, calendar?.exported || {}, seq);
    update((s) => {
      s.settings.calendar = { exported: exportedMap(plan), seq, at: iso };
      return s;
    });
    return new File([ics], "allenamenti.ics", { type: "text/calendar" });
  }

  function apri() {
    const url = URL.createObjectURL(file());
    const w = window.open(url, "_blank");
    setEsito(w ? "aperto" : "bloccato");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function condividi() {
    const f = file();
    if (!navigator.canShare?.({ files: [f] })) { setEsito("nocondividi"); return; }
    try {
      await navigator.share({ files: [f], title: "Allenamenti" });
      setEsito("condiviso");
    } catch {
      setEsito(null); // annullato da lui: nessun messaggio
    }
  }

  return (
    <div className="sheet" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <button className="close" onClick={onClose} aria-label="Chiudi">×</button>
        <h2>Metti il piano nel Calendario</h2>
        <p className="sub">
          {count} sedute delle prossime due settimane, ognuna con due promemoria: la sera prima
          alle 21 e il giorno stesso (17:30, nei festivi alle 9).
        </p>

        <button className="btn wide" onClick={apri}>1 · Apri nel Calendario</button>
        <p className="tiny">Deve comparire l'elenco delle sedute con <b>Aggiungi tutti</b>.</p>

        <button className="btn ghost wide" onClick={condividi}>2 · Condividi il file</button>
        <p className="tiny">
          Se il primo non fa niente. Nel foglio che si apre scegli <b>Calendario</b>; se non c'è,
          scegli <b>Mail</b> e mandalo a te stesso: aprendo l'allegato compare <b>Aggiungi tutti</b>.
        </p>

        {esito === "nocondividi" && (
          <p className="tiny" style={{ color: "var(--forza)" }}>
            Questo iPhone non permette di condividere il file dall'app. Prova il pulsante 1.
          </p>
        )}

        <div className="card flat">
          <p className="tiny">
            Se una seduta si sposta (un viaggio, una partita, una seduta saltata), la schermata Oggi
            ti avvisa: torna qui e rifallo. Le sedute spostate vengono segnate come annullate.
          </p>
        </div>
      </div>
    </div>
  );
}
