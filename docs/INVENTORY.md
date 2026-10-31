# INVENTORY — LavagnaTattica / NucleoTattico

**Data:** 31 ottobre 2026  
**Commit di riferimento:** `758b582` (aggiornato a pre-Tauri cleanup)  
**Autorità Matematica Suprema:** Marco Razzano (`0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY`)  
**Repo:** [https://github.com/marcorzzn/LavagnaTattica](https://github.com/marcorzzn/LavagnaTattica)  

---

## 1. Identità del Progetto

- **Progetto & UI**: LavagnaTattica
- **Motore Matematico**: NucleoTattico
- **Schermata Principale**: Lavagna Tattica (Canvas operativo multi-dimensionale)
- **Licenza Codice**: MIT
- **Stato**: Pre-alpha (`0.1.0`)

---

## 2. Stack Tecnologico

- **Frontend Core**: React 19 (`19.0.1`) + TypeScript (`7.0.2` / TS 5.x)
- **Bundler & Build Tool**: Vite (`^8.3.0` / v8.3.5)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite` `^4.3.3`) + Lucide Icons (`^0.546.0`)
- **State Management**: Zustand (`^5.0.3`)
- **Grafica & Spazio**: SVG Canvas nativo reattivo a 60 FPS con RequestAnimationFrame (`TacticalPitchCanvas.tsx`)
- **Server / Backend Proxy**: Express (`^4.21.2`) + Google Gen AI SDK (`@google/genai` `^2.4.0`)
- **Storage Locale Client**: IndexedDB (`idb` `^8.0.2`)
- **Testing & Esecuzione**: Vitest + `tsx` (`^4.21.0`)

---

## 3. File Tracciati (Totale: 56)

Elenco completo dei 56 file tracciati da Git:

```text
.env.example
.gitignore
CHANGELOG.md
README.md
docs/ARCHIVE/BLUEPRINT-v2-superseded.md
docs/INVENTORY.md
docs/STATE.md
index.html
metadata.json
package-lock.json
package.json
prompts/explain-board.v1.md
prompts/fact-check.v1.md
prompts/prompt-to-board.v1.md
prompts/suggest-variants.v1.md
scripts/audit_real_vs_stub.ts
scripts/pre-build-check.ps1
scripts/pre-build-check.sh
server.ts
src/App.tsx
src/components/benchmark/Benchmark12Dimensions.tsx
src/components/chat/OrchestratorPanel.tsx
src/components/educational/EducationalAndKnowledge.tsx
src/components/educational/GlossaryTaxonomy.tsx
src/components/educational/TacticalLearningLab.tsx
src/components/governance/GovernanceAndArchetypes.tsx
src/components/studio/ActionEditor.tsx
src/components/studio/EditorToolbar.tsx
src/components/studio/TacticalPitchCanvas.tsx
src/components/studio/TacticalStudioWorkspace.tsx
src/components/studio/TimelineBar.tsx
src/components/video/UniversalVideoLab.tsx
src/core/formationPresets.ts
src/core/pitchThemes.ts
src/core/presets.ts
src/core/tacticalGlossary.ts
src/core/tacticalStrategiesCatalog.ts
src/core/types.ts
src/engine/animationEngine.test.ts
src/engine/animationEngine.ts
src/engine/coordinateAdapter.ts
src/engine/cvRolePipeline.ts
src/engine/humanInTheLoopEngine.ts
src/engine/kalmanEkf.ts
src/engine/mathEngine.ts
src/hooks/useAnimationPlayback.ts
src/index.css
src/lib/export.ts
src/lib/idb.ts
src/main.tsx
src/stores/historyStore.ts
src/stores/selectionStore.ts
src/stores/studioStore.ts
src/stores/viewportStore.ts
tsconfig.json
vite.config.ts
```

---

## 4. Metriche del Codice & Chiarimento Conteggi

Per evitare ambiguità, documentiamo con precisione le metriche per perimetro:

| Perimetro | File | Righe di Codice | Note |
|---|---|---|---|
| **Totale TypeScript/TSX del Repo** | **37 file** | **16.544 righe** | Include `src/` (34 file) + `server.ts` (546 righe) + `scripts/audit_real_vs_stub.ts` (265 righe) + `vite.config.ts` (14 righe) |
| **Audit Matematico (`audit_real_vs_stub.ts`)** | **36 file** | **16.279 righe** | Scansiona l'intero codebase escludendo lo script di audit stesso |
| **Solo Applicazione Client (`src/`)** | **34 file** | **15.719 righe** | Esclusivo codice UI, motori matematici, store e cataloghi client-side |
| **Test Unitari Animazione** | 1 file | 93 righe | `src/engine/animationEngine.test.ts` (7/7 pass) |
| **Documentazione Markdown** | 4 file | ~1.800 righe | `README.md`, `CHANGELOG.md`, `STATE.md`, `INVENTORY.md` |

---

## 5. Moduli Matematici Reali (100% Client-Side)

1. **Omografia Planare DLT 8×8 + RANSAC**: `src/engine/mathEngine.ts` (errore riproiezione 0m)
2. **Pitch Control Deterministico (Spearman ODE 2018)**: `src/engine/mathEngine.ts` (integrazione $dPPCF/dt$ continua)
3. **Expected Threat (xT) su Catena di Markov Assorbente**: `src/engine/mathEngine.ts` (Value Iteration di Bellman su griglia $16 \times 24$, residuo $< 10^{-6}$)
4. **Spettro Laplaciano & Connettività di Fiedler $\lambda_2$**: `src/engine/mathEngine.ts` (rotazioni ortogonali di Jacobi su $L = D - W$)
5. **Filtro di Kalman Esteso Balistico 4×4**: `src/engine/kalmanEkf.ts` (stato $[x, y, v_x, v_y]^T$, propagazione covarianza ed eliminazione rumore)
6. **Valutazione Composita Stile Chess.com**: `src/engine/mathEngine.ts` (funzionale convesso $J(a \mid s)$, ranking dinamico e mosse `!!`, `!`, `?!`, `?`)
7. **Motore di Animazione a 3 Livelli**: `src/engine/animationEngine.ts` (Keyframe discreti + Azioni esplicite + Traiettorie Bézier quadratiche ed elevazione balistica 3D $z$, 60 FPS con rAF in `src/hooks/useAnimationPlayback.ts`)
8. **Human-in-the-Loop Frame Simulator**: `src/engine/humanInTheLoopEngine.ts`, `src/components/video/UniversalVideoLab.tsx` (modifica interattiva e ricalcolo balistico $P_{\text{succ}}$ da $49.3\%$ a $86\%$)
9. **Catalogo 30 Tipologie Astratte di Giocatori**: `src/core/presets.ts`, `src/core/types.ts` (Zero Nomi Propri, parametri cine-dinamici)
10. **Catalogo Dottrinale dei 13 Maestri**: `src/core/tacticalStrategiesCatalog.ts` (Klopp, Guardiola, Sarri, De Zerbi, Sacchi, Simeone, ecc.)
11. **Pipeline CV a 9 Stadi**: `src/engine/cvRolePipeline.ts` (ByteTrack a 2 stadi, CIELAB K-Means k=3, Chamfer matching, soft-assignment)

---

## 6. Moduli Proxy (Client-Side con Approssimazione Controllata)

1. **Pose Estimation 17 Keypoint**: `src/components/video/UniversalVideoLab.tsx` (procedurale trigonometrico sui box EKF; migrazione prevista `onnxruntime-web`)
2. **Topologia Computazionale TDA $H_0 / H_1$**: `src/engine/mathEngine.ts` (Kruskal MST per $H_0$, 2-simplessi su triangoli vuoti per varchi $H_1$; migrazione target C++ `gudhi` via WASM)
3. **Ghosting Controfattuale**: `src/engine/mathEngine.ts` (curve di Bézier su gradiente xT; espansione target CVAE)

---

## 7. Moduli Mancanti / Roadmap Futura

1. **Benchmark 12 Dimensioni**: riallineamento conteggio gol (il testo dichiara 48 gol ma mostra 26 righe nel fixture)
2. **nucleo-py**: modulo scientifico Python (DuckDB, Kloppy, Gudhi)
3. **Tauri Build**: configurazione pacchetto desktop `src-tauri` per `.exe` Windows (in attesa di inizializzazione)
4. **Persistenza UI con IndexedDB**: `src/lib/idb.ts` presente ma autosave completo non cablato a tutte le schermate
5. **Export Raster Statico**: supporto export diretto PNG/GIF oltre al già presente JSON e WebM

---

## 8. Verifiche di Integrità & Test

- **`npx tsc --noEmit`**: Exit 0 (zero errori)
- **`npx tsx scripts/audit_real_vs_stub.ts`**: Exit 0 (8 verifiche reali + 7 test di animazione superati)
- **`npm run build`**: Exit 0 (build di produzione Vite completata in 3.7s, zero warning su dipendenze orfane)

---

## 9. Igiene & Bonifica Eseguita (Chiusura dei 4 Problemi)

- [x] **Problema 1 (Blueprint superato)**: `docs/BLUEPRINT.md` archiviato in `docs/ARCHIVE/BLUEPRINT-v2-superseded.md` con avviso `SUPERSEDED` esplicito in testa; la sola fonte di verità è `docs/STATE.md`
- [x] **Problema 2 (Discrepanza righe)**: chiarita e documentata la distinzione tra perimetro intero repo (16.544 righe su 37 file TS), perimetro audit (16.279 righe su 36 file) e perimetro solo client `src/` (15.719 righe su 34 file)
- [x] **Problema 3 (Doppio hook playback)**: eliminato il file orfano `src/components/studio/useStudioPlayback.ts`; il player è consolidato unicamente in `src/hooks/useAnimationPlayback.ts` (60 FPS, easing cubico, Bézier, elevazione 3D)
- [x] **Problema 4 (Canvas orfani)**: eliminati `src/components/canvas/PitchCanvas2D.tsx` e `src/components/canvas/PitchCanvas3D.tsx`; l'unico canvas operativo del progetto è `TacticalPitchCanvas.tsx` (`src/components/studio/TacticalPitchCanvas.tsx`); rimosse le dipendenze inutilizzate `three` e `@types/three`
- [x] **Lockfile e Peer Dependencies**: eliminato `bun.lock`, risolto conflitto esbuild in `package.json`, `package-lock.json` pulito con 0 vulnerabilità

---

## 10. Prossimi Passi

1. **Rebranding & Vetrina GitHub**: allineare `README.md` per presentare al meglio LavagnaTattica
2. **Riallineamento Benchmark**: allineare la visualizzazione delle metriche sui 26 gol effettivi del corpus
3. **Packaging Desktop con Tauri**: eseguire `tauri init` e compilare `.exe` quando deciso
