# Deployment su Cloudflare Pages — LavagnaTattica

Questa guida illustra la procedura operativa per il deploy continuo e a zero costi di **LavagnaTattica** su **Cloudflare Pages**.

---

## 1. Perché Cloudflare Pages

1. **Banda e Traffico Illimitati a Costo Zero**: A differenza di altre piattaforme con quote rigide di bandwidth o fatturazione a consumo imprevisto, Cloudflare Pages offre egress illimitato nel piano gratuito.
2. **Edge Network Globale Anycast a Bassa Latenza**: Distribuzione automatica su oltre 300 data center mondiali, garantendo TTFB istantaneo in Europa, Americhe e Asia.
3. **PWA e Service Worker Nativi**: Pieno supporto al caching offline PWA (`registerType: 'autoUpdate'`), permettendo agli allenatori e match analyst di utilizzare la lavagna anche senza connessione internet su campo.
4. **Single Page Application (SPA) Routing**: Supportato tramite la regola standard `public/_redirects` (`/* /index.html 200`), che previene qualsiasi errore 404 sui refresh.
5. **Zero Sorprese di Fatturazione per Uso Commerciale**: Ideale per l'infrastruttura di LavagnaTattica fondata da Marco Razzano.

---

## 2. Configurazione Dashboard Cloudflare Pages

### Passo 1: Collegamento Repository GitHub
1. Accedi alla dashboard di [Cloudflare](https://dash.cloudflare.com/).
2. Nel menu laterale, seleziona **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Seleziona il repository GitHub: `marcorzzn/LavagnaTattica`.
4. Branch di produzione: `main`.

### Passo 2: Parametri di Build
Compila i campi di configurazione del build con i seguenti valori esatti:

| Parametro | Valore |
|---|---|
| **Framework preset** | `Vite` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (lasciare vuoto) |

### Passo 3: Variabili d'Ambiente (Environment Variables)
In **Environment variables (advanced)**, imposta la versione di Node.js per garantire compatibilità con Node 20+:

| Chiave | Valore |
|---|---|
| `NODE_VERSION` | `20` |

Clicca su **Save and Deploy**. La build iniziale richiederà circa 45-60 secondi.

---

## 3. File di Configurazione Statici Inclusi nel Repository

Nel repository sono già inclusi nella cartella `public/` (copiati automaticamente in `dist/` durante la build):

- **`public/_redirects`**:
  ```text
  /*    /index.html   200
  ```
  Garantisce che qualsiasi URL interno o reload del browser ritorni la SPA React senza errori 404.

- **`public/_headers`**:
  ```text
  /assets/*
    Cache-Control: public, max-age=31536000, immutable

  /*
    X-Content-Type-Options: nosniff
    X-Frame-Options: SAMEORIGIN
    Referrer-Policy: strict-origin-when-cross-origin
  ```
  Ottimizza il caching a 1 anno per tutti i bundle JS/CSS immutabili generati da Vite con fingerprint, e applica header di sicurezza HTTP standard.

---

## 4. Dominio Personalizzato & HTTPS

1. Nella scheda del progetto Pages, vai su **Custom domains**.
2. Clicca su **Set up a custom domain**.
3. Inserisci il dominio desiderato (es. `app.lavagnatattica.com` o `lavagnatattica.it`).
4. Se il dominio è gestito sui DNS Cloudflare, il record CNAME e il certificato SSL/TLS (Full/Strict) verranno configurati automaticamente in pochi secondi.

---

## 5. Verifica Post-Deploy

Dopo il deploy:
1. **Verifica Bilinguismo**: Il toggle `IT / EN` nell'header deve cambiare lingua istantaneamente e persistere al ricaricamento (chiave `lavagnatattica_lng` in localStorage).
2. **Verifica Navigazione 3 Viste**:
   - `Lavagna Tattica` (`/`): canvas 2D interattivo, drawer archetipi, timeline 60 FPS.
   - `Analisi Video & Botoniera Tag`: canvas video con omografia DLT 8x8, botoniera tag e modalità Certificazione Benchmark 12D.
   - `Teoria & Riferimenti`: didattica "Impara" (quiz e puzzle) e consulta "Glossario Bilingue con KaTeX", "Registro ADR-Math (Marco Razzano)" e "30 Archetipi".
3. **Verifica PWA Offline**: Apri DevTools → Application → Service Workers: lo script `sw.js` deve risultare attivo e funzionante.
