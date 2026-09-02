import { useState } from "react";
import { useStore, todayISO, emptyState } from "../data/store.jsx";
import { isConfigured, syncNow, SETUP_SQL } from "../data/sync.js";
import { importLegacy } from "../data/importLegacy.js";
import { currentPhase } from "../data/logic.js";

export default function More() {
  const { state, update, setState, flush } = useStore();
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const phase = currentPhase(state);

  const setProfile = (patch) => update((s) => { Object.assign(s.profile, patch); return s; });
  const setSettings = (patch) => update((s) => { Object.assign(s.settings, patch); return s; });

  function exportJson() {
    const blob = JSON.stringify({ ...state, settings: { lastSync: state.settings.lastSync } }, null, 2);
    navigator.clipboard?.writeText(blob).then(
      () => setMsg({ ok: true, text: "Copiato negli appunti. Incollalo dove vuoi conservarlo." }),
      () => setMsg({ ok: false, text: "Non sono riuscito a copiare. Usa il sync su Supabase." })
    );
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { state: next, report } = importLegacy(state, text);
      setState(next);
      setMsg({
        ok: true,
        text: `Importate ${report.imported} sessioni: ${report.mapped} serie agganciate agli esercizi attuali, ${report.legacy} tenute come storico, ${report.weights} pesi.`,
      });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
    e.target.value = "";
  }

  async function doSync() {
    setBusy(true);
    setMsg(null);
    try {
      const next = await syncNow(state);
      setState(next);
      await flush();
      setMsg({ ok: true, text: "Sincronizzato." });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
    setBusy(false);
  }

  function reset() {
    if (!confirm("Cancello TUTTI i dati locali: sedute, corse, pesi. Sicuro?")) return;
    if (!confirm("Ultima conferma. Non si torna indietro.")) return;
    setState({ ...emptyState(), settings: state.settings });
    setMsg({ ok: true, text: "Dati cancellati." });
  }

  return (
    <>
      <h1>Altro</h1>

      {msg && (
        <div className="card" style={{ borderColor: msg.ok ? "var(--corsa)" : "var(--danger)" }}>
          <p style={{ fontSize: 14 }}>{msg.text}</p>
        </div>
      )}

      <div className="card">
        <p className="eyebrow">Il programma</p>
        <div className="field">
          <label htmlFor="start">Iniziato il</label>
          <input id="start" type="date" value={state.profile.startedAt}
                 onChange={(e) => setProfile({ startedAt: e.target.value || todayISO() })} />
        </div>
        <p className="tiny">
          Da questa data l'app calcola in che settimana sei: adesso è la {phase.week}ª,
          fase «{phase.name}». Se hai iniziato prima, correggila.
        </p>
        <div className="field">
          <label htmlFor="step">Scatto dei manubri (kg)</label>
          <input id="step" className="num" type="number" step="0.5" value={state.profile.weightStep}
                 onChange={(e) => setProfile({ weightStep: Number(e.target.value) || 1.5 })} />
        </div>
      </div>

      <div className="card">
        <p className="eyebrow">Variante estiva</p>
        <div className="row between">
          <div className="grow">
            <h3>{state.profile.summerMode ? "Attiva" : "Spenta"}</h3>
            <p className="tiny">
              Sedute più corte e corsa spostata al mattino: da accendere a giugno, quando il
              caldo diventa il problema, invece di sparire per due mesi.
            </p>
          </div>
          <button className="btn small" onClick={() => setProfile({ summerMode: !state.profile.summerMode })}>
            {state.profile.summerMode ? "Spegni" : "Accendi"}
          </button>
        </div>
      </div>

      <div className="card">
        <p className="eyebrow">Backup e sincronizzazione</p>
        <p className="tiny">
          L'app funziona benissimo senza. Supabase serve solo per avere un backup e per aprire
          gli stessi dati dal PC. Le credenziali restano su questo telefono e non finiscono nel
          repository, che è pubblico.
        </p>
        <div className="field">
          <label htmlFor="url">URL del progetto Supabase</label>
          <input id="url" type="url" placeholder="https://xxxx.supabase.co" value={state.settings.supabaseUrl}
                 onChange={(e) => setSettings({ supabaseUrl: e.target.value.trim() })} />
        </div>
        <div className="field">
          <label htmlFor="key">Chiave anon</label>
          <input id="key" type="password" placeholder="eyJhbGciOi…" value={state.settings.supabaseKey}
                 onChange={(e) => setSettings({ supabaseKey: e.target.value.trim() })} />
        </div>
        <button className="btn wide" disabled={!isConfigured(state.settings) || busy} onClick={doSync}>
          {busy ? "Sincronizzo…" : "Sincronizza adesso"}
        </button>
        {state.settings.lastSync && (
          <p className="tiny">Ultimo sync: {new Date(state.settings.lastSync).toLocaleString("it-IT")}</p>
        )}
        <button className="btn ghost small" onClick={() => setShowSql(!showSql)}>
          {showSql ? "Nascondi" : "Mostra"} lo SQL da incollare in Supabase
        </button>
        {showSql && (
          <pre style={{ fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.5, overflowX: "auto",
                        background: "var(--surface-2)", padding: 10, borderRadius: 8, margin: 0 }}>{SETUP_SQL}</pre>
        )}
      </div>

      <div className="card">
        <p className="eyebrow">Dati</p>
        <button className="btn ghost wide" onClick={exportJson}>Copia tutti i dati negli appunti</button>
        <label className="btn ghost wide" style={{ display: "flex" }}>
          Importa l'export della vecchia app
          <input type="file" accept="application/json,.json,.txt" onChange={onFile} style={{ display: "none" }} />
        </label>
        <p className="tiny">
          Gli esercizi rimasti in scheda vengono agganciati e contano per progressione e record.
          Goblet squat, croci, curl classico, alzate frontali e crunch restano come storico ma non
          guidano i carichi: confrontarli con gli esercizi nuovi darebbe suggerimenti sbagliati.
        </p>
      </div>

      <div className="card">
        <p className="eyebrow">Zona pericolosa</p>
        <button className="btn danger wide" onClick={reset}>Cancella tutti i dati</button>
      </div>

      <p className="tiny center" style={{ paddingBottom: 8 }}>
        Workout · dati sul telefono, nessun account, nessuna notifica.
      </p>
    </>
  );
}
