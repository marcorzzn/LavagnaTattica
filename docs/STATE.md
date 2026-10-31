# STATE — LavagnaTattica / NucleoTattico

**Versione:** 0.1.0  
**Data:** 31 ottobre 2026  
**Commit:** 09a5339  
**Autorità Matematica Suprema:** Marco Razzano (`0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY`)  

## Mappa onesta dei moduli

| Modulo | Stato | Note |
|---|---|---|
| DLT 8×8 omografia | ✅ reale | Errore riproiezione 0m sui 4 punti di calibrazione |
| Spearman ODE pitch control | ✅ reale | $P_{\text{home}} + P_{\text{away}} = 1.0000$, $dPPCF/dt$ numerico continuo |
| Markov xT Bellman | ✅ reale | Residuo $< 10^{-6}$, 37 iterazioni, griglia $16 \times 24$ |
| Jacobi Fiedler | ✅ reale | Autovalori ortogonali, Fiedler $\lambda_2 = 1.0000$ su test 4×4 |
| Kalman EKF 4×4 | ✅ reale | $\text{Tr}(P)$ $4.6 \to 3.06$, abbattimento incertezza cinematico |
| Valutazione Chess.com | ✅ reale | Best move dinamico non hardcoded in base allo stato |
| Animation Engine 3 livelli | ✅ reale | 7/7 test matematici passati (keyframe + azioni + elevazione 3D) |
| Human-in-the-Loop | ✅ reale | $P_{\text{succ}}$ $49.3\% \to 86\%$ spostando il difensore di $+3.5\text{m}$ |
| 30 archetipi astratti | ✅ reale | Zero nomi propri, parametri cine-dinamici completi |
| 13 maestri dottrinali | ✅ reale | Catalogo tattico completo con keyframes e moduli |
| Pipeline CV 9 stadi | ✅ reale | ByteTrack a 2 stadi, CIELAB K-Means, Chamfer matching, soft-assignment |
| Pose estimation 17 keypoint | ⚠️ proxy | Euristica geometrico-trigonometrica su box EKF, non `.onnx` |
| TDA $H_0 / H_1$ | ⚠️ proxy | Kruskal MST + 2-simplessi su triangoli vuoti, non C++ `gudhi` |
| Ghosting | ⚠️ proxy | Curve di Bézier su gradiente xT, non rete neurale generativa CVAE |
| Benchmark 12 dimensioni | ⚠️ da correggere | Dichiara 48 gol nel testo ma mostra 26 righe (da allineare separatamente) |
| nucleo-py (Python engine) | ❌ mancante | Solo blueprint / roadmap architetturale |
| Tauri build | ❌ mancante | Da inizializzare con `src-tauri` |
| Persistenza IndexedDB | ❌ mancante | `idb.ts` presente ma salvataggio automatico non ancora completamente cablato alla UI |
| Export PNG/GIF | ❌ mancante | JSON e WebM presenti via `export.ts`, export raster statico da integrare |
| Community screen | ❌ mancante | Schermata solo menzionata nel blueprint, non presente nel menu |
