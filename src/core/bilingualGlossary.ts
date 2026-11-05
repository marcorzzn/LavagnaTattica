/**
 * LavagnaTattica — Glossario Tecnico Bilingue (IT / EN) & Tassonomia Spaziale
 * Fonte di Verità Unica per l'i18n, la Schermata Teoria e le annotazioni tattiche.
 * Autorità Matematica Suprema: Marco Razzano (0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY)
 */

export interface BilingualGlossaryEntry {
  id: string;
  category: 'metric' | 'spatial' | 'tactical' | 'physical' | 'methodology';
  termIT: string;
  termEN: string;
  shortLabel: string;
  generation?: '1G' | '2G' | '3G' | 'Tactical';
  definitionIT: string;
  definitionEN: string;
  tacticalUsageIT: string;
  tacticalUsageEN: string;
  mathFormula?: string;
  source: string;
}

export const BILINGUAL_TACTICAL_GLOSSARY: BilingualGlossaryEntry[] = [
  {
    id: 'expected-threat',
    category: 'metric',
    termIT: 'Expected Threat (Minaccia Prevista - xT)',
    termEN: 'Expected Threat (xT)',
    shortLabel: 'xT',
    generation: '3G',
    definitionIT: 'Modello probabilistico basato su una catena di Markov a stati assorbenti su griglia spaziale che quantifica quanto un passaggio o una conduzione aumenti la probabilità che la squadra segni nelle successive N azioni.',
    definitionEN: 'Probabilistic absorbing Markov chain model over a spatial grid that quantifies how much a pass or carry increases the probability of scoring in the next N actions.',
    tacticalUsageIT: 'Valuta i costruttori di gioco e le mezzali capaci di far avanzare il possesso verso zone a più alto potenziale offensivo prima dell’ultimo passaggio.',
    tacticalUsageEN: 'Evaluates playmakers and central midfielders advancing possession into higher threat zones before the final ball.',
    mathFormula: 'xT_{r,c} = S_{r,c} \\cdot G_{r,c} + M_{r,c} \\sum_{r\'=1}^{N_r} \\sum_{c\'=1}^{N_c} T_{(r,c) \\to (r\',c\')} xT_{r\',c\'}',
    source: 'Karun Singh (2018) — Introducing Expected Threat'
  },
  {
    id: 'pitch-control',
    category: 'metric',
    termIT: 'Controllo dello Spazio (Pitch Control)',
    termEN: 'Pitch Control (PPCF)',
    shortLabel: 'PC',
    generation: '3G',
    definitionIT: 'Modello stocastico continuo basato sull’integrazione di equazioni differenziali del tempo di intercettazione (TTI), che assegna a ogni punto del campo la probabilità che una squadra ne prenda il controllo prima dell’avversario.',
    definitionEN: 'Continuous stochastic differential equation model based on Time-To-Intercept (TTI), assigning each pitch coordinate the probability of a team securing control before opponents.',
    tacticalUsageIT: 'Misura il dominio territoriale istantaneo, la compattezza dei blocchi difensivi e l’apertura di corridoi di passaggio.',
    tacticalUsageEN: 'Quantifies instantaneous territorial dominance, defensive compactness, and available passing lanes.',
    mathFormula: '\\frac{dPPCF_j}{dt} = \\left(1 - \\sum_k PPCF_k(t)\\right) f_j(t; \\vec{r}, TTI_j) \\lambda_j',
    source: 'William Spearman (2018) — Beyond Expected Goals, MIT Sloan Sports Analytics'
  },
  {
    id: 'fiedler-connectivity',
    category: 'metric',
    termIT: 'Connettività Algebrica di Fiedler (Resilienza Spettrale)',
    termEN: 'Fiedler Algebraic Connectivity (Spectral Resilience)',
    shortLabel: 'λ₂',
    generation: '3G',
    definitionIT: 'Il secondo autovalore più piccolo del Laplaciano pesato del grafo di passaggio L = D - W. Misura la robustezza della rete di passaggio al pressing e l’assenza di colli di bottiglia.',
    definitionEN: 'The second smallest eigenvalue of the weighted graph Laplacian L = D - W. Quantifies passing network robustness against pressing and the absence of cut-off bottlenecks.',
    tacticalUsageIT: 'Un λ₂ alto (> 0.40) certifica che nessun raddoppio o trappola di pressing può disconnettere facilmente la linea di costruzione dai trequartisti.',
    tacticalUsageEN: 'High λ₂ (> 0.40) proves that no single pressing trap can disconnect build-up lines from creative attacking midfielders.',
    mathFormula: 'L = D - W, \\quad \\lambda_2(L) = \\min_{x \\perp \\mathbf{1}, x \\neq 0} \\frac{x^T L x}{x^T x}',
    source: 'Buldú et al. (2018) — Network Science in Football, Scientific Reports'
  },
  {
    id: 'half-space',
    category: 'spatial',
    termIT: 'Mezzo-Spazio (Half-Space / Corridoio Intermedio)',
    termEN: 'Half-Space (Intermediate Corridor)',
    shortLabel: 'HS',
    generation: 'Tactical',
    definitionIT: 'I due corridoi longitudinali situati tra la fascia laterale e la corsia centrale, che offrono l’angolo geometrico ideale di diagonale e visione porta senza la congestione del centro.',
    definitionEN: 'The two longitudinal pitch channels situated between the wing and central corridor, providing ideal diagonal passing angles with less congestion.',
    tacticalUsageIT: 'Zona primaria di invasione per mezzali offensive, trequartisti e terzini invertiti per scardinare difese a 4 o 5 uomini.',
    tacticalUsageEN: 'Primary invasion corridor for interior midfielders, inverted fullbacks, and playmakers to unbalance low defensive blocks.',
    mathFormula: 'y \\in [13.6\\text{m}, 27.2\\text{m}] \\cup [40.8\\text{m}, 54.4\\text{m}]',
    source: 'Spielverlagerung & Coverciano Settore Tecnico (2014)'
  },
  {
    id: 'zone-14',
    category: 'spatial',
    termIT: 'Zona 14 (Tasca Centrale di Rifinitura)',
    termEN: 'Zone 14 (Central Attacking Pocket)',
    shortLabel: 'Z14',
    generation: 'Tactical',
    definitionIT: 'La cella centrale antistante l’area di rigore avversaria nella griglia standard 18-zone, considerata la tasca a più alto tasso di conversione per assist filtranti.',
    definitionEN: 'The central area immediately outside the opponent penalty box in the standard 18-zone pitch partition, delivering the highest pass-to-shot conversion rate.',
    tacticalUsageIT: 'Occupata dal trequartista associativo o dal centravanti in raccordo per attirare centrali difensivi e liberare gli inserimenti ciechi.',
    tacticalUsageEN: 'Occupied by attacking midfielders or dropping strikers to draw center-backs and release blindside runners.',
    mathFormula: 'x \\in [84\\text{m}, 102\\text{m}], \\quad y \\in [27.2\\text{m}, 40.8\\text{m}]',
    source: 'Horn et al. (2002) — The Key to Success in Football (Zone 14)'
  },
  {
    id: 'ppda',
    category: 'metric',
    termIT: 'Intensità di Pressing (PPDA - Passaggi per Azione Difensiva)',
    termEN: 'Pressing Intensity (PPDA - Passes per Defensive Action)',
    shortLabel: 'PPDA',
    generation: '2G',
    definitionIT: 'Rapporto tra il numero di passaggi concessi all’avversario nei primi 60% del campo e le azioni difensive proattive (tackle, intercetti, falli, sfide) tentate.',
    definitionEN: 'Ratio of opponent passes allowed in their defensive 60% of the pitch to proactive defensive actions (tackles, interceptions, fouls, duels).',
    tacticalUsageIT: 'Un valore PPDA basso (< 8.0) denota pressing ultra-aggressivo alto (stile gegenpressing); un valore alto (> 14.0) indica blocco medio-basso attendista.',
    tacticalUsageEN: 'Low PPDA (< 8.0) indicates aggressive high gegenpressing; high PPDA (> 14.0) indicates a conservative mid/low block.',
    mathFormula: '\\text{PPDA} = \\frac{\\text{Passaggi concessi (primi 60\\% campo)}}{\\text{Tackle} + \\text{Intercetti} + \\text{Falli commessi}}',
    source: 'Colin Trainor (2014) — Defensive Metrics: PPDA, StatsBomb'
  },
  {
    id: 'packing-rate',
    category: 'metric',
    termIT: 'Indice di Packing (Giocatori Fuori Causa)',
    termEN: 'Packing Rate (Opponents Taken Out of Play)',
    shortLabel: 'Pack',
    generation: '3G',
    definitionIT: 'Numero di avversari scavalcati verticalmente tra la linea della palla prima del passaggio e la linea della palla al momento della ricezione riuscita.',
    definitionEN: 'Number of opposing defenders vertically bypassed between the ball line before a pass and the receiving line on completion.',
    tacticalUsageIT: 'Quantifica l’efficacia verticale dei difensori centrali di impostazione e dei mediani metodisti nel superare le linee di pressione.',
    tacticalUsageEN: 'Measures vertical progression efficiency of ball-playing center-backs and pivots taking opponents out of play.',
    mathFormula: '\\text{Packing} = \\sum_{k \\in \\text{Opp}} \\mathbb{I}\\left(x_{\\text{orig}} < x_k \\le x_{\\text{dest}}\\right)',
    source: 'Stefan Reinartz & Jens Hegeler (2016) — Impect Analytics'
  },
  {
    id: 'third-man-run',
    category: 'tactical',
    termIT: 'Principio del Terzo Uomo',
    termEN: 'Third Man Principle',
    shortLabel: '3rd Man',
    generation: 'Tactical',
    definitionIT: 'Combinazione geometrica in cui il giocatore A trasmette palla a B (che attira la pressione) per favorire l’inserimento cieco e in corsa di C su linea di passaggio libera.',
    definitionEN: 'Geometric sequence where player A passes to player B (drawing press) to release a blindside third runner C into space.',
    tacticalUsageIT: 'Fondamentale per superare blocchi bassi o mediani a uomo (es. De Zerbi, Guardiola, Sarri) perché il difensore non può marcare palla e terzo uomo contemporaneamente.',
    tacticalUsageEN: 'Essential combination to dismantle man-marking or compact blocks; the defender cannot track the ball and the blindside runner simultaneously.',
    source: 'Settore Tecnico FIGC & Pep Guardiola (Positional Play)'
  },
  {
    id: 'gegenpressing',
    category: 'tactical',
    termIT: 'Contro-Pressing Immediato (Gegenpressing)',
    termEN: 'Counter-Pressing (Gegenpressing)',
    shortLabel: 'Gegen',
    generation: 'Tactical',
    definitionIT: 'Aggressione immediata e corale dei giocatori più vicini alla palla nei primi 5 secondi dalla transizione negativa per riconquistare il possesso in zona alta.',
    definitionEN: 'Immediate collective pressing of the nearest players within 5 seconds of ball turnover to regain possession in high pitch areas.',
    tacticalUsageIT: 'Trasforma la perdita del possesso nella migliore opportunità di contrattacco rapido a difesa avversaria sbilanciata.',
    tacticalUsageEN: 'Converts loss of possession into the most dangerous playmaking opportunity against an unsettled defense.',
    source: 'Jürgen Klopp & Ralf Rangnick (German Gegenpressing School)'
  },
  {
    id: 'build-up',
    category: 'tactical',
    termIT: 'Costruzione dal Basso (Build-Up)',
    termEN: 'Build-Up from the Back',
    shortLabel: 'Build-Up',
    generation: 'Tactical',
    definitionIT: 'Fase di inizio azione che coinvolge portiere, difensori centrali e mediano metodista con circolazione palla paziente volta a provocare il pressing avversario.',
    definitionEN: 'Initial possession phase involving goalkeeper, center-backs and pivot to provoke opponent press and generate numerical superiority behind lines.',
    tacticalUsageIT: 'Permette di attirare il blocco avversario in avanti creando spazio per filtranti verso le mezzali nei mezzi-spazi.',
    tacticalUsageEN: 'Draws the opponent block forward to create vertical gaps for intermediate corridor passes.',
    source: 'FIGC / UEFA Pro Coaching Syllabus'
  },
  {
    id: 'cutback',
    category: 'tactical',
    termIT: 'Passaggio a Rimorchio (Cutback)',
    termEN: 'Cutback Pass',
    shortLabel: 'Cutback',
    generation: 'Tactical',
    definitionIT: 'Passaggio arretrato rasoterra eseguito dal fondo del campo verso il dischetto del rigore o il limite dell’area contro il senso di corsa dei difensori.',
    definitionEN: 'Ground pullback pass from the byline toward the penalty spot against the backward running momentum of defenders.',
    tacticalUsageIT: 'Genera tiri con elevato xG perché coglie i difensori a corpo orientato verso la linea di porta e liberi al tiro i centrocampisti a rimorchio.',
    tacticalUsageEN: 'Produces high-xG opportunities by catching defenders tracking back towards goal and freeing trailing midfielders.',
    source: 'Maurizio Sarri & Roberto De Zerbi Tactical Playbooks'
  },
  {
    id: 'rest-defense',
    category: 'tactical',
    termIT: 'Marcatura / Difesa Preventiva (Rest Defense)',
    termEN: 'Rest Defense (Rest Prophylaxis)',
    shortLabel: 'Rest-Def',
    generation: 'Tactical',
    definitionIT: 'Schieramento e posizionamento dei giocatori non direttamente coinvolti nel possesso avanzato, preposti a bloccare le linee di fuga e transizioni avversarie.',
    definitionEN: 'Structural positioning of non-possessing players during attack, tasked with securing zones and suffocating opponent transition paths.',
    tacticalUsageIT: 'Configurazione tipica 3+2 o 2+3 per prevenire ripartenze fulminee e sostenere il contro-pressing.',
    tacticalUsageEN: 'Typically a 3+2 or 2+3 structure to thwart quick counterattacks and sustain continuous pressure.',
    source: 'René Marić (2017) — Rest Defense Dynamics'
  },
  {
    id: 'effective-resistance',
    category: 'metric',
    termIT: 'Resistenza Efficace Media (R_eff di Kirchhoff)',
    termEN: 'Mean Effective Resistance (Kirchhoff R_eff)',
    shortLabel: 'R_eff',
    generation: '3G',
    definitionIT: 'Metrica spettrale che modella la squadra come una rete elettrica in cui la conduttanza dei passaggi determina la facilità con cui la palla fluisce tra due giocatori.',
    definitionEN: 'Spectral metric modeling the team as an electrical network where passing conductances determine flow ease between player nodes.',
    tacticalUsageIT: 'Valori bassi (< 3.0Ω) indicano circolazione fluida e molteplici percorsi alternativi se un corridoio viene chiuso.',
    tacticalUsageEN: 'Low values (< 3.0Ω) denote fluid circulation with redundant passing alternatives if a corridor is blocked.',
    mathFormula: 'R_{\\text{eff}}(i, j) = (e_i - e_j)^T L^{\\dagger} (e_i - e_j), \\quad \\bar{R}_{\\text{eff}} = \\frac{2}{n-1} \\sum_{k=2}^n \\frac{1}{\\lambda_k}',
    source: 'Klein & Randić (1993) / Schaub et al. (2014)'
  },
  {
    id: 'sliced-wasserstein',
    category: 'metric',
    termIT: 'Distanza di Wasserstein-1 (Trasporto Ottimo)',
    termEN: 'Sliced Wasserstein Distance (Optimal Transport)',
    shortLabel: 'W₁',
    generation: '3G',
    definitionIT: 'Costo geometrico minimo necessario per deformare la disposizione spaziale attuale della squadra nello schieramento ideale di riferimento.',
    definitionEN: 'Minimal geometric cost required to morph current on-pitch player distribution into the canonical benchmark shape.',
    tacticalUsageIT: 'Misura lo sfilacciamento dei reparti durante le transizioni difensive rispetto al blocco compatto teorico.',
    tacticalUsageEN: 'Quantifies defensive block dislocation during transitions compared to the canonical tactical reference.',
    mathFormula: 'SW_1(\\mu, \\nu) = \\frac{1}{|\\Theta|} \\sum_{\\theta \\in \\Theta} \\int_0^1 |F_{\\theta\\#\\mu}^{-1}(u) - F_{\\theta\\#\\nu}^{-1}(u)| du',
    source: 'Villani (2008) / Kolouri et al. (2019)'
  },
  {
    id: 'time-to-intercept',
    category: 'physical',
    termIT: 'Tempo di Intercettazione (TTI Balistico)',
    termEN: 'Time-To-Intercept (Kinematic TTI)',
    shortLabel: 'TTI',
    generation: '3G',
    definitionIT: 'Tempo minimo necessario affinché un calciatore raggiunga una coordinata target, combinando tempo di reazione neurale, inerzia vettoriale e accelerazione finita.',
    definitionEN: 'Minimum time required for a player to reach a target coordinate, combining reaction time, vector inertia, and finite acceleration.',
    tacticalUsageIT: 'Determina l’efficacia delle uscite del portiere sweeper e dei recuperi preventivi dei difensori centrali veloci.',
    tacticalUsageEN: 'Governs sweeper keeper sweep radius and recovery pace of central defenders in defensive transitions.',
    mathFormula: 'TTI(p, z) = \\tau_{\\text{react}} + \\frac{\\|z - (x_p + v_p \\tau_{\\text{react}})\\|_2}{v_{\\max}(p)}',
    source: 'Spearman (2018) / Fernández & Bornn (2018)'
  },
  {
    id: 'chess-evaluation-score',
    category: 'metric',
    termIT: 'Score di Valutazione Composita Stile Chess.com',
    termEN: 'Chess-Style Tactical Evaluation Score',
    shortLabel: 'J(a|s)',
    generation: '3G',
    definitionIT: 'Funzionale scalare convesso che calcola il valore complessivo di una scelta di gioco combinando guadagno territoriale, probabilità di riuscita e variazione spettrale.',
    definitionEN: 'Convex scalar functional scoring any tactical action by balancing territorial progression, completion probability, and network connectivity changes.',
    tacticalUsageIT: 'Assegna a ogni tocco la qualifica visiva (**Best Move (!!)**, Good Move (!), Inaccuracy (?!), Mistake (?)) ordinando le Top-3 alternative scartate.',
    tacticalUsageEN: 'Assigns qualitative badges (**Best Move (!!)**, Good Move (!), Inaccuracy (?!), Mistake (?)) and ranks top-3 counterfactual alternatives.',
    mathFormula: 'J(a \\mid s) = w_{xT} \\Delta xT + w_P P_{\\text{succ}} + w_{\\lambda} \\Delta \\lambda_2 - \\text{Risk}',
    source: 'ADR-Math-003 firmato Marco Razzano'
  },
  {
    id: 'hybrid-libero',
    category: 'tactical',
    termIT: 'Inversione del Libero Moderno',
    termEN: 'Hybrid Libero Drop (Salida Lavolpiana)',
    shortLabel: 'Libero Drop',
    generation: 'Tactical',
    definitionIT: 'Movimento del vertice basso di centrocampo che si abbassa tra i due difensori centrali creando una linea a tre in fase di prima costruzione.',
    definitionEN: 'Tactical lowering of the defensive midfielder between center-backs to create a back-three in early build-up.',
    tacticalUsageIT: 'Garantisce superiorità numerica +1 contro la prima linea di pressione a due punte aprendo gli angoli di passaggio verso i terzini alti.',
    tacticalUsageEN: 'Secures +1 numerical advantage against a 2-forward press, opening wide passing angles to advanced fullbacks.',
    source: 'Ricardo La Volpe / Pep Guardiola Tactics'
  },
  {
    id: 'overload-to-isolate',
    category: 'tactical',
    termIT: 'Sovraccarico per Isolare (Overload to Isolate)',
    termEN: 'Overload to Isolate',
    shortLabel: 'Overload',
    generation: 'Tactical',
    definitionIT: 'Concentrazione densa di giocatori e passaggi corti su una fascia per attrarre la struttura difensiva avversaria, seguita da cambio di campo rapido sul lato debole.',
    definitionEN: 'Concentrating players and short passes on one flank to compress the defensive block, followed by an immediate switch to an isolated 1v1 winger.',
    tacticalUsageIT: 'Crea situazioni di duello 1v1 ad altissimo vantaggio qualitativo per l’ala isolata sul lato opposto.',
    tacticalUsageEN: 'Creates maximum-advantage 1v1 isolation duels for the opposite winger in space.',
    source: 'Cruyff & Guardiola Positional Play Principles'
  },
  {
    id: 'blindside-run',
    category: 'tactical',
    termIT: 'Taglio Cieco (Blindside Run)',
    termEN: 'Blindside Run',
    shortLabel: 'Blindside',
    generation: 'Tactical',
    definitionIT: 'Scatto in profondità eseguito alle spalle del difensore nel suo cono visivo cieco, impedendogli di controllare contemporaneamente palla e uomo.',
    definitionEN: 'Forward run executed behind the defender outside their field of vision, preventing simultaneous ball and marker tracking.',
    tacticalUsageIT: 'Sfruttato da ali invertite e punte di profondità su filtranti diagonali partiti dall’half-space opposto.',
    tacticalUsageEN: 'Utilized by inverted wingers and mobile strikers onto diagonal through balls from the opposite half-space.',
    source: 'Coverciano Settore Tecnico (Fasi di Smarcamento)'
  },
  {
    id: 'compactness-betti',
    category: 'metric',
    termIT: 'Numero di Betti β₀ & Compattezza Topologica',
    termEN: 'Betti Number β₀ & Topological Compactness',
    shortLabel: 'β₀',
    generation: '3G',
    definitionIT: 'Misura il numero di componenti connesse di un blocco difensivo al variare della distanza di prossimità ε tramite complessi di Vietoris-Rips.',
    definitionEN: 'Measures the number of connected spatial clusters of a defensive block across scale parameter ε via Vietoris-Rips complexes.',
    tacticalUsageIT: 'Un β₀ = 1 a raggio ridotto certifica compattezza orizzontale e verticale priva di spaccature tra difesa e centrocampo.',
    tacticalUsageEN: 'A stable β₀ = 1 at small radii confirms strict horizontal and vertical compactness between midfield and back lines.',
    mathFormula: '\\beta_0 = \\text{dim}(H_0(\\text{VR}(P, \\epsilon)))',
    source: 'Edelsbrunner & Harer (2010) / Dłotko et al. (2022)'
  }
];

export function getBilingualGlossaryEntry(id: string): BilingualGlossaryEntry | undefined {
  return BILINGUAL_TACTICAL_GLOSSARY.find((e) => e.id === id);
}

export function searchBilingualGlossary(query: string, lang: 'it' | 'en' = 'it'): BilingualGlossaryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return BILINGUAL_TACTICAL_GLOSSARY;
  return BILINGUAL_TACTICAL_GLOSSARY.filter((entry) => {
    if (lang === 'it') {
      return (
        entry.termIT.toLowerCase().includes(q) ||
        entry.shortLabel.toLowerCase().includes(q) ||
        entry.definitionIT.toLowerCase().includes(q) ||
        entry.tacticalUsageIT.toLowerCase().includes(q)
      );
    }
    return (
      entry.termEN.toLowerCase().includes(q) ||
      entry.shortLabel.toLowerCase().includes(q) ||
      entry.definitionEN.toLowerCase().includes(q) ||
      entry.tacticalUsageEN.toLowerCase().includes(q)
    );
  });
}
