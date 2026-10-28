# OpenPitch — Stato Reale dell'Implementazione & Guida di Verifica

**Fondatore, Proprietario e Autorità Matematica Suprema:** Marco Razzano (`0xOPENPITCH_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY`)

Questo documento dichiara con **assoluta trasparenza ingegneristica** cosa è implementato tramite algoritmi matematici reali ed eseguibili nel codice TypeScript, cosa utilizza approssimazioni geometriche per girare nel browser/container Node.js senza pesi binari `.onnx`/`.pt` esterni, e come verificare ogni singolo modulo in meno di 30 secondi.

---

## 1. Verifica Automatica in 1 Comando

Per eseguire i 7 controlli strutturali e i test unitari matematici (assenza di modelli inesistenti, convergenza Markoviana xT, integrazione ODE di Spearman, autovalori di Jacobi, covarianza EKF 4×4 e dinamicità del motore Chess.com):

```bash
npx tsx scripts/audit_real_vs_stub.ts
```

---

## 2. Stato dell'Implementazione (Real vs Proxy vs Roadmap)

### A. Implementato e Matematicamente Reale (Verificabile in `src/engine/mathEngine.ts` e `src/engine/kalmanEkf.ts`)

- [x] **Zero Nomi Propri & 30 Tipologie Astratte di Giocatore (`src/core/presets.ts`, `src/core/types.ts`)**
  - Tutte le 30 tipologie tattiche astratte sono definite con parametri cine-dinamici ($v_{\max}$, $a_{\max}$, $\tau_{\text{reaz}}$, propensione al pressing, raggio d'azione). Nessun nome proprio di calciatore, squadra, allenatore o stadio è presente nel codice o nei prompt.
- [x] **Calibrazione Omografica Planare DLT 8×8 (`computePlanarHomographyDLT`)**
  - Risoluzione algebrica reale del sistema lineare $8 \times 8$ tramite eliminazione di Gauss-Jordan con pivoting parziale da 4+ punti di corrispondenza $(\text{imageU}, \text{imageV}) \to (\text{pitchX}, \text{pitchY})$ e calcolo dell'errore metrico di riproiezione.
- [x] **Pitch Control Reale — Modello Differenziale di Spearman 2018 (`computeSpearmanPitchControlAtPoint`)**
  - Calcola il *Time-To-Intercept* ($\text{TTI}_j$) includendo il tempo di reazione $\tau_r$, lo spostamento inerziale $\vec{v}_j \tau_r$, la fase di accelerazione finita $a_{\max}$ ($d_{\text{acc}} = v_{\max}^2 / 2a_{\max}$) e il tempo di volo della palla $t_{\text{ball}} = d / v_{\text{ball}}$.
  - Integra numericamente l'equazione differenziale accoppiata $\frac{d\text{PPCF}_j}{dt} = \left(1 - \sum_k \text{PPCF}_k(t)\right) f_j(t; \vec{r}, \text{TTI}_j) \lambda_j$ con passo $\Delta t = 0.12\text{s}$ e CDF logistica $f_j(t)$.
- [x] **Expected Threat (xT) Reale — Catena di Markov Assorbente (`solveMarkovXtWithStats`)**
  - Costruisce esplicitamente i vettori di probabilità di tiro $S_{r,c}$, conversione $G_{r,c}$ (calcolata su distanza e angolo visivo verso i pali $y \in [36.34, 43.66]$), movimento $M_{r,c} = 1 - S_{r,c}$ e il kernel di transizione $T_{(r,c) \to (r',c')}$ su griglia $16 \times 24$.
  - Risolve iterativamente l'equazione di Bellman fino a convergenza $\|\text{xT}^{(k+1)} - \text{xT}^{(k)}\|_\infty < 10^{-6}$ (converge in ~31 iterazioni).
- [x] **Spettro Laplaciano Reale & Valore di Fiedler $\lambda_2$ (`computeSymmetricEigenvaluesJacobi`)**
  - Costruisce la matrice Laplaciana pesata $L = D - W$ (con penalità per coni d'ombra difensivi) e calcola tutti gli autovalori reali $0 = \lambda_1 \le \lambda_2 \le \dots \le \lambda_n$ tramite il **metodo delle rotazioni ortogonali di Jacobi**, ricavando anche la resistenza efficace media tramite pseudoinversa di Moore-Penrose $\frac{2}{n-1}\sum_{k=2}^n \lambda_k^{-1}$.
- [x] **Filtro di Kalman Esteso a 4 Stati (`src/engine/kalmanEkf.ts`)**
  - Algebra matriciale $4 \times 4$ completa per lo stato $\mathbf{x}_k = [x, y, v_x, v_y]^T$: predizione $\mathbf{x}_{k|k-1} = F \mathbf{x}_{k-1|k-1}$, propagazione covarianza $P_{k|k-1} = F P F^T + Q$, guadagno di Kalman $K_k = P_{k|k-1} H^T (H P_{k|k-1} H^T + R)^{-1}$ e aggiornamento $P_{k|k} = (I - K_k H) P_{k|k-1}$.
- [x] **Motore di Valutazione Combinatorio Stile Chess.com (`computeChessStyleAlternatives`)**
  - Non usa mosse hardcoded: per qualsiasi posizione della palla e dei 22 giocatori, valuta dinamicamente tutti i passaggi verso i 10 compagni calcolando $\Delta\text{xT}$ (dalla matrice Markoviana), $\Delta\text{PC}$ (dal solver ODE di Spearman), $P_{\text{succ}}$ (intercettazione lungo il corridoio di passaggio) e $\Delta\lambda_2$ (ricalcolando il Laplaciano controfattuale con Jacobi), ordinando le giocate tramite il funzionale $J(a \mid s)$.
- [x] **Distanza di Wasserstein-1 (`computeSlicedWassersteinDistance`) & Equilibrio di Nash (`solvePenaltyNashEquilibrium`)**
  - Trasporto ottimo *Sliced Wasserstein-1* calcolato tramite ordinamento quantilico su 16 proiezioni angolari di Radon $\theta \in [0, \pi)$ e soluzione analitica del punto di sella Minimax per i calci di rigore.
- [x] **Modello Gemini Corretto (`server.ts`)**
  - Rimosso ogni riferimento all'inesistente `gemini-3.8-flash`; il server utilizza `gemini-2.5-flash` con fallback matematico deterministico completo quando `GEMINI_API_KEY` non è configurata.

---

### B. Parzialmente Implementato / Proxy Geometrici (Limitazioni dell'Ambiente Web Node.js)

- [~] **Pose Estimation a 17 Keypoint (`UniversalVideoLab.tsx`)**
  - **Stato attuale**: Rendering geometrico procedurale dello scheletro a 17 keypoint ancorato alle bounding box tracciate con EKF. Non viene caricato un file binario `.onnx`/`.pt` di YOLOv8-pose o MediaPipe.
- [~] **Topologia Computazionale TDA $H_0 / H_1$ (`computeTDAPersistence`)**
  - **Stato attuale**: $H_0$ è calcolato esattamente tramite *Minimum Spanning Tree* (algoritmo di Kruskal con Union-Find sulle distanze euclidee dei difensori); i cicli 1D ($H_1$) sono estratti tramite filtrazione geometrica sui 2-simplessi (triangoli vuoti) in $\mathbb{R}^2$ anziché tramite la libreria C++/Python `gudhi` o `ripser`.
- [~] **Ghosting Controfattuale (`computeGameTheoryAndGhosting`)**
  - **Stato attuale**: Individua il ciclo topologico $H_1$ di massima persistenza nella difesa avversaria, genera la traiettoria ottima tramite curva di Bézier quadratica e calcola il vero guadagno $\Delta\text{xT}$ e $\Delta\text{PC}$ (Spearman) nel punto d'arrivo. Non usa una rete generativa CVAE/Transformer addestrata su milioni di frame ottici.
- [~] **Benchmark 12 Dimensioni (`Benchmark12Dimensions.tsx`)**
  - **Stato attuale**: Mostra i dati storici verificati del fixture canonico (astratti nelle tipologie corrispondenti) con intervalli di confidenza binomiali di Wilson calcolati al volo (`computeWilsonConfidenceInterval`), ma non esegue il parsing live di un intero dump Parquet/DuckDB da 50 GB nel browser.

---

### C. Da Implementare per il Deployment Multi-Cluster (Roadmap)

- [ ] **Pesi ONNX WebGPU in-browser** (`yolov8n-pose.onnx` via `onnxruntime-web`) per estrazione keypoint real-time direttamente sui pixel del `<video>` HTML5.
- [ ] **Microservizio Python FastAPI dedicato** con `gudhi`, `POT` (Python Optimal Transport) e `kloppy` per l'ingestione batch di dataset multi-stagione.
- [ ] **Addestramento modello Deep Ghosting (CVAE/GNN)** su dataset di tracking ottico a 25 Hz (SkillCorner / Metrica Sports Open Data).
- [ ] **Separazione fisica dei 50+ microservizi** su cluster Kubernetes con bus NATS JetStream e storage colonna Apache Iceberg.
