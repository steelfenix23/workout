# Workout

App personale di allenamento. È una **web app**: si apre da Safari e si aggiunge alla
schermata Home dell'iPhone, dove si comporta come un'app nativa (schermo intero, icona
propria, funziona senza rete). Niente App Store, niente Sideloadly, niente certificati
che scadono ogni sette giorni.

**Indirizzo:** https://steelfenix23.github.io/workout/

## Installarla sul telefono

1. Apri l'indirizzo qui sopra con **Safari** (non Chrome: su iOS solo Safari può installare).
2. Tocca **Condividi** → **Aggiungi alla schermata Home**.
3. Aprila dall'icona, non da Safari.

Da quel momento i dati vivono sul telefono e non vengono cancellati: le web app in
schermata Home sono escluse dalla pulizia automatica dello storage che Safari fa dopo
sette giorni di inattività.

## Aggiornarla

`git push` su `main`. GitHub Actions builda e pubblica in circa quaranta secondi;
alla successiva apertura l'app è aggiornata. Nessuna azione manuale.

## Il programma

Scheda "Forza e Fiato": 12 settimane, quattro sedute in **rotazione** (non in calendario),
due o tre sedute di corsa, il calcetto settimanale. Il doppio obiettivo è massa muscolare
e resistenza alla corsa.

La rotazione è il punto: la scheda avanza per posizione, non per giorno della settimana.
Se salti una seduta quella diventa la prossima, quindi nessun gruppo muscolare può essere
trascurato sistematicamente — che è esattamente quello che era successo con le gambe nella
versione precedente dell'app (allenate 3 volte su 18 perché cadevano sempre di giovedì).

Le regole che l'app applica da sola quando la fila slitta:

1. Mai gambe pesanti il giorno prima del calcetto.
2. Il giorno dopo la partita è sempre parte alta.
3. La camminata in salita si può mettere ovunque: è recupero attivo.
4. Gli intervalli non stanno mai a meno di 24 ore dalle gambe pesanti.
5. Un giorno di riposo pieno a settimana.

## Sviluppo

```bash
npm install
npm run dev      # server locale
npm test         # test della logica: progressione, rotazione, regole
npm run build    # build di produzione in dist/
```

Struttura:

```
src/data/program.js     il programma: 19 esercizi, 4 sedute, 12 settimane, tipi di corsa
src/data/logic.js       rotazione, regole del calcetto, doppia progressione  (testato)
src/data/store.jsx      stato dell'app + persistenza su IndexedDB
src/data/sync.js        sincronizzazione opzionale con Supabase
src/data/importLegacy.js  importazione dell'export della vecchia app Expo
src/screens/            Oggi, Sessione, Corsa, Progressi, Scheda, Altro
```

Nessuna dipendenza a runtime oltre a React: niente librerie di stato, di routing,
di grafici o di database.

## Backup su Supabase (facoltativo)

L'app funziona completamente offline e senza account. Supabase serve solo ad avere un
backup e ad aprire gli stessi dati dal PC.

1. Crea un progetto gratuito su supabase.com.
2. Nell'SQL Editor incolla lo schema che trovi nell'app, in **Altro → Mostra lo SQL**.
3. Nell'app, in **Altro**, incolla URL del progetto e chiave `anon`, poi **Sincronizza**.

Le credenziali restano nel telefono e non vengono mai caricate sul server né salvate nel
repository, che è pubblico. La sincronizzazione unisce i dati invece di sovrascriverli:
sedute e corse sono append-only, quindi non si perde nulla lavorando da due dispositivi.

Nota sul piano gratuito: i progetti vengono messi in pausa dopo sette giorni senza
attività sul database. Non è un problema, perché l'app continua a funzionare in locale
e si risincronizza quando il progetto torna attivo.

## Cosa non c'è, di proposito

- **Nessuna notifica.** Niente promemoria, niente push, niente permessi da concedere.
- **Nessun timer di recupero.** Le pause le gestisce chi si allena.
- **Nessun tracciamento alimentare.** L'alimentazione si gestisce fuori dall'app.
