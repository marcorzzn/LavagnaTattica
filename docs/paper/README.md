# Manuale tecnico-matematico

**Autore:** Marco Razzano

> **In revisione (10 novembre 2026).** Il manuale descrive una versione precedente del progetto: molte parti non sono
> più in uso e alcune formule non corrispondevano al codice. In prima pagina una tabella dice che cosa è in uso oggi,
> che cosa no e perché. Il manuale verrà riscritto come specifica del motore NucleoTattico e aggiornato a ogni
> progresso significativo, motivando ogni scelta di modello adottata o scartata.

## File

| File | Contenuto |
|---|---|
| [`MANUALE_TECNICO_MATEMATICO.pdf`](MANUALE_TECNICO_MATEMATICO.pdf) | Versione impaginata, generata dal modello HTML contenuto in [`scripts/build_math_paper.ts`](../../scripts/build_math_paper.ts). |
| [`MANUALE_TECNICO_MATEMATICO.html`](MANUALE_TECNICO_MATEMATICO.html) | Anteprima dello stesso testo, con le formule disegnate da KaTeX. |
| [`MANUALE_TECNICO_MATEMATICO.tex`](MANUALE_TECNICO_MATEMATICO.tex) | Sorgente LaTeX. |

Il PDF e il sorgente LaTeX sono oggi **due testi separati e non allineati**: verranno unificati. Il sorgente LaTeX non
è ancora stato compilato con un motore LaTeX.

## Rigenerare il PDF

```bash
npm run build:paper
```

Il comando rigenera l'HTML e il PDF. Richiede Google Chrome installato in
`C:\Program Files\Google\Chrome\Application\chrome.exe` (Windows).
