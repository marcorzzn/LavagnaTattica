# LavagnaTattica

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Web%20App-lavagnatattica.pages.dev-0051C8?style=for-the-badge&logo=cloudflare&logoColor=white)](https://lavagnatattica.pages.dev/)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Offline%20First-4A154B?style=flat-square&logo=pwa&logoColor=white)](https://lavagnatattica.pages.dev/)
[![Render](https://img.shields.io/badge/Render-60%20FPS%20rAF-2EA043?style=flat-square)](https://lavagnatattica.pages.dev/)
[![Math Audit](https://img.shields.io/badge/Math%20Audit-15%2F15%20PASS-brightgreen?style=flat-square)](scripts/audit_real_vs_stub.ts)
[![Paper PDF](https://img.shields.io/badge/Paper%20PDF-Manuale%20Tecnico%20Matematico-darkred?style=flat-square&logo=academia)](docs/paper/MANUALE_TECNICO_MATEMATICO.pdf)

### **Lavagna tattica aumentata e Video Match Lab per il calcio contemporaneo**
*Alimentata dal motore matematico e analitico NucleoTattico.*

[🌐 Live Demo](https://lavagnatattica.pages.dev/) •
[📄 Trattato Matematico (PDF)](docs/paper/MANUALE_TECNICO_MATEMATICO.pdf) •
[⚽ Panoramica](#-panoramica) •
[🖥️ Le 3 Aree di Lavoro](#-le-3-aree-di-lavoro) •
[📐 Motore Matematico](#-il-motore-matematico-nucleotattico) •
[🎯 Valutatore Stile Chess.com](#-valutatore-stile-chesscom--fisica-balistica) •
[🧪 Audit Matematico](#-audit-matematico--certificazione) •
[🚀 Avvio Rapido](#-avvio-rapido)

</div>

---

> **Proprietario & Autorità Matematica Suprema:** Marco Razzano (`0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY`)  
> **Trattato Matematico & Manuale Formale:** [`docs/paper/MANUALE_TECNICO_MATEMATICO.pdf`](docs/paper/MANUALE_TECNICO_MATEMATICO.pdf) • [Sorgente LaTeX](docs/paper/MANUALE_TECNICO_MATEMATICO.tex)  
> **Contratto di Trasparenza & Stato dei Moduli:** [`docs/STATE.md`](docs/STATE.md) • [`docs/INVENTORY.md`](docs/INVENTORY.md)  
> **Applicazione Web Online:** [https://lavagnatattica.pages.dev/](https://lavagnatattica.pages.dev/)

---

## ⚽ Panoramica

**LavagnaTattica** è l'omologo di **Chess.com** per l'analisi calcistica moderna: una piattaforma interattiva ad alte prestazioni concepita per match analyst professionisti, allenatori, centri di formazione e appassionati di tattica applicata.

Combina la versatilità di una lavagna 2D a 60 FPS con un **Video Match Lab Human-in-the-Loop** capace di calibrare qualsiasi frame o fermo immagine broadcast tramite omografia planare $8 \times 8$, sovrapporre il Pitch Control probabilistico continuo e valutare ogni scelta di gioco con una barra di valutazione dinamica e badge qualitativi (**Best Move !!**, **Good Move !**, **Inaccuracy ?!**, **Blunder ??**).

---

## 🖥️ Le 3 Aree di Lavoro

L'applicazione è organizzata in tre moduli coesi e privi di frammentazione:

```
┌────────────────────────────────────────────────────────────────────────┐
│                             LAVAGNATATTICA                             │
│                  Architettura a 3 Moduli Specializzati                 │
├────────────────────────────────────────────────────────────────────────┤
│  1. ANALISI VIDEO & MATCH LAB (Cuore Operativo)                        │
│     • Calibrazione Omografica DLT 8x8 con errore riproiezione 0.0m     │
│     • Gestione Dinamica Pedine (0-11 per squadra, ruoli e numeri)     │
│     • Marker Palla dedicato con assegnazione possesso assistita        │
│     • Barra di Valutazione Bicolore Chess.com (Blu vs Rosso)           │
│     • Analisi delle Alternative: Filtrante, Sostegno, Tiro, Conduzione │
│     • Fisica del Tiro con tempo d'intervento portiere (TTI_GK)         │
│     • Rilevamento Dinamico del Fuorigioco sul penultimo difendente     │
│     • Coni d'Ombra Difensivi (Cover Shadows) per passaggi rasoterra    │
│     • Dossier Multi-Frame (Scene Strip) con persistenza totale         │
│     • Esportazione & Re-importazione Progetto completo in JSON         │
├────────────────────────────────────────────────────────────────────────┤
│  2. TEORIA, MAESTRI & LAVAGNA (Sintesi Dottrinale & Studio)            │
│     • 13 Scuole Tattiche (Guardiola, De Zerbi, Sarri, Klopp, Sacchi...)│
│     • Lavagna Tattica 2D con animazione a 60 FPS direttamente integrata│
│     • 3 Livelli di Animazione (Keyframe, Azioni, Balistica 3D ed Easing│
│     • Percorsi Formativi e Quiz Didattici Interattivi                  │
│     • Glossario Tattico Bilingue (Italiano / Inglese)                  │
│     • Registro ADR-Math con governance firmata Marco Razzano           │
├────────────────────────────────────────────────────────────────────────┤
│  3. LAVAGNA LIBERA (Sandbox Tattico a 60 FPS)                          │
│     • Canvas vettoriale 2D fluido con RequestAnimationFrame a 60 FPS   │
│     • Disegno traiettorie, curve di Bézier, coni e zone di ricezione   │
│     • Temi cromatici: Verde Prato & Crema, Cyber Dark, Gesso, Blueprint│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📐 Il Motore Matematico NucleoTattico

Ogni metrica visualizzata da LavagnaTattica è rigorosamente ancorata a formulazioni analitiche verificabili:

1. **Geometria Proiettiva & Calibrazione DLT**:
   Risoluzione con eliminazione di Gauss-Jordan a pivoting parziale della matrice di omografia planare $H \in \text{PGL}(3, \mathbb{R})$ da 4 corrispondenze metriche sul frame, con calcolo analitico dell'inversa $H^{-1}$ per proiettare qualsiasi frame sui $105\text{m} \times 68\text{m}$ del rettangolo di gioco.
2. **Pitch Control Deterministico (Spearman ODE 2018)**:
   Integrazione numerica continua dell'equazione differenziale $dPPCF/dt$ considerando tempo di reazione neuromuscolare $\tau_r = 0.4\text{s}$, spostamento inerziale $\vec{v}\tau_r$, accelerazione finita $a_{\max} = 4.0\text{ m/s}^2$ e tempo di volo balistico della palla $t_{\text{ball}}$.
3. **Expected Threat (xT) su Catena di Markov Assorbente**:
   Griglia $16 \times 24$ celle con matrici di tiro, conversione e transizione. Risoluzione iterativa dell'equazione di Bellman fino a convergenza $\|xT^{(k+1)} - xT^{(k)}\|_\infty < 10^{-6}$.
4. **Teoria Spettrale dei Grafi (Fiedler $\lambda_2$)**:
   Costruzione della matrice Laplaciana pesata $L = D - W$ (con penalizzazione per coni d'ombra difensivi) ed estrazione della connettività algebrica tramite il metodo di Jacobi a rotazioni ortogonali planari.
5. **Filtro di Kalman Esteso (EKF 4×4)**:
   Modello cinematico per vettore di stato $\mathbf{x} = [x, y, v_x, v_y]^T$, propagazione della matrice di covarianza ed eliminazione del rumore di tracciamento.

---

## 🎯 Valutatore Stile Chess.com & Fisica Balistica

Il motore valuta la mossa del portatore di palla confrontando la sua scelta con lo spazio delle alternative possibili secondo un funzionale convesso multi-criterio:

$$J(a \mid s) = w_1 \Delta xT(a) + w_2 P_{\text{success}}(a) - w_3 \text{RiskPenalty}(a)$$

### Regole Tattiche & Vincoli Fisici Implementati:
- **Passaggi Esclusivamente tra Compagni**: Il sistema non propone mai passaggi verso pedine avversarie. Gli avversari agiscono esclusivamente come barriere, intercettori e proiettori di coni d'ombra.
- **Fisica Balistica del Tiro & Limite Umano**:
  - Limite di gittata per il calcio umano parametrato ($d_{\max} \approx 68\text{m}$).
  - Calcolo del tempo di volo della palla $t_{\text{flight}} = d / v_{\text{ball}}$ a confronto con il tempo d'intervento del portiere $TTI_{\text{GK}} = \tau_r + (d_{\text{GK}} / v_{\text{dive}})$.
  - Un tiro da 90 metri con portiere posizionato viene penalizzato a $xG \approx 0.0001$ e classificato tassativamente come **Gaffe / Blunder (??)**.
  - Se il portiere avversario è sorpreso fuori dai pali ($d_{\text{GK}} > 18\text{m}$), il pallonetto a scavalcare viene premiato come **Mossa Vincente (!!)**.
- **Fuorigioco Dinamico**: Calcolo continuo della linea del penultimo difendente. Qualsiasi passaggio verso un compagno oltre la linea determina probabilità di successo zero e assegnazione immediata di **Blunder (??)**.
- **Barra di Valutazione Bicolore**: Ispirata a Chess.com, usa direttamente il colore delle due formazioni (**Blu Squadra A** vs **Rosso Squadra B**) mostrando graficamente chi controlla il match.

---

## 👤 Zero Nomi Propri & 30 Tipologie Astratte

In piena conformità con i principi di astrazione universale, LavagnaTattica non usa nomi di giocatori registrati ma adotta **30 Tipologie Tattiche Astratte**:
- **Costruzione**: Libero Moderno, Portiere Sweeper, Braccetto Aggressivo, Terzino Invertito.
- **Rifinitura**: Mediano Metodista, Mezzala d'Inserimento, Regista Mobile, Trequartista Associativo.
- **Finalizzazione**: Ala Invertita, Centravanti Boa, Seconda Punta di Raccordo, Attaccante di Profondità.

Ciascuna tipologia possiede parametri cine-dinamici misurabili ($v_{\max}$, $a_{\max}$, tempo di reazione neuromuscolare, raggio d'azione, propensione al pressing).

---

## 💾 Dossier Multi-Frame & Esportazione JSON

- **Scene Strip Multi-Frame**: Possibilità di creare molteplici scene all'interno dello stesso progetto (es. *Transizione offensiva al 75'*, *Ripiegamento al 78'*), passando liberamente da una scena all'altra senza alcuna perdita di dati o di stato.
- **Esportazione & Ripristino Progetto (`.json`)**: Salva l'intero dossier (omografie, posizioni pedine, marker palla, annotazioni, frecce) in un unico file `.json` e riaprilo in qualsiasi momento su qualsiasi dispositivo.
- **PWA Offline First**: Funziona completamente offline in assenza di connessione Internet grazie al ServiceWorker e allo storage client-side su IndexedDB.
- **Bilinguismo Nativo**: Supporto completo per Italiano e Inglese con selettore istantaneo in intestazione.

---

## 📚 Trattato Matematico & Manuale Formale (PDF & LaTeX)

Per studiosi, match analyst e sviluppatori che necessitano della formulazione analitica integrale, il progetto include il trattato accademico completo:

- 📄 **[Manuale Tecnico Matematico (PDF)](docs/paper/MANUALE_TECNICO_MATEMATICO.pdf)**: Trattato formale impaginato in formato accademico A4, con equazioni numerate, box di definizioni e teoremi, tabelle cine-dinamiche e spiegazioni divulgative dettagliate.
- 📜 **[Sorgente LaTeX (`.tex`)](docs/paper/MANUALE_TECNICO_MATEMATICO.tex)**: Codice sorgente compilabile con qualsiasi distribuzione TeX (`pdflatex`, `xelatex`, Overleaf).
- 🔄 **Rigenerazione Automatica Lossless**: Il manuale si ricompila in PDF ad ogni evoluzione del codice tramite:
  ```bash
  npm run build:paper
  ```

---

## 🧪 Audit Matematico & Certificazione

Tutti i moduli matematici sono coperti da una suite di test rigorosi che certifica l'assenza di scorciatoie o stub:

```bash
# Esegue Typecheck, Math Audit 15/15 e Build di Produzione
powershell -ExecutionPolicy Bypass -File scripts/pre-build-check.ps1
```

Verifiche coperte dall'audit (`scripts/audit_real_vs_stub.ts`):
- [x] Zero modelli allucinati (integrazione Gemini con fallback deterministico completo)
- [x] Errore medio di riproiezione omografica DLT $= 0.0\text{ m}$
- [x] Conservazione probabilistica Spearman ODE ($P_{\text{home}} + P_{\text{away}} = 1.0000$)
- [x] Convergenza Bellman Markov xT in 37 iterazioni (residuo $< 10^{-6}$)
- [x] Autovalori Laplaciano Jacobi ($\lambda_1 = 0$, $\lambda_2 > 0$)
- [x] Abbattimento covarianza EKF post-misura
- [x] Valutazione Chess.com dinamica con penalità balistica realistica per tiri impossibili
- [x] 7/7 test del motore di animazione a 3 livelli superati con successo

---

## 🚀 Avvio Rapido

### Prerequisiti
- **Node.js** $\ge 20$
- **npm** $\ge 10$

### Installazione Locale
```bash
# 1. Clona il repository
git clone https://github.com/marcorzzn/LavagnaTattica.git
cd LavagnaTattica

# 2. Installa le dipendenze
npm install

# 3. Avvia l'ambiente di sviluppo locale
npm run dev

# 4. Verifica typecheck e audit matematico
npm run lint
npm run audit
```

L'applicazione si aprirà su `http://localhost:3000` (o `http://localhost:5173`).

### Deploy su Cloudflare Pages
L'applicazione è configurata nativamente per essere distribuita su **Cloudflare Pages** ad ogni push su `main`:
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node.js version:** `20`

Consulta [`docs/CLOUDFLARE_DEPLOY.md`](docs/CLOUDFLARE_DEPLOY.md) per la guida dettagliata.

---

## 📄 Licenza

Distribuito sotto licenza **MIT**. Consulta [`LICENSE`](LICENSE) per i dettagli.
