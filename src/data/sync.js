// Sync opzionale su Supabase. Nessuna libreria: sono due chiamate REST.
//
// L'app funziona al 100% senza. Supabase serve solo da backup e per aprire gli
// stessi dati dal PC. Le credenziali si inseriscono nella schermata Altro e
// restano nel telefono: non finiscono mai nel repository, che è pubblico.
//
// Tabella attesa (lo SQL è nella schermata Altro):
//   create table workout_state (
//     id text primary key,
//     doc jsonb not null,
//     updated_at timestamptz not null default now()
//   );

const ROW_ID = "daniele";

function endpoint(url) {
  return url.replace(/\/+$/, "") + "/rest/v1/workout_state";
}

function headers(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
}

export function isConfigured(settings) {
  return Boolean(settings?.supabaseUrl && settings?.supabaseKey);
}

export async function pull({ supabaseUrl, supabaseKey }) {
  const res = await fetch(`${endpoint(supabaseUrl)}?id=eq.${ROW_ID}&select=doc,updated_at`, {
    headers: headers(supabaseKey),
  });
  if (!res.ok) throw new Error(`Lettura fallita (${res.status})`);
  const rows = await res.json();
  return rows[0] ?? null;
}

export async function push({ supabaseUrl, supabaseKey }, doc) {
  const body = JSON.stringify([{ id: ROW_ID, doc, updated_at: new Date().toISOString() }]);
  const res = await fetch(endpoint(supabaseUrl), {
    method: "POST",
    headers: headers(supabaseKey, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body,
  });
  if (!res.ok) throw new Error(`Scrittura fallita (${res.status}) — ${await res.text()}`);
}

/**
 * Unisce locale e remoto invece di far vincere uno dei due: gli allenamenti sono
 * append-only, quindi l'unione per id non perde mai niente. Per le impostazioni
 * (profilo, rotazione) vince il documento aggiornato più di recente.
 */
export function merge(local, remote, remoteUpdatedAt) {
  if (!remote) return local;
  const out = structuredClone(local);

  const byId = (arr, key = "id") => new Map((arr || []).map((x) => [x[key], x]));

  for (const [field, key] of [["sessions", "id"], ["runs", "id"], ["weights", "date"], ["matches", "date"], ["legacy", "id"]]) {
    const m = byId(out[field], key);
    for (const item of remote[field] || []) {
      if (!m.has(item[key])) m.set(item[key], item);
    }
    out[field] = [...m.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  const localTime = local.settings?.lastSync ? Date.parse(local.settings.lastSync) : 0;
  const remoteTime = remoteUpdatedAt ? Date.parse(remoteUpdatedAt) : 0;
  if (remoteTime > localTime) {
    out.profile = { ...out.profile, ...(remote.profile || {}) };
    if (Array.isArray(remote.rotation) && remote.rotation.length) out.rotation = remote.rotation;
    if (typeof remote.rotationPos === "number") out.rotationPos = remote.rotationPos;
  }
  return out;
}

export async function syncNow(state) {
  const s = state.settings;
  if (!isConfigured(s)) throw new Error("Supabase non configurato.");
  const row = await pull(s);
  const merged = merge(state, row?.doc ?? null, row?.updated_at ?? null);
  const toPush = { ...merged, settings: { ...merged.settings, lastSync: new Date().toISOString() } };
  await push(s, stripSecrets(toPush));
  return toPush;
}

/** Le credenziali non vengono mai caricate sul server. */
function stripSecrets(doc) {
  const out = structuredClone(doc);
  out.settings = { lastSync: out.settings?.lastSync ?? null };
  return out;
}

export const SETUP_SQL = `create table if not exists workout_state (
  id         text primary key,
  doc        jsonb not null,
  updated_at timestamptz not null default now()
);

alter table workout_state enable row level security;

create policy "solo la mia riga" on workout_state
  for all
  using  (id = 'daniele')
  with check (id = 'daniele');`;
