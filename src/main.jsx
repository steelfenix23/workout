import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { StoreProvider } from "./data/store.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>
);

// Service worker: l'app deve aprirsi anche senza rete.
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch(() => {});
  });
}
