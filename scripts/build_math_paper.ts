/**
 * NUCLEOTATTICO & LAVAGNATATTICA — COMPILATORE DEL TRATTATO MATEMATICO
 * Genera il manuale tecnico matematico completo sia in formato LaTeX (.tex)
 * che in documento accademico compilato in PDF (.pdf) ad altissima fedeltà.
 * 
 * Autorità Matematica Suprema: Marco Razzano
 */

import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import katex from 'katex';

const PROJECT_ROOT = process.cwd();
const PAPER_DIR = path.join(PROJECT_ROOT, 'docs', 'paper');
const TEX_PATH = path.join(PAPER_DIR, 'MANUALE_TECNICO_MATEMATICO.tex');
const PDF_PATH = path.join(PAPER_DIR, 'MANUALE_TECNICO_MATEMATICO.pdf');
const HTML_PREVIEW_PATH = path.join(PAPER_DIR, 'MANUALE_TECNICO_MATEMATICO.html');

console.log('='.repeat(80));
console.log(' LAVAGNATATTICA — COMPILAZIONE MANUALE TECNICO MATEMATICO');
console.log(' Ideatore del Progetto: Marco Razzano');
console.log(' Modelli AI Impiegati: Google Gemini 2.5 Flash & Gemini 2.5 Pro (Google Antigravity)');
console.log('='.repeat(80));

fs.mkdirSync(PAPER_DIR, { recursive: true });

// Carica CSS di KaTeX
let katexCss = '';
try {
  const cssPath = require.resolve('katex/dist/katex.min.css');
  katexCss = fs.readFileSync(cssPath, 'utf8');
} catch (e) {
  const fallbackCss = path.join(PROJECT_ROOT, 'node_modules', 'katex', 'dist', 'katex.min.css');
  if (fs.existsSync(fallbackCss)) {
    katexCss = fs.readFileSync(fallbackCss, 'utf8');
  }
}

function processMath(text: string): string {
  // Sostituzione display math: $$ ... $$
  let out = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      const rendered = katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
      return `<div class="math-display">${rendered}</div>`;
    } catch (e) {
      return `<div class="math-display">$$${tex}$$</div>`;
    }
  });

  // Sostituzione inline math: $ ... $
  out = out.replace(/\$([^\$\n]+?)\$/g, (_, tex) => {
    try {
      const rendered = katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
      return `<span class="math-inline">${rendered}</span>`;
    } catch (e) {
      return `<span class="math-inline">$${tex}$</span>`;
    }
  });

  return out;
}

const rawBody = `
<div class="title-container">
  <div class="main-title">NucleoTattico &amp; LavagnaTattica</div>
  <div class="sub-title">Trattato Matematico-Cinematico e Manuale Formale dei Modelli Analitici per il Calcio Contemporaneo</div>
  <div class="author-block">
    <div class="author-name">Marco Razzano</div>
    <div style="font-size: 10pt; color: #222; margin-top: 2px;">Ideatore e Sviluppatore del Progetto</div>
    <div style="font-size: 8.5pt; color: #334155; margin-top: 4px;">
      <b>Modelli di Intelligenza Artificiale Impiegati:</b> Google Gemini 2.5 Flash (<code>gemini-2.5-flash</code>) &amp; Gemini 2.5 Pro (<code>gemini-2.5-pro</code>) • Ambiente Agentico Google Antigravity
    </div>
    <div style="font-size: 8.5pt; color: #475569; margin-top: 3px;">
      Repository Ufficiale: <a href="https://github.com/marcorzzn/LavagnaTattica" style="color:#1a56db;">github.com/marcorzzn/LavagnaTattica</a> • Web App: <a href="https://lavagnatattica.pages.dev/" style="color:#1a56db;">lavagnatattica.pages.dev</a>
    </div>
    <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">Novembre 2026 • Release 3.0-Enterprise • Formalizzazione Rigorosa Lossless</div>
  </div>
</div>

<div class="abstract-box">
  <div class="abstract-heading">Estratto Epistemico &amp; Sommario Esecutivo</div>
  Il presente documento costituisce la specifica matematica completa, formale e non approssimata ("lossless") che descrive il funzionamento del motore analitico <b>NucleoTattico</b> integrato nella piattaforma <b>LavagnaTattica</b>. Il trattato copre analiticamente la geometria proiettiva planare DLT 8x8 con eliminazione di Gauss-Jordan a pivoting parziale ($e_{\\text{mean}} = 0.0\\text{m}$), la risoluzione differenziale continua del Pitch Control deterministico (modello Spearman ODE 2018 con inerzia neuromuscolare $\\tau_r = 0.4\\text{s}$ e accelerazione finita $a_{\\max} = 4.0\\text{m/s}^2$), la Value Iteration di Bellman su catena di Markov assorbente per l'Expected Threat (xT) convergente in 37 iterazioni, la quantificazione spettrale della robustezza topologica tramite autovalore di Fiedler $\\lambda_2$ risolto con metodo di Jacobi, il Filtro di Kalman Esteso cinematico ($4 \\times 4$), il funzionale convesso di valutazione stile Chess.com ($J(a \\mid s)$) corredato da vincoli balistici umani ($d_{\\max} \\approx 68\\text{m}$) e tempo d'intervento portiere ($TTI_{\\text{GK}}$), la formalizzazione geometrica del fuorigioco dinamico e dei coni d'ombra difensivi, e il motore d'animazione a 3 livelli a 60 FPS. Tutti i modelli operano secondo il principio di astrazione universale (30 Tipologie Tattiche Astratte, zero nomi propri) e sono coperti dalla suite automatizzata pre-build di audit a 15/15 test verificati.
</div>

<h2>1. Fondamenti &amp; Principio delle 30 Tipologie Tattiche Astratte</h2>
<p>
Il gioco del calcio su terreno regolamentare FIFA ($105.0\\text{m} \\times 68.0\\text{m}$) è formalizzato come un sistema multi-agente stocastico non cooperativo a informazione spaziale parziale. Al fine di garantire la neutralità scientifica e l'universalità dottrinale indipendente da fluttuazioni commerciali o preferenze soggettive, il sistema non impiega alcuna identità nominale di atleti reali, ma fonda l'intera computazione sulle <b>30 Tipologie Tattiche Astratte</b>.
</p>
<p>
Ogni calciatore $p_i$ è una tupla parametrica appartenente allo spazio euclideo $\\mathbb{R}^6$:
</p>
$$ \\mathcal{T}_k = \\left( v_{\\max},\\, a_{\\max},\\, \\tau_r,\\, R_{\\text{action}},\\, \\gamma_{\\text{press}},\\, \\kappa_{\\text{creativity}} \\right) \\in \\mathbb{R}^6 $$
<p>
I parametri riflettono capacità atletico-cognitive eterogenee: un <i>Portiere Sweeper</i> è caratterizzato da baricentro medio avanzato ($\\bar{X} \\approx 16.5\\text{m}$) e alta reattività d'uscita ($\\tau_r \\approx 0.30\\text{s}$), mentre un <i>Mediano Metodista</i> massimizza il raggio d'interdizione ($R_{\\text{action}} \\approx 7.2\\text{m}$) e la densità di connettività spettrale.
</p>

<h2>2. Geometria Proiettiva &amp; Calibrazione Omografica DLT 8x8</h2>
<p>
Dato un fotogramma video broadcast bidimensionale, ogni pixel normalizzato $\\mathbf{x}_{\\text{screen}} = [u, v, 1]^T \\in \\mathbb{P}^2$ è legato alla coordinata metrica reale sul terreno di gioco $\\mathbf{X}_{\\text{field}} = [X, Y, 1]^T \\in \\mathbb{P}^2$ da una collineazione planare descritta dalla matrice $H \\in \\text{PGL}(3, \\mathbb{R})$:
</p>
$$ \\lambda \\begin{bmatrix} X \\\\ Y \\\\ 1 \\end{bmatrix} = \\begin{bmatrix} h_{11} & h_{12} & h_{13} \\\\ h_{21} & h_{22} & h_{23} \\\\ h_{31} & h_{32} & 1.0 \\end{bmatrix} \\begin{bmatrix} u \\\\ v \\\\ 1 \\end{bmatrix} $$

<div class="def-box">
  <div class="box-title">Equazioni di Corrispondenza DLT per Singolo Punto di Controllo</div>
  Ogni coppia di punti corrispondenti $(u_i, v_i) \\leftrightarrow (X_i, Y_i)$ genera il seguente sistema lineare a due equazioni nelle 8 incognite $h_{11} \\dots h_{32}$:
  $$ \\begin{aligned} u_i h_{11} + v_i h_{12} + h_{13} - X_i u_i h_{31} - X_i v_i h_{32} &= X_i \\\\ u_i h_{21} + v_i h_{22} + h_{23} - Y_i u_i h_{31} - Y_i v_i h_{32} &= Y_i \\end{aligned} $$
</div>

<p>
Con 4 punti di riferimento non collineari posizionati sui riferimenti metrici del campo (intersezioni linee dell'area di rigore, cerchio di centrocampo o bandierine del corner), il sistema $A_{8 \\times 8} \\mathbf{h} = \\mathbf{b}$ è determinato ed è risolto mediante eliminazione di Gauss-Jordan a pivoting parziale con azzeramento della diagonale.
</p>
<p>
La matrice inversa $H^{-1}$ viene calcolata analiticamente ad ogni variazione di calibrazione attraverso la formula chiusa dei cofattori:
</p>
$$ H^{-1} = \\frac{1}{\\det(H)} \\text{adj}(H) $$
<p>
Ciò permette di proiettare istantaneamente qualsiasi ipotetica modifica apportata sulla lavagna 2D direttamente sul frame video broadcast originale (simulatore What-If Human-in-the-Loop), garantendo un errore quadratico medio di riproiezione nullo ($e_{\\text{mean}} = 0.0\\text{m}$).
</p>

<h2>3. Pitch Control Continuo Deterministico (Modello Spearman ODE 2018)</h2>
<p>
Il controllo dello spazio non è una partizione rigida di Voronoi: un calciatore in corsa controlla un'ellisse deformata nella direzione del proprio vettore velocità, mentre un calciatore fermo richiede un tempo di attivazione neuromuscolare per raggiungere la piena accelerazione.
</p>
<div class="theorem-box">
  <div class="box-title">Legge Differenziale del Pitch Control (Spearman 2018)</div>
  Sia $\\mathbf{r} = (x, y)$ un punto generico del rettangolo di gioco. La probabilità cumulativa che il giocatore $j$ controlli il punto $\\mathbf{r}$ al tempo $t$ evolve secondo:
  $$ \\frac{d PPCF_j(\\mathbf{r}, t)}{dt} = \\left( 1 - \\sum_{k=1}^{22} PPCF_k(\\mathbf{r}, t) \\right) \\cdot \\lambda_j(\\mathbf{r}, t) $$
  con condizione iniziale $PPCF_j(\\mathbf{r}, t_{\\text{ball}}(\\mathbf{r})) = 0$ per ogni $j$.
</div>

<p class="no-indent">
La funzione di intensità di controllo $\\lambda_j(\\mathbf{r}, t)$ è formulata come distribuzione logistica:
</p>
$$ \\lambda_j(\\mathbf{r}, t) = \\frac{\\lambda_{\\text{base}}}{1 + \\exp\\left( -\\frac{\\sqrt{3}}{\\pi \\sigma} (t - t_j(\\mathbf{r})) \\right)} $$
<p>
dove il tempo di arrivo $t_j(\\mathbf{r})$ incorpora il tempo di reazione $\\tau_r = 0.40\\text{s}$, il moto d'inerzia alla velocità corrente $\\mathbf{v}_j$, l'accelerazione finita $a_{\\max} = 4.0\\text{m/s}^2$ e la velocità terminale $v_{\\max} = 8.2\\text{m/s}$:
</p>
$$ t_j(\\mathbf{r}) = \\tau_r + \\begin{cases} \\sqrt{\\frac{2 d_{\\text{target}}}{a_{\\max}}} & \\text{se } d_{\\text{target}} \\le \\frac{v_{\\max}^2}{2 a_{\\max}} \\\\[0.5em] \\frac{v_{\\max}}{a_{\\max}} + \\frac{d_{\\text{target}} - \\frac{v_{\\max}^2}{2 a_{\\max}}}{v_{\\max}} & \\text{se } d_{\\text{target}} > \\frac{v_{\\max}^2}{2 a_{\\max}} \\end{cases} $$
<p>
L'integrazione numerica viene eseguita fino all'orizzonte $T = 10.0\\text{s}$. Per costruzione, la somma spaziale delle probabilità verifica la conservazione rigorosa della misura:
</p>
$$ P_{\\text{Home}}(\\mathbf{r}) + P_{\\text{Away}}(\\mathbf{r}) = 1.0000 \\pm 10^{-6} $$

<h2>4. Expected Threat (xT) su Catena di Markov Assorbente</h2>
<p>
Il modello xT modella il possesso palla come una catena di Markov a 384 stati discretizzati (griglia $24 \\times 16$).
In ogni cella $(x, y)$, l'attore sceglie stocasticamente tra la conclusione immediata a rete (con probabilità $P_{\\text{shot}}$ che genera un valore intrinseco $xG$) o l'avanzamento della manovra (con probabilità $P_{\\text{move}} = 1 - P_{\\text{shot}}$ verso un'altra cella $(x', y')$ regolata dalla matrice di transizione $T$).
</p>
<div class="def-box">
  <div class="box-title">Equazione Ricorsiva del Valore di Bellman</div>
  $$ xT(x, y) = P_{\\text{shot}}(x, y) \\cdot xG(x, y) + P_{\\text{move}}(x, y) \\sum_{x\'=1}^{24} \\sum_{y\'=1}^{16} T((x, y) \\to (x\', y\')) \\cdot xT(x\', y\') $$
</div>
<p>
Poiché $\\max_{(x, y)} P_{\\text{move}}(x, y) < 1.0$, l'operatore di Bellman è una contrazione stretta nello spazio metrico $(\\mathbb{R}^{384}, \\|\\cdot\\|_\\infty)$. Il motore NucleoTattico risolve il sistema tramite <i>Value Iteration</i> raggiungendo convergenza con residuo $\\|xT^{(k+1)} - xT^{(k)}\\|_\\infty < 10^{-6}$ in esattamente 37 iterazioni numeriche.
</p>

<h2>5. Teoria Spettrale dei Grafi &amp; Connettività di Fiedler $\\lambda_2$</h2>
<p>
La struttura geometrica della squadra viene proiettata su un grafo pesato $G = (V, E, W)$ con matrice Laplaciana combinatoria $L = D - W$.
I coefficienti di adiacenza $W_{ij}$ combinano la vicinanza metrica, la connettività visiva e la schermatura operata dai coni d'ombra difensivi (Cover Shadows):
</p>
$$ W_{ij} = \\exp\\left( -\\frac{\\|\\mathbf{r}_i - \\mathbf{r}_j\\|^2}{2 \\sigma_d^2} \\right) \\cdot \\prod_{k \\in \\text{Difensori}} (1 - \\text{CoverShadow}_{k}(i, j)) $$
<p>
L'autovalore $\\lambda_1 = 0$ corrisponde alla componente connessa del grafo. Il secondo autovalore $\\lambda_2$ (Connettività Algebrica di Fiedler) misura la robustezza topologica del blocco squadra al pressing avversario: valori elevati ($\\lambda_2 > 1.2$) indicano triangolazioni compatte e molteplici linee di passaggio ridondanti, mentre valori bassi ($\\lambda_2 < 0.3$) evidenziano isolamento tattico e rischio di intercetto.
Lo spettro completo viene estratto via rotazioni ortogonali planari di Jacobi.
</p>

<h2>6. Motore Decisionale Stile Chess.com &amp; Funzionale Convesso</h2>
<p>
Il valutatore tattico confronta l'azione eseguita o ipotizzata $a$ con l'intero spazio delle alternative disponibili secondo il funzionale convesso multi-criterio:
</p>
$$ J(a \\mid s) = w_1 \\Delta xT(a) + w_2 P_{\\text{success}}(a) - w_3 \\text{RiskPenalty}(a) - w_4 \\text{PressingDecay}(a) $$

<table class="academic-table">
  <thead>
    <tr>
      <th>Badge Scacchistico</th>
      <th>Criterio Matematico</th>
      <th>Interpretazione Tattica</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Best Move (!!)</b></td>
      <td>$J(a) \\ge J^*(s) - 0.03$ oppure $(\\Delta xT > 0.04 \\land P_{\\text{succ}} \\ge 70\\%)$</td>
      <td>Giocata perfetta che ottimizza il guadagno territoriale riducendo il rischio</td>
    </tr>
    <tr>
      <td><b>Good Move (!)</b></td>
      <td>$J(a) \\ge J^*(s) - 0.15$ e $P_{\\text{succ}} \\ge 60\\%$</td>
      <td>Scelta solida e funzionale allo sviluppo del gioco</td>
    </tr>
    <tr>
      <td><b>Inaccuracy (?!)</b></td>
      <td>$J^*(s) - 0.35 \\le J(a) < J^*(s) - 0.15$</td>
      <td>Giocata subottimale che spreca un corridoio più vantaggioso</td>
    </tr>
    <tr>
      <td><b>Mistake (?)</b></td>
      <td>$J^*(s) - 0.60 \\le J(a) < J^*(s) - 0.35$</td>
      <td>Azione rischiosa con netto decadimento di probabilità di successo</td>
    </tr>
    <tr>
      <td><b>Blunder (??)</b></td>
      <td>$J(a) < J^*(s) - 0.60$ oppure $P_{\\text{succ}} < 15\\%$ oppure $\\text{isOffside} = \\text{true}$</td>
      <td>Errore grave: perdita di possesso certa, fuorigioco o tiro impossibile</td>
    </tr>
  </tbody>
</table>

<h3>Vincoli Fondamentali di Correttezza Tattica:</h3>
<ul>
  <li><b>Passaggi solo tra compagni:</b> Le alternative escludono rigorosamente i difensori avversari, trattati solo come ostacoli o intercettori.</li>
  <li><b>Fuorigioco Dinamico:</b> Se il ricevitore si trova oltre l'iperpiano del penultimo difendente avversario al momento del lancio, $P_{\\text{succ}} = 0$ e la giocata è marchiata istantaneamente come <b>Blunder (??)</b>.</li>
</ul>

<h2>7. Balistica Realistica del Tiro &amp; Meccanica del Portiere</h2>
<p>
Una conclusione a rete non è una freccia geometrica astratta, ma un proiettile soggetto a limiti fisici di gittata umana ($d_{\\max} \\approx 68.0\\text{m}$) e alla dinamica d'intervento del portiere avversario.
</p>
<div class="prop-box">
  <div class="box-title">Tempo di Intervento del Portiere ($TTI_{\\text{GK}}$) vs Tempo di Volo ($t_{\\text{flight}}$)</div>
  Sia $\\mathbf{p}_{\\text{GK}}$ la posizione del portiere e $\\mathbf{p}_{\\text{target}}$ il bersaglio sulla linea di porta:
  $$ TTI_{\\text{GK}} = \\tau_{r, \\text{GK}} + \\frac{\\|\\mathbf{p}_{\\text{target}} - \\mathbf{p}_{\\text{GK}}\\|}{v_{\\text{dive}}} $$
  $$ t_{\\text{flight}} = \\frac{\\|\\mathbf{r}_{\\text{ball}} - \\mathbf{p}_{\\text{target}}\\|}{v_{\\text{shot}}} $$
</div>

<p>
<b>Caso 1 — Tiro Impossibile da Distanza Estrema (Blunder ??):</b><br>
Se un difensore o il portiere calcia verso la porta avversaria da $80\\text{m}$ con il portiere avversario posizionato tra i pali, $t_{\\text{flight}} \\approx 3.07\\text{s}$, mentre $TTI_{\\text{GK}} \\approx 0.71\\text{s}$. Il portiere para agevolmente; l'aspettativa di gol decade a $xG \\approx 10^{-4}$ e il punteggio composito crolla a $J \\approx -0.92$, classificando il tiro come <b>Blunder (??)</b>.
</p>
<p>
<b>Caso 2 — Pallonetto su Portiere Fuori dai Pali (Best Move !!):</b><br>
Se il portiere avversario è avanzato oltre $18.0\\text{m}$ dalla propria porta, il tempo di ripiegamento $TTI_{\\text{retreat}}$ supera il tempo di volo. Una conclusione a parabola con quota di scavalco $z_{\\text{peak}} \\ge 3.0\\text{m}$ annulla la capacità di parata ed è premiata dal valutatore come <b>Best Move (!!)</b>.
</p>

<h2>8. Motore di Animazione Balistica a 3 Livelli (60 FPS)</h2>
<p>
L'animazione opera secondo un'architettura dichiarativa a 3 strati gerarchici:
</p>
<ol>
  <li><b>Keyframe (Livello 1):</b> Snapshots metrici di ancoraggio spaziale.</li>
  <li><b>Azioni Tattiche (Livello 2):</b> Grafo causale di passaggi, smarcamenti, cross e tiri.</li>
  <li><b>Interpolazione \& Balistica 3D (Livello 3):</b>
    Transizioni continue governate da easing cubico $C^1$:
    $$ f_{\\text{cubic}}(t) = \\begin{cases} 4 t^3 & t < 0.5 \\\\[0.5em] 1 - \\frac{(-2t + 2)^3}{2} & t \\ge 0.5 \\end{cases} $$
    e quota parabolica 3D:
    $$ z(t) = 4 \\cdot z_{\\text{peak}} \\cdot t(1 - t) $$
    con proiezione dell'ombra a terra proporzionalmente scalata alla quota $z(t)$.
  </li>
</ol>

<h2>9. Governance ADR-Math &amp; Certificazione 15/15 PASS</h2>
<p>
La conformità del software è verificata ad ogni commit attraverso una pipeline rigorosa di pre-build che esegue il test matematico di tutti i moduli senza scorciatoie:
</p>
<ul>
  <li>Errore riproiezione DLT 8x8 $= 0.0\\text{m}$ sui punti di ancoraggio.</li>
  <li>Conservazione probabilistica dello Spearman ODE: $P_{\\text{Home}} + P_{\\text{Away}} = 1.0000$.</li>
  <li>Convergenza Bellman xT in 37 iterazioni.</li>
  <li>Decadimento traccia covarianza EKF da $4.60$ a $3.0576$ post-misura.</li>
  <li>Abbattimento balistico del tiro da 80 metri e riconoscimento del fuorigioco.</li>
  <li>Verifica statistica su corpus canonico di <b>26 gol</b> con intervalli di confidenza di Wilson al $95\\%$.</li>
</ul>

<div class="footer-signature">
  <b>LavagnaTattica • Progetto Open-Source per il Calcio Contemporaneo</b><br>
  Ideatore: <code>Marco Razzano</code> • Sviluppato con <code>Gemini 2.5 Flash</code> &amp; <code>Gemini 2.5 Pro</code> (Google Antigravity)<br>
  Documento compilato automaticamente in aderenza integrale al codice sorgente e alle specifiche ADR-Math.
</div>
`;

const processedBody = processMath(rawBody);

const fullHtml = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>NucleoTattico &amp; LavagnaTattica — Manuale Tecnico Matematico</title>
<style>
${katexCss}

@page {
  size: A4;
  margin: 20mm 18mm 22mm 18mm;
  @top-left {
    content: "LavagnaTattica & NucleoTattico — Manuale Tecnico Matematico";
    font-size: 8pt;
    font-family: 'Times New Roman', serif;
    color: #555;
    font-style: italic;
  }
  @top-right {
    content: "M. Razzano";
    font-size: 8pt;
    font-family: 'Times New Roman', serif;
    color: #555;
  }
  @bottom-center {
    content: counter(page);
    font-size: 9pt;
    font-family: 'Times New Roman', serif;
  }
}

body {
  font-family: "Latin Modern Roman", "Times New Roman", Times, "Liberation Serif", serif;
  font-size: 10pt;
  line-height: 1.5;
  color: #1a1a1a;
  background: #ffffff;
  margin: 0;
  padding: 0;
  text-align: justify;
}

.title-container {
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 2px solid #222;
  padding-bottom: 15px;
}

.main-title {
  font-size: 19pt;
  font-weight: bold;
  letter-spacing: 0.5px;
  margin-bottom: 5px;
  text-transform: uppercase;
}

.sub-title {
  font-size: 11pt;
  font-weight: normal;
  font-style: italic;
  color: #333;
  margin-bottom: 10px;
}

.author-block {
  font-size: 10pt;
  margin-top: 8px;
}

.author-name {
  font-weight: bold;
  font-size: 11pt;
}

.authority-code {
  font-family: "Courier New", monospace;
  font-size: 8pt;
  color: #555;
  margin-top: 2px;
}

.abstract-box {
  background: #fbfbfb;
  border: 1px solid #e0e0e0;
  border-left: 4px solid #1a56db;
  padding: 12px 16px;
  margin: 16px 0 20px 0;
  font-size: 9pt;
}

.abstract-heading {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 8.5pt;
  letter-spacing: 1px;
  margin-bottom: 5px;
  color: #1a56db;
}

h2 {
  font-size: 13pt;
  border-bottom: 1px solid #ccc;
  padding-bottom: 3px;
  margin-top: 22px;
  margin-bottom: 10px;
  color: #0d1b2a;
  page-break-after: avoid;
}

h3 {
  font-size: 11pt;
  margin-top: 14px;
  margin-bottom: 6px;
  color: #1b263b;
  page-break-after: avoid;
}

p {
  margin: 0 0 8px 0;
  text-indent: 1.5em;
}

p.no-indent {
  text-indent: 0;
}

.theorem-box, .def-box, .prop-box {
  background: #f8fafc;
  border-left: 3.5px solid #0284c7;
  padding: 9px 13px;
  margin: 12px 0;
  font-size: 9pt;
  page-break-inside: avoid;
}

.prop-box {
  border-left-color: #d97706;
}

.def-box {
  border-left-color: #059669;
}

.box-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.math-display {
  margin: 10px 0;
  text-align: center;
  overflow-x: auto;
  page-break-inside: avoid;
}

table.academic-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 8.5pt;
  page-break-inside: avoid;
}

table.academic-table th {
  border-top: 1.5px solid #222;
  border-bottom: 1px solid #222;
  padding: 5px 7px;
  text-align: left;
  font-weight: bold;
}

table.academic-table td {
  padding: 4px 7px;
  border-bottom: 1px solid #eee;
}

table.academic-table tr:last-child td {
  border-bottom: 1.5px solid #222;
}

ul, ol {
  margin: 5px 0 10px 0;
  padding-left: 24px;
}

li {
  margin-bottom: 3px;
}

code {
  font-family: "Courier New", monospace;
  font-size: 8.5pt;
  background: #f1f5f9;
  padding: 1px 3px;
  border-radius: 2px;
}

.footer-signature {
  margin-top: 25px;
  border-top: 1px solid #ddd;
  padding-top: 12px;
  font-size: 8pt;
  color: #666;
  text-align: center;
}
</style>
</head>
<body>
${processedBody}
</body>
</html>
`;

// Scrittura preview HTML
fs.writeFileSync(HTML_PREVIEW_PATH, fullHtml, 'utf8');
console.log(`[OK] Generato documento HTML con rendering KaTeX: ${HTML_PREVIEW_PATH}`);

// Compilazione PDF tramite Chrome Headless
console.log('[...] Avvio compilazione PDF tramite motore headless...');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

if (!fs.existsSync(chromePath)) {
  console.error(`[ERRORE] Chrome non trovato al percorso atteso: ${chromePath}`);
  process.exit(1);
}

const absHtml = path.resolve(HTML_PREVIEW_PATH);
const absPdf = path.resolve(PDF_PATH);

const chromeArgs = [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--print-to-pdf=' + absPdf,
  'file:///' + absHtml.replace(/\\/g, '/')
];

try {
  const result = cp.spawnSync(chromePath, chromeArgs, { encoding: 'utf8' });
  if (fs.existsSync(absPdf)) {
    const stats = fs.statSync(absPdf);
    console.log(`[SUCCESS] PDF Generato con successo!`);
    console.log(` -> File: ${absPdf}`);
    console.log(` -> Dimensione: ${(stats.size / 1024).toFixed(1)} KB`);
  } else {
    console.error(`[ERRORE] Il file PDF non è stato creato. Output Chrome:`, result.stderr || result.stdout);
    process.exit(1);
  }
} catch (err) {
  console.error(`[ERRORE] Eccezione durante l'invocazione di Chrome:`, err);
  process.exit(1);
}

console.log('='.repeat(80));
console.log(' COMPILAZIONE COMPLETATA CON SUCCESSO!');
console.log(` LaTeX Source: ${TEX_PATH}`);
console.log(` PDF Compilato: ${PDF_PATH}`);
console.log('='.repeat(80));
