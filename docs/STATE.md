# Stato del progetto

Aggiornato al 10 novembre 2026.

## In uso

| Funzione | Stato | Note |
|---|---|---|
| Calibrazione del fermo immagine | In uso, con limiti | Omografia da 4 punti, coperta da test. Con 4 punti l'errore sui punti stessi è zero per costruzione, quindi non misura la qualità della calibrazione. Con più di 4 punti usa solo i primi 4; con punti allineati non segnala il problema. |
| Pedine, palla, frecce della giocata, corse | In uso | Sono annotazioni: nessun calcolo le usa. |
| Ruoli delle pedine | In uso solo i nomi | 30 etichette senza fonte e senza statistiche. Il database dei ruoli verrà ricostruito con voci verificate, più numerose e più precise. |
| Linea del fuorigioco | Aiuto visivo | Linea del penultimo difendente, automatica o trascinabile a mano. Non produce giudizi sull'azione. Non ancora coperta da test. |
| Lavagna animata | In uso come illustrazione | Interpolazione tra passi disegnati a mano, coperta da test. Non è una simulazione fisica. |
| Lavagna libera | In uso | Strumento di disegno. |
| Scene multiple, esportazione e importazione JSON | In uso | Non ancora coperte da test. |
| Schieramenti iniziali per modulo | In uso | Disposizioni illustrative, senza fonte. |

## In costruzione

**NucleoTattico**, il motore di analisi delle situazioni di gioco. Fino ad allora la vista Analisi non dà voti alle
giocate. Le scelte di modello verranno motivate nel [manuale](paper/).

## Ritirati (novembre 2026)

| Funzione | Perché |
|---|---|
| Voti alle giocate, alternative suggerite, barra di valutazione | Tre valutatori diversi tra loro e dalla formula del manuale, con pesi e costanti scelti a mano. |
| Mappa del controllo dello spazio, Expected Threat (xT), connettività di Fiedler, filtro di Kalman, topologia, equilibrio di Nash, distanza di Wasserstein | Parametri non stimati da dati reali, oppure legame con il valore della situazione mai verificato. |
| Simulazione animata nella vista Analisi | Durava sempre 2,5 secondi e portava tutti a destinazione nello stesso istante, qualunque fosse la distanza. |
| Movimenti suggeriti, valutazione delle corse, assetto difensivo, riconoscimento di modulo e di schema | Regole scritte a mano, non verificate. |
| Pipeline di visione artificiale e posa a 17 punti | Simulate: non leggevano i pixel del video. |
| Vista Teoria: schemi dei maestri, lezioni e quiz, glossario, registro ADR, benchmark su 26 gol | Contenuti senza fonte; l'origine dei dati del benchmark non è nota. |
| Selettore di lingua | Traduceva solo tre etichette: il resto dell'app era solo in italiano. |
| Chat con Gemini e server Express | Usavano il motore ritirato; l'app pubblicata su Cloudflare non aveva comunque un server. |
| Audit «15/15» | Conteneva controlli veri per costruzione e non falliva mai. È sostituito dai test. |

Il codice ritirato resta recuperabile dalla cronologia git (commit `9396adf` e precedenti).

## Verifiche

- `npm run check` esegue typecheck, 37 test automatici (Vitest) e build.
- Lo stesso controllo gira su GitHub a ogni push su `main` e a ogni pull request.

## Problemi noti

- Mancano le icone dell'app installabile dichiarate nel manifesto: `pwa-192x192.png`, `pwa-512x512.png`, `favicon.ico`.
- `npm audit` segnala 6 vulnerabilità (2 basse, 4 moderate), tutte negli strumenti che generano la versione
  installabile durante la build (`vite-plugin-pwa` e le sue dipendenze), non nel codice che arriva al browser.
- Le coordinate del campo usano il sistema 120 × 80, non i metri.
