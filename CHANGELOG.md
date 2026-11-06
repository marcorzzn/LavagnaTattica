# Changelog

Tutte le modifiche degne di nota a questo progetto saranno documentate in questo file.
Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/).

## [0.2.0] - 2026-11-06

### Added
- **Trattato Matematico & Manuale Formale**: Documento accademico completo sia in sorgente LaTeX (`docs/paper/MANUALE_TECNICO_MATEMATICO.tex`) sia compilato in PDF ad alta fedeltà (`docs/paper/MANUALE_TECNICO_MATEMATICO.pdf`, 217.7 KB) con pipeline automatizzata `npm run build:paper`.
- **Video Match Lab & Calibrazione DLT 8x8**: Calibrazione prospettica $H \in \text{PGL}(3, \mathbb{R})$ da fermo immagine broadcast con errore medio di riproiezione nullo ($0.0\text{m}$) e simulatore What-If Human-in-the-Loop.
- **Pedine Dinamiche**: Gestione libera da 0 a 11 giocatori per squadra con attribuzione di ruolo (30 archetipi) e numero di maglia (senza obbligo di 22 giocatori, portieri e terzini fuori campo liberamente gestibili).
- **Marker Palla Dedicato & Possesso Assistito**: Posizionamento esplicito della sfera e calcolo automatico del portatore di palla.
- **Valutazione Chess.com & Barra Bicolore Dinamica**: Barra di valutazione a colori reali delle due squadre (Blu Squadra A vs Rosso Squadra B) con calcolo delle migliori mosse (**Best Move !!**, **Good Move !**, **Inaccuracy ?!**, **Blunder ??**).
- **Fisica Balistica del Tiro & Meccanica del Portiere**: Limite biologico umano (< 68m), calcolo del tempo di volo vs tempo di reazione/tuffo del portiere ($TTI_{\text{GK}}$), blunder detection su conclusioni impossibili da 80m e riconoscimento del pallonetto su portiere fuori dai pali.
- **Fuorigioco Dinamico**: Rilevamento automatico dell'iperpiano del penultimo difendente avversario e penalizzazione immediata a Blunder se il ricevitore è oltre la linea al momento del passaggio.
- **Passaggi Solo tra Compagni**: Spazio delle alternative filtrato rigorosamente sui compagni di squadra (avversari trattati solo come ostacoli, intercettori e proiettori di coni d'ombra).
- **Dossier Multi-Frame & Gestione Scene**: Scene strip persistente con passaggio fluido tra frame senza perdita di dati o calibrazioni.
- **Esportazione & Re-importazione Progetto**: Salvataggio e ripristino completo del dossier in formato portabile `.json`.
- **Integrazione Lavagna in Teoria**: Schemi dei 13 Maestri con visualizzazione 2D e animazione a 60 FPS direttamente fruibile nella scheda didattica.
- **PWA Offline First**: ServiceWorker con precache e storage IndexedDB per funzionamento completo senza rete.

### Changed
- Rinomina del progetto in **LavagnaTattica** e motore in **NucleoTattico**.
- Attribuzione sobria e trasparente del progetto a **Marco Razzano** con riconoscimento dei modelli di intelligenza artificiale impiegati: **Google Gemini 2.5 Flash** e **Gemini 2.5 Pro** su piattaforma agentica **Google Antigravity**.
- Audit matematico pre-build ampliato a 15/15 verifiche passate con successo.

## [0.1.0] - 2026-10-31

### Added
- Prima versione strutturale con motore di animazione a 3 livelli, DLT basilare e supporto bilingue (IT/EN).
