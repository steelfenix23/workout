// Service worker minimale: l'app deve aprirsi anche senza rete (in palestra il segnale
// è quello che è). Nessuna dipendenza, nessun workbox.
//
// Strategia:
//  - navigazioni (l'HTML): network-first con fallback alla cache → aggiornamenti immediati
//    quando c'è rete, app che parte comunque quando non c'è.
//  - asset con hash nel nome (js/css/png): cache-first → istantanei e immutabili.
//  - tutto il resto (es. chiamate a Supabase): non passa dalla cache.

const CACHE = 'workout-v2';
const SCOPE = new URL(self.registration.scope).pathname;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([SCOPE])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase & co. passano diretti

  if (request.mode === 'navigate') {
    // cache: 'no-cache' obbliga a rivalidare con il server invece di fidarsi
    // della cache HTTP. GitHub Pages serve l'HTML con max-age=600, quindi senza
    // questo un aggiornamento appena pubblicato può non comparire per 10 minuti.
    // Costa poco: se non è cambiato nulla il server risponde 304.
    e.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SCOPE, copy));
          return res;
        })
        .catch(() => caches.match(SCOPE).then((r) => r || caches.match(request)))
    );
    return;
  }

  e.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});
