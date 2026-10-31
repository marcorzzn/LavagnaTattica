# LavagnaTattica

**Lavagna tattica aumentata con motore NucleoTattico.**

OpenPitch e OpenZone fusi in un'unica piattaforma: il canvas interattivo client-side ad altissima reattività (60 FPS) incontra la matematica multi-dimensionale dei 6 Pilastri, l'approccio Human-in-the-Loop, l'Evaluation Engine stile Chess.com e il layer dati evoluto.

> **Fondatore, Proprietario & Autorità Matematica Suprema:** Marco Razzano (`0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY`)  
> **Repository:** [https://github.com/marcorzzn/LavagnaTattica](https://github.com/marcorzzn/LavagnaTattica)

---

## 1. Architettura Concettuale: LavagnaTattica & NucleoTattico

- **LavagnaTattica**: la piattaforma e interfaccia unificata per analisti, staff tecnici e accademie (Canvas Tattico interattivo, Video Lab, Benchmark 12 Dimensioni, Governance ADR-Math, Laboratorio Didattico).
- **NucleoTattico**: il motore matematico multi-dimensionale client-side in TypeScript (con estensione scientifica Python), fondato sui 6 Pilastri matematici, 30 Tipologie Astratte di giocatori (regola non negoziabile: Zero Nomi Propri) e il Catalogo Dottrinale dei Maestri Tattici.

---

## 2. Verifica Automatica in 1 Comando

Per eseguire l'audit strutturale e i test matematici sui moduli (assenza di modelli inventati, convergenza Markoviana xT, integrazione ODE di Spearman, autovalori di Jacobi, covarianza EKF 4×4, test del motore di animazione 7/7 e dinamicità del motore Chess.com):

```bash
npx tsx scripts/audit_real_vs_stub.ts
```

Per eseguire la suite di test unitari dell'animazione:

```bash
npx vitest run
```

---

## 3. Stato dell'Implementazione (Real vs Proxy vs Roadmap)

### A. Implementato e Matematicamente Reale (100% Client-Side)

- [x] **Motore di Animazione a 3 Livelli (`src/engine/animationEngine.ts`, `src/hooks/useAnimationPlayback.ts`)**
  - **Livello 1 (Keyframes)**: Ancoraggi temporali per posizioni di tutti i giocatori e palla.
  - **Livello 2 (Azioni Tattiche)**: Passaggi (rasoterra, filtranti, alti con elevazione), tiri a giro, cross, inserimenti e pressing associati tra keyframe.
  - **Livello 3 (Parametri Fisici)**: Velocità ($15\text{--}140\text{ km/h}$), elevazione balistica 3D ($z = 4 \cdot \text{peak} \cdot t(1-t)$ fino a $500\text{ cm}$ con ombra proiettata al suolo), curvatura Bézier quadratica, contatto e durata.
  - Scrubbing fluido a 60 FPS con RequestAnimationFrame, interpolazione smooth `easeInOutCubic` e export/import JSON portabile (`src/lib/export.ts`).
- [x] **Zero Nomi Propri & 30 Tipologie Astratte (`src/core/presets.ts`, `src/core/types.ts`)**
  - Mappatura cine-dinamica ($v_{\max}$, $a_{\max}$, $\tau_{\text{reaz}}$, propensione al pressing, raggio d'azione) su 30 archetipi universali. Nessun nome proprio di calciatori o club.
- [x] **Calibrazione Omografica Planare DLT 8×8 (`computePlanarHomographyDLT`)**
  - Risoluzione algebrica esatta del sistema $8 \times 8$ tramite eliminazione di Gauss-Jordan con pivoting parziale da 4+ punti di corrispondenza $(\text{imageU}, \text{imageV}) \leftrightarrow (\text{pitchX}, \text{pitchY})$ e calcolo analitico dell'inversa $H^{-1}$.
- [x] **Pitch Control Reale — Modello Differenziale di Spearman 2018 (`computeSpearmanPitchControlAtPoint`)**
  - Calcolo del *Time-To-Intercept* ($\text{TTI}_j$) con tempo di reazione fisiologico $\tau_r = 0.4\text{s}$, inerzia $\vec{v}_j \tau_r$, accelerazione finita $a_{\max} = 4.0\text{ m/s}^2$ e tempo di volo palla.
  - Integrazione numerica continua dell'equazione differenziale accoppiata $\frac{d\text{PPCF}_j}{dt} = \left(1 - \sum_k \text{PPCF}_k(t)\right) f_j(t; \vec{r}, \text{TTI}_j) \lambda_j$.
- [x] **Expected Threat (xT) Reale — Catena di Markov Assorbente (`solveMarkovXtWithStats`)**
  - Griglia $16 \times 24$ celle con matrici di tiro $S_{r,c}$, conversione $G_{r,c}$ (angolo visivo e distanza porta) e kernel di transizione $T_{(r,c) \to (r',c')}$. Risoluzione dell'equazione di Bellman fino a convergenza $\|\text{xT}^{(k+1)} - \text{xT}^{(k)}\|_\infty < 10^{-6}$.
- [x] **Spettro Laplaciano Reale & Connettività di Fiedler $\lambda_2$ (`computeSymmetricEigenvaluesJacobi`)**
  - Matrice Laplaciana pesata $L = D - W$ con penalizzazione per coni d'ombra avversari. Diagonalizzazione mediante metodo delle rotazioni ortogonali di Jacobi e calcolo della resistenza efficace media.
- [x] **Filtro di Kalman Esteso a 4 Stati (`src/engine/kalmanEkf.ts`)**
  - Modello cinematico $4 \times 4$ per stato $\mathbf{x}_k = [x, y, v_x, v_y]^T$, propagazione della covarianza d'errore e aggiornamento del guadagno di Kalman.
- [x] **Motore di Valutazione Combinatorio Stile Chess.com (`computeChessStyleAlternatives`)**
  - Valutazione dinamica in tempo reale di tutte le opzioni di passaggio e conduzione con funzionale convesso $J(a \mid s)$, attribuzione simboli qualitativi (**Best Move (!!)**, Good Move (!), Inaccuracy (?!), Mistake (?)) e barra di valutazione [-1, +1].
- [x] **Catalogo Dottrinale delle Strategie Tattiche (`src/core/tacticalStrategiesCatalog.ts`)**
  - 13 scuole tattiche storiche e contemporanee (Klopp, Guardiola, Sarri, De Zerbi, Sacchi, Simeone, Gasperini, Cruyff, Arteta, Bielsa) con keyframe, principi dottrinali e moduli interscambiabili.
- [x] **Temi Cromatici Campo & UI (`src/core/pitchThemes.ts`)**
  - Tema calcistico autentico "Verde Prato & Bianco Crema", Cyber Dark "Notte Tattica", "Lavagna Gesso" e "Blueprint Tattico".

---

### B. Proxy Geometrici Client-Side (In attesa di pipeline pesanti esterne)

- [~] **Pose Estimation 17 Keypoint (`UniversalVideoLab.tsx`)**: Rendering biomeccanico geometrico ancorato a box EKF; migrazione prevista su runtime `onnxruntime-web` (`yolov8n-pose.onnx`).
- [~] **Topologia Computazionale TDA $H_0 / H_1$ (`computeTDAPersistence`)**: Algoritmo di Kruskal su grafi euclidei per $H_0$ e triangolazioni 2D per varchi $H_1$; migrazione target con WebAssembly Gudhi C++.
- [~] **Ghosting Controfattuale (`computeGameTheoryAndGhosting`)**: Generazione traiettorie ottime basata su gradiente spaziale xT e curve Bézier; espansione target con modello generativo CVAE.

---

## 4. Installazione & Avvio Rapido

```bash
# Clona il repository
git clone https://github.com/marcorzzn/LavagnaTattica.git
cd LavagnaTattica

# Installa le dipendenze
npm install

# Avvia l'ambiente di sviluppo locale
npm run dev

# Avvia il server backend con supporto LLM (opzionale)
npm run server
```

L'applicazione sarà accessibile all'indirizzo: `http://localhost:3000` (o `http://localhost:5173`).
