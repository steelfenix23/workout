// Entry usata solo dal test di rendering: monta ogni schermata con uno stato
// finto e restituisce l'HTML prodotto. Serve a intercettare gli errori che
// esplodono solo a runtime e che la build non vede.
import { renderToString } from "react-dom/server";
import { StoreProvider } from "../../src/data/store.jsx";
import Today from "../../src/screens/Today.jsx";
import Program from "../../src/screens/Program.jsx";
import Progress from "../../src/screens/Progress.jsx";
import More from "../../src/screens/More.jsx";
import Session from "../../src/screens/Session.jsx";
import RunLog from "../../src/screens/RunLog.jsx";
import ExerciseSheet from "../../src/components/ExerciseSheet.jsx";

const noop = () => {};

export function render(name, state, props = {}) {
  const Screens = { Today, Program, Progress, More, Session, RunLog, ExerciseSheet };
  const C = Screens[name];
  return renderToString(
    <StoreProvider initialState={state}>
      <C open={noop} onClose={noop} onExercise={noop} {...props} />
    </StoreProvider>
  );
}
