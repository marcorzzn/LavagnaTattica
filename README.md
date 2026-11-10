# LavagnaTattica

Lavagna tattica e annotazione di situazioni di gioco su fermo immagine, pensata per allenatori e appassionati.

**Applicazione online:** [lavagnatattica.pages.dev](https://lavagnatattica.pages.dev/)

> **Stato: in revisione (novembre 2026).** Il motore di analisi **NucleoTattico** è in costruzione.
> Fino ad allora l'app non dà voti alle giocate: permette di ricostruire e annotare le situazioni, non di valutarle.
> Le funzioni non verificate della versione precedente sono state ritirate; l'elenco e il motivo sono in
> [`docs/STATE.md`](docs/STATE.md).

## Che cosa fa oggi

L'app ha tre viste.

### Analisi

- Carichi un fermo immagine e calibri il campo trascinando 4 punti di riferimento.
- Piazzi le pedine (fino a 11 per squadra, con numero e ruolo) e la palla.
- Disegni la giocata con la freccia della palla e la descrivi: tipo, piede, velocità, altezza.
- Disegni le corse senza palla.
- Vedi la linea del penultimo difendente come aiuto visivo.
- Lavori su più scene nello stesso progetto ed esporti o reimporti il progetto in un file JSON.

Le coordinate del campo sono nel sistema 120 × 80: non sono metri.

### Lavagna animata

Sposti le pedine, catturi i passi e riproduci la sequenza. È un'illustrazione disegnata a mano: i movimenti non
seguono un modello fisico.

### Lavagna libera

Disegno libero sul campo: pedine, penna, rettangoli e frecce.

## Manuale tecnico-matematico

Il manuale è in [`docs/paper/`](docs/paper/) ed è **in revisione**: descrive una versione precedente del progetto.
In prima pagina una tabella dice che cosa è in uso oggi, che cosa no e perché. Verrà riscritto come specifica di
NucleoTattico e aggiornato a ogni progresso significativo.

## Avvio in locale

Serve Node.js 22.12 o successivo.

```bash
npm install
npm run dev
```

L'app si apre su `http://localhost:5173`.

Per eseguire typecheck, test e build in un solo comando:

```bash
npm run check
```

Gli stessi controlli girano su GitHub a ogni push su `main` e a ogni pull request.

## Pubblicazione

L'app è pubblicata su Cloudflare Pages a ogni push su `main`. La configurazione è in
[`docs/CLOUDFLARE_DEPLOY.md`](docs/CLOUDFLARE_DEPLOY.md).

## Autore

Marco Razzano.

Sviluppo assistito da modelli di intelligenza artificiale: Google Gemini 2.5 Flash e 2.5 Pro (tramite Google
Antigravity) e Claude (Anthropic).

## Licenza

Il codice è distribuito con la licenza [PolyForm Noncommercial 1.0.0](LICENSE.md): chiunque può usarlo e modificarlo
gratuitamente per scopi non commerciali; per ogni uso commerciale serve il permesso dell'autore.

Required Notice: Copyright 2026 Marco Razzano (https://github.com/marcorzzn/LavagnaTattica)
