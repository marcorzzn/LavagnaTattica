# LavagnaTattica

<div align="center">

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)
![60 FPS](https://img.shields.io/badge/Render-60%20FPS%20rAF-2EA043)
![Math Audit](https://img.shields.io/badge/Math%20Audit-15%2F15%20PASS-brightgreen)

**Lavagna tattica aumentata per il calcio contemporaneo, alimentata dal motore matematico NucleoTattico.**

[Panoramica](#-visione--architettura) •
[I 6 Pilastri Matematici](#-i-6-pilastri-di-nucleotattico) •
[Motore di Animazione](#-motore-di-animazione-a-3-livelli) •
[Audit Matematico](#-audit-matematico-e-verifica) •
[Avvio Rapido](#-avvio-rapido)

</div>

---

> **Proprietario & Autorità Matematica Suprema:** Marco Razzano (`0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY`)  
> **Contratto di Trasparenza & Stato dei Moduli:** [`docs/STATE.md`](docs/STATE.md) • [`docs/INVENTORY.md`](docs/INVENTORY.md)  
> **Repository Ufficiale:** [https://github.com/marcorzzn/LavagnaTattica](https://github.com/marcorzzn/LavagnaTattica)

---

## ⚽ Visione & Architettura

**LavagnaTattica** è l'omologo di Chess.com per l'analisi calcistica: una lavagna tattica interattiva reattiva a 60 FPS concepita per match analyst professionisti, allenatori, accademie e appassionati di tattica evoluta.

Sotto la superficie, il motore **NucleoTattico** combina modelli stocastici, geometria proiettiva, teoria spettrale dei grafi ed equazioni differenziali in un runtime client-side ultra-fluido:

```
┌────────────────────────────────────────────────────────────────────────┐
│                             LAVAGNATATTICA                             │
│       Piattaforma di Intelligenza Tattica & Lavagna Aumentata          │
├────────────────────────────────────────────────────────────────────────┤
│  [1. Lavagna Tattica]  Canvas 2D, Timeline 60 FPS, Possession Lock,    │
│                        Disegno Tattico, Temi Cromatici d'Autore        │
│  [2. Video CV Lab]     Omografia DLT 8x8, Calibrazione Proiettiva,     │
│                        Simulatore Human-in-the-Loop What-If su Frame   │
│  [3. Benchmark 12D]    Analisi Multi-Dimensionale, Partizioni Disgiunte│
│  [4. Governance]       Registro ADR-Math (Firma Razzano), 30 Archetipi │
│  [5. Didattica]        Percorsi Formativi, Quiz Tattici, Terzo Uomo    │
├────────────────────────────────────────────────────────────────────────┤
│                         MOTORE NUCLEOTATTICO                           │
│  • Spearman ODE Pitch Control   • Value Iteration Markov xT (Bellman)  │
│  • Connettività Fiedler λ₂      • Extended Kalman Filter Balistico 4x4 │
│  • Valutatore Stile Chess.com   • Animazione a 3 Livelli (Bézier + 3D) │
│  • 30 Tipologie Astratte        • Catalogo Dottrinale 13 Maestri       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📐 I 6 Pilastri di NucleoTattico

Ogni metrica e calcolo di LavagnaTattica è rigorosamente ancorato alla formulazione matematica approvata:

1. **Pilastro I — Geometria Proiettiva & Calibrazione DLT**:
   Risoluzione esatta con eliminazione di Gauss-Jordan a pivoting parziale della matrice di omografia planare $H \in \text{PGL}(3, \mathbb{R})$ da 4+ punti di corrispondenza, con calcolo analitico dell'inversa $H^{-1}$ per proiettare istantaneamente qualsiasi frame video (smartphone, drone o broadcast) sulle coordinate metriche reali del campo FIFA ($105\text{m} \times 68\text{m}$).
2. **Pilastro II — Pitch Control Deterministico (Spearman ODE 2018)**:
   Integrazione numerica continua dell'equazione differenziale accoppiata $dPPCF/dt$ considerando tempo di reazione neuromuscolare $\tau_r = 0.4\text{s}$, spostamento inerziale $\vec{v}\tau_r$, accelerazione finita $a_{\max} = 4.0\text{ m/s}^2$ e tempo di volo balistico della palla $t_{\text{ball}}$.
3. **Pilastro III — Expected Threat (xT) su Catena di Markov Assorbente**:
   Griglia $16 \times 24$ celle con matrici di tiro, conversione e transizione. Soluzione iterativa di Bellman fino a convergenza $\|xT^{(k+1)} - xT^{(k)}\|_\infty < 10^{-6}$.
4. **Pilastro IV — Teoria Spettrale dei Grafi (Fiedler $\lambda_2$)**:
   Costruzione della matrice Laplaciana pesata $L = D - W$ (con penalizzazione per coni d'ombra difensivi) ed estrazione della connettività algebrica tramite il metodo di Jacobi a rotazioni ortogonali planari.
5. **Pilastro V — Filtro di Kalman Esteso (EKF 4×4)**:
   Modello cinematico per vettore di stato $\mathbf{x} = [x, y, v_x, v_y]^T$, propagazione dell'incertezza e stima delle velocità istantanee.
6. **Pilastro VI — Motore di Valutazione Stile Chess.com**:
   Funzionale scalare convesso $J(a \mid s)$ che ordina ogni giocata possibile (passaggio, filtrante, conduzione, cross) confrontando la scelta eseguita con le alternative migliori e assegnando badge qualitativi: **Best Move (!!)**, Good Move (!), Inaccuracy (?!), Mistake (?).

---

## 🎬 Motore di Animazione a 3 Livelli

Il movimento in LavagnaTattica non viene "campionato" alla cieca: è un'architettura dati dichiarativa a tre livelli:

- **Livello 1 — Keyframe (Snapshot di Posizione)**: punti di ancoraggio temporale esatti per tutti i giocatori e la palla.
- **Livello 2 — Azioni Tattiche**: passaggi rasoterra, filtranti, cross alti, tiri a giro, corse di smarcamento e pressing associati tra keyframe.
- **Livello 3 — Parametri Balistici & Easing 3D**:
  - Velocità palla regolabile da $15$ a $140\text{ km/h}$.
  - Parabole d'elevazione balistica 3D con quota $z = 4 \cdot z_{\text{peak}} \cdot t(1-t)$ fino a $500\text{ cm}$ e ombra proiettata a terra.
  - Traiettorie con curve di Bézier quadratiche e accelerazione fluida `easeInOutCubic`.
  - Scrubbing a 60 FPS con RequestAnimationFrame ed esportazione/importazione JSON portabile (`azione_tattica_nucleo.json`).

---

## 👤 Zero Nomi Propri & 30 Tipologie Astratte

In conformità ai principi di astrazione dottrinale di LavagnaTattica, il sistema **non fa uso di nomi propri di calciatori o club**, ma impiega **30 Tipologie Tattiche Astratte universali**:
- *Costruzione*: Libero Moderno, Portiere Sweeper, Braccetto Aggressivo, Terzino Invertito.
- *Rifinitura*: Mediano Metodista, Mezzala d'Inserimento, Regista Mobile, Trequartista Associativo.
- *Finalizzazione*: Ala Invertita, Centravanti Boa, Seconda Punta di Raccordo, Attaccante di Profondità.

Ogni tipologia possiede attributi cine-dinamici misurabili ($v_{\max}$, $a_{\max}$, $\tau_{\text{reaz}}$, raggio d'azione, propensione al pressing).

---

## 🏛️ Catalogo Dottrinale dei 13 Maestri

LavagnaTattica integra 13 scuole tattiche storiche e contemporanee preconfigurate, complete di keyframe e principi applicati:
- **Gegenpressing** (Klopp) · **Gioco di Posizione** (Guardiola) · **Catena di Sinistra & Cutback** (Sarri)
- **Costruzione Provocatoria** (De Zerbi) · **Blocco Compatto Sacchiano** (Sacchi)
- **Blocco Basso & Transizione** (Simeone) · **3-4-1-2 a Uomo** (Gasperini)
- **Calcio Totale** (Cruyff/Michels) · **Box Midfield** (Arteta) · **Rotazioni Continue** (Bielsa)

Supporta nativamente formati di gioco **11v11**, **7v7** e **5v5** con temi visivi dedicati (**Verde Prato & Bianco Crema**, Cyber Dark, Lavagna Gesso, Blueprint).

---

## 🧪 Audit Matematico e Verifica

Il progetto include una suite di verifica automatizzata che valida l'assenza di scorciatoie o stub:

```bash
# Esegue il pre-build check completo (Typecheck + 15 Test Matematici + Build Vite)
powershell -ExecutionPolicy Bypass -File scripts/pre-build-check.ps1

# Oppure su Linux/macOS
./scripts/pre-build-check.sh
```

Verifiche coperte dall'audit (`scripts/audit_real_vs_stub.ts`):
- [x] Zero modelli inesistenti o allucinati (usa Gemini 2.5 Flash con fallback deterministico completo)
- [x] Errore medio riproiezione omografica DLT $= 0.0\text{ m}$
- [x] Conservazione probabilistica Spearman ($P_{\text{home}} + P_{\text{away}} = 1.0000$)
- [x] Convergenza Bellman xT in 37 iterazioni (residuo $< 10^{-6}$)
- [x] Autovalori del Laplaciano ortogonali di Jacobi ($\lambda_1 = 0$, $\lambda_2 > 0$)
- [x] Abbattimento covarianza EKF 4×4 post-misura
- [x] Valutazione Chess.com dinamica (punteggi e best moves variano coerentemente allo stato)
- [x] Simulatore HITL su frame: aumento $P_{\text{succ}}$ del filtrante da $49.3\%$ a $86\%$ spostando il difensore
- [x] 7/7 test matematici del motore di animazione passati (interpolazione, Bézier, picco parabolico $z$)

---

## 🚀 Avvio Rapido

### Prerequisiti
- **Node.js** $\ge 20$
- **npm** $\ge 10$

### Installazione
```bash
# 1. Clona il repository
git clone https://github.com/marcorzzn/LavagnaTattica.git
cd LavagnaTattica

# 2. Installa le dipendenze (pulito, 0 vulnerabilità)
npm install

# 3. Avvia l'ambiente di sviluppo locale
npm run dev

# 4. Avvia il server proxy opzionale per l'LLM Orchestrator
npm run server
```

L'applicazione sarà attiva su: `http://localhost:3000` (o `http://localhost:5173`).

---

## 📄 Licenza

Distribuito sotto licenza **MIT**. Consulta `LICENSE` per i dettagli.
