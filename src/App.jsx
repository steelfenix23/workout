import { useState } from "react";
import Today from "./screens/Today.jsx";
import Program from "./screens/Program.jsx";
import Progress from "./screens/Progress.jsx";
import More from "./screens/More.jsx";
import Session from "./screens/Session.jsx";
import RunLog from "./screens/RunLog.jsx";
import ExerciseSheet from "./components/ExerciseSheet.jsx";

const TABS = [
  { id: "today", label: "Oggi" },
  { id: "program", label: "Scheda" },
  { id: "progress", label: "Progressi" },
  { id: "more", label: "Altro" },
];

export default function App() {
  const [tab, setTab] = useState("today");
  const [sessionId, setSessionId] = useState(null); // seduta in corso, a schermo pieno
  const [runOpen, setRunOpen] = useState(false);
  const [exId, setExId] = useState(null);           // scheda esercizio, sopra a tutto

  const open = (o) => {
    if (o.kind === "session") setSessionId(o.sessionId);
    else if (o.kind === "run") setRunOpen(true);
    else if (o.kind === "exercise") setExId(o.exId);
  };

  const sheet = exId ? <ExerciseSheet exId={exId} onClose={() => setExId(null)} /> : null;

  // Durante una seduta l'app è solo quella: niente tab, niente distrazioni.
  if (sessionId) {
    return (
      <>
        <Session
          sessionId={sessionId}
          onClose={() => setSessionId(null)}
          onExercise={setExId}
        />
        {sheet}
      </>
    );
  }

  return (
    <div className="app">
      <div className="scroll" key={tab}>
        {tab === "today" && <Today open={open} />}
        {tab === "program" && <Program open={open} />}
        {tab === "progress" && <Progress open={open} />}
        {tab === "more" && <More />}
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            <span className="dot" />
            {t.label}
          </button>
        ))}
      </nav>

      {runOpen && <RunLog onClose={() => setRunOpen(false)} />}
      {sheet}
    </div>
  );
}
