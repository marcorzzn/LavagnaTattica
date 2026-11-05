# STATE — LavagnaTattica / NucleoTattico

**Versione:** 0.2.0-ENTERPRISE  
**Data:** 5 novembre 2026  
**Commit:** Head post-refactor  
**Autorità Matematica Suprema:** Marco Razzano (`0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY`)  
**Deployment Live:** [https://lavagnatattica.pages.dev/](https://lavagnatattica.pages.dev/)

---

## Mappa onesta dei moduli e delle capacità

| Modulo / Capacità | Stato | Note Tecniche |
|---|---|---|
| **Tre Viste Canoniche** (`lavagna`, `video`, `teoria`) | ✅ reale | Navigazione unificata 3-Zone senza frammentazione (Costruisci, Verifichi, Capisci) |
| **Bilinguismo Architetturale (IT / EN)** | ✅ reale | `i18next` + `react-i18next` con persistenza `localStorage`, switcher header e namespace |
| **Glossario Tecnico Bilingue** (50+ voci) | ✅ reale | Formule KaTeX, definizioni IT/EN, tassonomia, citazioni accademiche (Spearman, Bellman, Buldú) |
| **Botoniera Tagging Pad Bidirezionale** | ✅ reale | Modello `TacticalTag` condiviso: tag video → scenario lavagna e lavagna → tag video |
| **PWA Offline & Service Worker** | ✅ reale | `virtual:pwa-register` attivo in `main.tsx`, asset precache, standalone manifest |
| **Orchestrator Client-Side (Zero Server Dep)** | ✅ reale | Valutazione 6 pilastri e generazione tool trace in browser, offline-ready, server.ts dev-only |
| **Benchmark 12 Dimensioni & ADR-Math-004** | ✅ corretto | **Allineato a 26 gol reali** (22 con dettaglio tiro/piede, 20 assist + 4 rigori + 2 non assistiti) |
| **DLT 8×8 omografia planare** | ✅ reale | Errore medio riproiezione 0px sui 4 punti di calibrazione, inversa $H^{-1}$ esatta |
| **Spearman ODE pitch control** | ✅ reale | $P_{\text{home}} + P_{\text{away}} = 1.0000$, integrazione numerica continua $dPPCF/dt$ |
| **Markov xT Bellman** | ✅ reale | Residuo $< 10^{-6}$, 37 iterazioni, griglia $16 \times 24$ |
| **Jacobi Fiedler $\lambda_2$** | ✅ reale | Autovalori ortogonali, Fiedler $\lambda_2 = 1.0000$ su test 4×4 |
| **Kalman EKF 4×4** | ✅ reale | $\text{Tr}(P)$ $4.6 \to 3.06$, abbattimento incertezza cinematico |
| **Valutazione Stile Chess.com** | ✅ reale | Punteggio composito $J(a \mid s)$, Best Move (!!), Top-3 alternative dinamiche |
| **Animation Engine 3 livelli** | ✅ reale | Keyframes, azioni balistiche Bézier/parabole 3D, interpolazione continua |
| **Human-in-the-Loop Frame Simulator** | ✅ reale | $P_{\text{succ}}$ $49.3\% \to 86\%$ spostando il difensore di $+3.5\text{m}$ |
| **30 archetipi astratti** | ✅ reale | Zero nomi propri, parametri cine-dinamici ($v_{\max}$, $a_{\max}$, $\tau_{\text{reaz}}$) in drawer e teoria |
| **13 maestri dottrinali** | ✅ reale | Catalogo tattico completo con assetti, keyframe e moduli iniziali |
| **Pipeline CV 9 stadi** | ✅ reale | ByteTrack a 2 stadi, CIELAB K-Means, Chamfer matching, soft-assignment |
| **Logging Locale Privacy-First** | ✅ reale | IndexedDB `lavagnatattica-logs-db` con export JSON diagnostico, zero tracker terzi |
| **Cloudflare Pages Routing** | ✅ reale | `public/_redirects` (`/* /index.html 200`) e `public/_headers` (cache immutabile) |
| **Pose estimation 17 keypoint** | ⚠️ proxy | Euristica geometrico-trigonometrica su box EKF, non inferenza neurale `.onnx` |
| **TDA $H_0 / H_1$** | ⚠️ proxy | Kruskal MST + 2-simplessi su triangoli vuoti, non libreria C++ `gudhi` |
| **Ghosting Trajectory** | ⚠️ proxy | Curve di Bézier su gradiente di xT, non rete neurale CVAE |
| **nucleo-py (Backend Python)** | ❌ non attivo | Il motore gira al 100% client-side in TypeScript ad altissima efficienza |
| **Tauri Desktop Executable** | ⏸️ in pausa | Web app e PWA sigillate e verificate prima di lanciare `src-tauri` |
