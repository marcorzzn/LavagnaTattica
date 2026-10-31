# INVENTORY — LavagnaTattica / NucleoTattico

**Data:** 31 ottobre 2026  
**Commit di riferimento:** `09a5339`  
**Autorità Matematica Suprema:** Marco Razzano (`0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY`)  
**Repo:** [https://github.com/marcorzzn/LavagnaTattica](https://github.com/marcorzzn/LavagnaTattica)  

---

## 1. Identità del Progetto

- **Progetto & UI**: LavagnaTattica
- **Motore Matematico**: NucleoTattico
- **Schermata Principale**: Lavagna Tattica (`/lavagna` o navigazione predefinita canvas)
- **Licenza Codice**: MIT
- **Stato**: Pre-alpha (`0.1.0`)

---

## 2. Stack Tecnologico

- **Frontend Core**: React 19 (`19.0.1`) + TypeScript (`7.0.2` / TS 5.x)
- **Bundler & Build Tool**: Vite (`^8.3.0` / v8.3.5)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite` `^4.3.3`) + Lucide Icons (`^0.546.0`)
- **State Management**: Zustand (`^5.0.3`)
- **Grafica & Spazio**: SVG Canvas nativo reattivo + Three.js (`^0.186.1` per visualizzatore 3D)
- **Server / Backend Proxy**: Express (`^4.21.2`) + Google Gen AI SDK (`@google/genai` `^2.4.0`)
- **Storage Locale Client**: IndexedDB (`idb` `^8.0.2`)
- **Testing & Esecuzione**: Vitest + `tsx` (`^4.21.0`)

---

## 3. File Tracciati

Totale file tracciati: **58** (dopo rimozione `bun.lock` e asset orfani non usati):

```text
.env.example
.gitignore
CHANGELOG.md
README.md
docs/BLUEPRINT.md
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
src/components/canvas/PitchCanvas2D.tsx
src/components/canvas/PitchCanvas3D.tsx
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
src/components/studio/useStudioPlayback.ts
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

## 4. Metriche del Codice

- **File TypeScript / TSX**: 39 file
- **Righe di Codice TS/TSX**: **16.353 righe**
- **Test Unitari Animazione**: 93 righe (`src/engine/animationEngine.test.ts`, 7/7 test passati)
- **Suite di Verifica Matematica**: 265 righe (`scripts/audit_real_vs_stub.ts`, 8 verifiche reali)
- **Documentazione Markdown**: ~1.500 righe totali ([README.md](file:///c:/Progetti/OpenPitch/README.md), [CHANGELOG.md](file:///c:/Progetti/OpenPitch/CHANGELOG.md), [docs/STATE.md](file:///c:/Progetti/OpenPitch/docs/STATE.md), [docs/INVENTORY.md](file:///c:/Progetti/OpenPitch/docs/INVENTORY.md))

---

## 5. Moduli Matematici Reali (100% Client-Side)

1. **Omografia Planare DLT 8×8 + RANSAC**: `src/engine/mathEngine.ts` (errore riproiezione 0m)
2. **Pitch Control Deterministico (Spearman ODE 2018)**: `src/engine/mathEngine.ts` (integrazione $dPPCF/dt$ continua)
3. **Expected Threat (xT) su Catena di Markov Assorbente**: `src/engine/mathEngine.ts` (Value Iteration di Bellman su griglia $16 \times 24$, residuo $< 10^{-6}$)
4. **Spettro Laplaciano & Connettività di Fiedler $\lambda_2$**: `src/engine/mathEngine.ts` (rotazioni ortogonali di Jacobi su $L = D - W$)
5. **Filtro di Kalman Esteso Balistico 4×4**: `src/engine/kalmanEkf.ts` (stato $[x, y, v_x, v_y]^T$, propagazione covarianza e abbattimento incertezza)
6. **Valutazione Composita Stile Chess.com**: `src/engine/mathEngine.ts` (funzionale convesso $J(a \mid s)$, ranking dinamico e mosse `!!`, `!`, `?!`, `?`)
7. **Motore di Animazione a 3 Livelli**: `src/engine/animationEngine.ts` (Keyframe discreti + Azioni esplicite + Traiettorie Bézier quadratiche ed elevazione balistica 3D $z$, 60 FPS con rAF)
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

1. **Benchmark 12 Dimensioni**: riallineamento conteggio gol (il testo parla di 48, il corpus di benchmark elenca 26 righe)
2. **nucleo-py**: modulo scientifico Python (DuckDB, Kloppy, Gudhi)
3. **Tauri Build**: configurazione pacchetto desktop `src-tauri` per `.exe` Windows
4. **Persistenza UI con IndexedDB**: `src/lib/idb.ts` presente ma autosave completo non cablato a tutte le schermate
5. **Export Raster Statico**: supporto export diretto PNG/GIF oltre al già presente JSON e WebM

---

## 8. Verifiche di Integrità & Test

- **`npx tsc --noEmit`**: Exit 0 (zero errori)
- **`npx tsx scripts/audit_real_vs_stub.ts`**: Exit 0 (8 verifiche reali + 7 test di animazione superati)
- **`npm run build`**: Exit 0 (build di produzione Vite completata con successo)

---

## 9. Igiene & Bonifica Eseguita

- [x] `.gitignore` arricchito e standardizzato (esclusi build, log, .env, lockfiles alternativi, OS, IDE, target Tauri)
- [x] `bun.lock` rimosso dal tracking Git per evitare lockfile multipli incoerenti
- [x] Risolto conflitto peer-dependency esbuild in `package.json` (`esbuild: "^0.28.0"`) permettendo un `npm install` pulito
- [x] `package-lock.json` riallineato al nome `lavagna-tattica`
- [x] Asset orfani eliminati da `public/assets/aistudio/`
- [x] Nessun log (`*.log`) o segreto (`.env`) tracciato nel repository
- [x] Riferimenti a `OpenPitch` e `Cardine` bonificati in tutto il codice e i file di interfaccia (rimasti unicamente nelle note storiche di CHANGELOG e README)
- [x] `docs/STATE.md` aggiornato con la matrice onesta reale / proxy / mancante

---

## 10. Prossimi Passi

1. **Riallineamento Benchmark**: allineare la visualizzazione delle metriche sui 26 gol effettivi del corpus
2. **Inizializzazione Tauri**: configurare `src-tauri` per la compilazione desktop nativa
3. **Persistenza Completa IndexedDB**: collegare i salvataggi automatici della lavagna e delle sessioni studio
4. **Export Grafico Statico (PNG/SVG)**: integrare screenshot diretto ad alta risoluzione del campo
