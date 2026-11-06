# Trattato Matematico & Manuale Formale — LavagnaTattica

> **Titolo:** *NucleoTattico & LavagnaTattica: Trattato Matematico-Cinematico e Manuale Formale dei Modelli Analitici per il Calcio Contemporaneo*  
> **Ideatore & Autore del Progetto:** Marco Razzano  
> **Modelli AI di Sviluppo:** Google Gemini 2.5 Flash (`gemini-2.5-flash`) & Gemini 2.5 Pro (`gemini-2.5-pro`) via Google Antigravity  
> **Versione:** 3.0-Enterprise (Novembre 2026)  
> **Stato dei Moduli:** Copertura integrale Lossless (Geometria Proiettiva, Spearman ODE, Markov xT, Fiedler $\lambda_2$, EKF $4\times 4$, Chess.com $J(a \mid s)$, Balistica, Fuorigioco e 3 Livelli d'Animazione).

---

## 📄 File Disponibili

1. **[`MANUALE_TECNICO_MATEMATICO.pdf`](MANUALE_TECNICO_MATEMATICO.pdf)**: Documento accademico compilato in formato PDF con impaginazione A4, Computer Modern typography, numerazione equazioni, box per teoremi e definizioni, tabelle e grafici formali.
2. **[`MANUALE_TECNICO_MATEMATICO.tex`](MANUALE_TECNICO_MATEMATICO.tex)**: Codice sorgente standard LaTeX (`article`, `amsmath`, `booktabs`, `algorithm`, `geometry`) pronto per essere compilato con qualsiasi motore TeX standard (`pdflatex`, `xelatex`, `lualatex`, Overleaf o arXiv).
3. **[`MANUALE_TECNICO_MATEMATICO.html`](MANUALE_TECNICO_MATEMATICO.html)**: Versione HTML semantica con formule matematiche vettoriali renderizzate via KaTeX per anteprima immediata via browser.

---

## 🔄 Pipeline di Aggiornamento Automatico

Il trattato matematico non è un testo statico abbandonato nel tempo: è **strettamente sincronizzato** con il codice sorgente del motore analitico (`src/engine/humanInTheLoopEngine.ts`, `src/engine/nucleoTatticoEngine.ts`, `scripts/audit_real_vs_stub.ts`).

Ogni volta che viene aggiunta una nuova funzione matematica o viene impiegato un nuovo apparato modellistico al progetto:
1. Le nuove formule o teoremi vengono censiti nel file sorgente `.tex` e nello script compilatore.
2. Eseguendo il comando:
   ```bash
   npm run build:paper
   ```
   oppure durante la verifica pre-commit:
   ```bash
   powershell -ExecutionPolicy Bypass -File scripts/pre-build-check.ps1
   ```
   il documento HTML e il PDF compilato vengono rigenerati all'istante in maniera deterministica e lossless.

---

## 🏛️ Compilazione Tradizionale via LaTeX

Se si desidera compilare il sorgente `.tex` con una distribuzione LaTeX locale (TeX Live, MiKTeX, MacTeX) o tramite Overleaf:

```bash
pdflatex -interaction=nonstopmode MANUALE_TECNICO_MATEMATICO.tex
pdflatex -interaction=nonstopmode MANUALE_TECNICO_MATEMATICO.tex
```
*(Eseguire due volte per risolvere correttamente riferimenti incrociati e indice)*

