// Gli obiettivi concordati con Daniele il 21/11/2026: pochi, con una scadenza, e
// calcolati dai dati che registra già. Niente da compilare a mano, niente misure
// (vita, foto: non le vuole). Un obiettivo raggiunto resta raggiunto, con la data.
//
// I carichi stanno sulla griglia dei suoi manubri (4 kg + scatti da 1,5): 26 e 20
// non si possono caricare, per questo a maggio ci sono 26,5 e 20,5.

export const GOAL_GROUPS = [
  { id: "blocco2", title: "Blocco 2", from: "2026-11-27", until: "2027-01-07" },
  { id: "maggio", title: "Fine maggio 2027", from: "2026-11-27", until: "2027-05-31" },
];

// kind "lift":   carico × ripetizioni. allSets: tutte le serie della seduta (almeno
//                minSets, 3 di default); altrimenti basta una serie. Negli esercizi a
//                corpo libero il carico è la zavorra.
// kind "weight": media delle ultime tre pesate.
// base:          da dove si parte, serve solo alla barra di avanzamento.
export const GOALS = [
  { id: "b2_panca", group: "blocco2", kind: "lift", exId: "panca_piana", weight: 22, reps: 8, allSets: true, base: { weight: 19, reps: 10 } },
  { id: "b2_rematore", group: "blocco2", kind: "lift", exId: "rematore", weight: 14.5, reps: 8, allSets: true, base: { weight: 11.5, reps: 10 } },
  { id: "b2_military", group: "blocco2", kind: "lift", exId: "military_press", weight: 11.5, reps: 10, allSets: true, base: { weight: 10, reps: 6 } },
  { id: "b2_trazioni", group: "blocco2", kind: "lift", exId: "trazioni", weight: 0, reps: 6, allSets: true, base: { weight: 0, reps: 4 } },
  { id: "b2_front", group: "blocco2", kind: "lift", exId: "front_squat", weight: 14.5, reps: 8, allSets: true, base: { weight: 11.5, reps: 10 } },
  { id: "b2_peso", group: "blocco2", kind: "weight", kg: 76.5, base: 74.9 },

  { id: "m_panca", group: "maggio", kind: "lift", exId: "panca_piana", weight: 26.5, reps: 8, allSets: true, base: { weight: 19, reps: 10 } },
  { id: "m_rematore", group: "maggio", kind: "lift", exId: "rematore", weight: 19, reps: 8, allSets: true, base: { weight: 11.5, reps: 10 } },
  { id: "m_trazioni", group: "maggio", kind: "lift", exId: "trazioni", weight: 0, reps: 10, allSets: false, base: { weight: 0, reps: 6 } },
  { id: "m_dips", group: "maggio", kind: "lift", exId: "dips", weight: 10, reps: 8, allSets: false, base: { weight: 0, reps: 10 } },
  { id: "m_front", group: "maggio", kind: "lift", exId: "front_squat", weight: 20.5, reps: 8, allSets: true, base: { weight: 11.5, reps: 10 } },
  { id: "m_peso", group: "maggio", kind: "weight", kg: 79, base: 74.9 },
];
