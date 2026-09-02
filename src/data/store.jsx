// Stato dell'app: un unico documento JSON tenuto in memoria e persistito su
// IndexedDB a ogni modifica (con debounce). I dati di un anno di allenamenti
// stanno in poche centinaia di kB: una struttura relazionale qui sarebbe
// complessità pura senza alcun vantaggio.

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { ROTATION } from "./program.js";
import { todayISO } from "./dates.js";

export { todayISO };

const DB_NAME = "workout";
const STORE = "state";
const KEY = "doc";
export const SCHEMA_VERSION = 1;

// ─── IndexedDB, il minimo indispensabile ─────────────────────────────────────

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Stato iniziale ──────────────────────────────────────────────────────────

export function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: {
      startedAt: todayISO(),
      heightCm: 185,
      matchDay: null,        // 0=lun … 6=dom, null = variabile
      summerMode: false,
      weightStep: 1.5,       // scatto dei manubri regolabili
    },
    rotation: [...ROTATION],
    rotationPos: 0,          // la "fila": indice della prossima seduta
    sessions: [],            // { id, dayId, date, startedAt, endedAt, sets:[], note }
    runs: [],                // { id, date, type, minutes, km, incline, effort, note }
    weights: [],             // { date, kg }
    matches: [],             // { date }  — il calcetto
    legacy: [],              // storico importato dalla vecchia app, sola lettura
    settings: { supabaseUrl: "", supabaseKey: "", lastSync: null },
  };
}

function migrate(doc) {
  const base = emptyState();
  if (!doc || typeof doc !== "object") return base;
  // Merge difensivo: se in futuro aggiungo campi, i documenti vecchi non esplodono.
  const out = {
    ...base,
    ...doc,
    profile: { ...base.profile, ...(doc.profile || {}) },
    settings: { ...base.settings, ...(doc.settings || {}) },
  };
  for (const k of ["sessions", "runs", "weights", "matches", "legacy", "rotation"]) {
    if (!Array.isArray(out[k])) out[k] = base[k];
  }
  if (typeof out.rotationPos !== "number") out.rotationPos = 0;
  out.schemaVersion = SCHEMA_VERSION;
  return out;
}

// ─── Provider ────────────────────────────────────────────────────────────────

const Ctx = createContext(null);

export function StoreProvider({ children, initialState = null }) {
  const [state, setState] = useState(initialState);
  const timer = useRef(null);

  useEffect(() => {
    if (initialState) return;           // stato iniettato: usato dai test
    let alive = true;
    idbGet()
      .then((doc) => alive && setState(migrate(doc)))
      .catch(() => alive && setState(emptyState()));
    return () => { alive = false; };
  }, [initialState]);

  // Persistenza con debounce: mentre logghi una serie non scrivo a ogni tasto.
  useEffect(() => {
    if (!state || initialState) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { idbPut(state).catch(() => {}); }, 250);
    return () => clearTimeout(timer.current);
  }, [state, initialState]);

  const update = useCallback((fn) => {
    setState((prev) => (prev ? fn(structuredClone(prev)) ?? prev : prev));
  }, []);

  // Scrittura immediata: usata prima di chiudere l'app o al termine di una seduta.
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (state) await idbPut(state);
  }, [state]);

  if (!state) return null;
  return <Ctx.Provider value={{ state, update, flush, setState }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore fuori dallo StoreProvider");
  return ctx;
}

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
