# Workout — contesto per Claude

App personale di allenamento di **Daniele** (PWA, React + Vite, GitHub Pages) e il suo
programma "Forza e Fiato". Questo file è la memoria del progetto: leggilo tutto prima di
rispondere, e **aggiornalo** quando emerge qualcosa di nuovo (una preferenza, un checkpoint,
un vincolo). Rispondi sempre in italiano. Daniele lavora spesso dal telefono: risposte
leggibili su schermo piccolo, tabelle brevi.

## Daniele

- 185 cm, ~28 anni. Peso: 72,7 kg a inizio settembre 2026 → 74,2 il 27/9.
- Si allena **solo in casa**: manubri regolabili 4-32 kg (scatti da 1,5 kg), panca regolabile,
  sbarra, parallele, giubbotto zavorra fino a 20 kg, tapis roulant con inclinazione.
- Orari: feriali 19-20, festivi mattina. Sonno 8-10 h, stress da lavoro 7-8/10. Nessun infortunio.
- **Obiettivo doppio:** massa muscolare + fiato per il **calcetto settimanale** (cambia giorno:
  mar/mer/gio). A settembre 1 km a 9-10 km/h era il suo limite.
- Non aveva mai allenato le gambe. Preferisce **tante sedute brevi** (limite 60 min, meglio meno).
- **Si è fermato a luglio per il caldo** (casa senza climatizzatore): a giugno attivare la
  variante estiva, non lasciarlo sparire.

## Preferenze ferme

- **Nessun timer di recupero** tra le serie, mai: le pause le gestisce lui.
- **Nessuna notifica** di alcun tipo nell'app.
- **Dieta nell'app solo in lettura** (scheda Dieta). Mai tracciamento pasti, conteggi, spunte.
- Ogni esercizio proposto ha un **link video**: URL di *ricerca* YouTube, non video singoli.
  Ha rinunciato ai video incorporati: "ormai ho imparato gli esercizi".
- **Chiedi prima di proporre piatti o esercizi che non ha confermato** di conoscere o mangiare.
- Preferisce domande chiuse a scelta multipla per le decisioni.

## Programma "Forza e Fiato" (dal 2026-09-04)

- 4 sedute in **rotazione** (non calendario): Upper A, Lower A, Upper B, Lower B. Se salta,
  la seduta resta la prossima. 12 settimane in fasi: riadattamento (1-2), costruzione (3-4),
  progressione (5-8), **scarico (9)**, consolidamento (10-12). Doppia progressione.
- Il **Nordic curl** non è praticabile (appoggio sotto il tapis scomodo): sostituito dal
  **leg curl con manubrio**. La definizione del Nordic resta in `program.js`.
- Corsa: camminata in salita (parte dal 4%, sale di 1 punto ogni 2 settimane), corsa facile
  e lunga **alternate corsa/camminata** nelle prime settimane. Le intensità iniziali erano troppo
  alte e sono state abbassate dopo i suoi dati.
- Regole calcetto: niente gambe pesanti il giorno prima **né il giorno stesso**; dopo la
  partita parte alta; seduta femorali ≥3 giorni dalla partita. Le partite si registrano **con
  la data, anche in anticipo**: l'app non deduce più il giorno della settimana.

## Alimentazione

Documento: `docs/scheda-alimentare.html` ("Le Calorie Mancanti"), pubblicato anche come
artifact. La versione nell'app è `src/data/diet.js`. **Devono restare identiche**: un test
inchioda i totali giornalieri dell'app a quelli del documento.

- Il problema storico: mangiava **~1830 kcal** contro ~3200 necessarie. Non mangia male,
  mangia poco. A metà settembre il peso era fermo perché **saltava la colazione**; sistemata
  quella, +1,5 kg in 9 giorni (glicogeno/acqua). Poi la salita deve essere ~0,15-0,25 kg/sett.
- **Non mangia:** frutta fresca, banana, burro d'arachidi, formaggi stagionati, ceci.
  Legumi solo come pasta e fagioli / riso e lenticchie. **Non ha proteine in polvere.**
- **Conta la forma, non l'ingrediente:** tonno solo nell'insalata di riso; carne a pranzo solo
  come ragù (hamburger nel sugo); mozzarella e fior di latte sì; pesce spada sì (max 1 volta
  ogni 2-3 settimane, mercurio).
- Colazione: avena nel latte intero + mandorle + miele, oppure piadina con fior di latte e
  pomodoro **senza latte** (non il martedì: sera di bufala).
- Merenda: pane o piadina + fior di latte o stracchino, zero preparazione. **Bocciati:** carne
  avanzata/"cuoci di più la sera", carne fredda nel panino, uova sode, ricotta, frullato.
- **Salumi al massimo 1 volta a settimana** (merenda del martedì). Uova ≤4 al giorno.
- Martedì sera mozzarella di bufala; sabato sera pizza (margherita, niente crudo di default).
- Giorno in ufficio: ristorante, ordina primo + secondo + pane.

## Andamento

I dati arrivano **incollando l'export JSON** dell'app (Altro → Copia tutti i dati). Salvali in
un file e falli girare dentro `src/data/logic.js` (`suggestFor`, `historyFor`, `nextRun`…)
invece di leggerli a occhio.

- **27/9 (sett. 4):** 11 sedute, quasi tutto al massimo del range. Panca 14,5×10×3, military
  7×12×3, front squat e stacco rumeno 8,5 (carichi gambe d'ingresso molto bassi), rematore 10.
  Trazioni erano bloccate a 3/3/3 per un range 3-3 (corretto a 3-6). **Corsa punto debole:**
  1 uscita in 2 settimane contro 5-6 previste. Sedute 50-55 min.
- **25/10 (sett. 8):** 21 sedute in 7 settimane (~3/sett. contro 4). Pesi su: panca 17,5×10×4,
  trazioni 5/5/4/4/3, front squat 10×10×4, military 10. **Le sedute si accorciano dalla coda:**
  ottobre Lower B ridotta a soli bulgarian (19/10), leg curl fermo dal 29/9, laterali e
  rematore saltati in Upper A. Upper A dura ~52 min contro 40 previsti. **Corsa: 5 uscite su ~20,
  nessuna dal 27/9 al 23/10, zero intervalli.** Peso 75,4 (+0,3 kg/sett., ok). Rematore fermo a
  10 kg da 5 settimane: va al massimo in entrambe le sedute ma Upper A (3 serie) e Upper B
  (4 serie) si annullano a vicenda in `suggestFor`. Partite registrate solo fino al 14/10.
- Stima fisico: FFMI ~17,5-19 (media non allenato). Obiettivo realistico: FFMI ~20 a 12 mesi
  (79-80 kg), ~21 a 2 anni. Fra 9-12 mesi i manubri da 32 kg diventano il limite → valutare
  una palestra.

## Tecnica

- `npm test` (node --test) e `npm run build`. Node 20.
- Push su `main` → GitHub Actions esegue test e build e pubblica su
  https://steelfenix23.github.io/workout/ in ~1 minuto. **Se i test falliscono non pubblica.**
- Dopo ogni push verifica che il workflow sia verde e che il bundle online coincida con la build.
- Account GitHub giusto: **steelfenix23** (esiste anche `danielesiciliano01`, non usarlo).
- `src/data/program.js` programma ed esercizi · `logic.js` rotazione, regole, progressione
  (testato) · `diet.js` dieta · `store.jsx` stato su IndexedDB · `screens/` le schermate.
- **Attenzione ai test con date fisse:** la fase dipende dalla data di oggi, e due volte un test
  con data scritta a mano ha cominciato a fallire da solo bloccando il deploy. Usa `todayISO()`.
- I dati dell'utente vivono **solo nel suo telefono** (IndexedDB): non sono nel repository.
