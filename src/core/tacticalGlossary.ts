/**
 * OpenPitch — Glossario Metriche & Tassonomia Tattica Verificabile
 *
 * Tutte le metriche di 2ª e 3ª generazione con formule matematiche esatte,
 * interpretazione tattica sul campo, generazione evolutiva e citazione della fonte ufficiale.
 */

export interface GlossaryMetricEntry {
  id: string;
  name: string;
  shortLabel: string;
  category: 'metric' | 'spatial' | 'tactical';
  generation: '2G' | '3G' | 'Tactical';
  definition: string;
  tacticalUsage: string;
  formula?: string;
  source: string;
  url: string;
}

export const TACTICAL_GLOSSARY: GlossaryMetricEntry[] = [
  {
    id: 'xg',
    name: 'Expected Goals (xG)',
    shortLabel: 'xG',
    category: 'metric',
    generation: '2G',
    definition:
      'Probabilità condizionata (0.00–1.00) che un tiro si trasformi in rete in base a distanza dalla porta, angolo di visuale dello specchio (7.32m), parte del corpo, tipo di assist e situazione di gioco.',
    tacticalUsage:
      'Misura la qualità intrinseca delle occasioni create o concesse, depurandola dalla varianza realizzativa casuale nel breve periodo.',
    formula: 'P(Goal | d, θ, body, assist) = 1 / (1 + e^-(β₀ + β₁·d + β₂·θ + ...))',
    source: 'StatsBomb Open Data / Opta Event Definitions',
    url: 'https://www.statsperform.com/opta-event-definitions/',
  },
  {
    id: 'xgot',
    name: 'Expected Goals on Target (xGOT / PSxG)',
    shortLabel: 'xGOT',
    category: 'metric',
    generation: '2G',
    definition:
      'Valuta la qualità di un tiro nello specchio dopo l’impatto con il pallone, incorporando la traiettoria finale (coordinate di arrivo nella porta) e la velocità.',
    tacticalUsage:
      'Quantifica il valore aggiunto dell’esecuzione balistica del finalizzatore (xGOT − xG) e il rendimento di shot-stopping del portiere.',
    formula: 'P(Goal | xG_pre, end_y, end_z, gk_pos)',
    source: 'Stats Perform / Opta Post-Shot Model',
    url: 'https://www.statsperform.com/resource/introducing-expected-goals-on-target-xgot/',
  },
  {
    id: 'xa',
    name: 'Expected Assists (xA)',
    shortLabel: 'xA',
    category: 'metric',
    generation: '2G',
    definition:
      'Probabilità che un passaggio completato diventi un assist da gol, valutando coordinate di partenza/destinazione, pressione difensiva e traiettoria della palla.',
    tacticalUsage:
      'Premia la qualità oggettiva della rifinitura negli half-spaces e tra le linee, indipendentemente dalla finalizzazione del ricevitore.',
    formula: 'Σ P(Goal | pass_vector, zone_entry, pressure_flag)',
    source: 'Opta / Socceraction SPADL',
    url: 'https://socceraction.readthedocs.io/',
  },
  {
    id: 'xt',
    name: 'Expected Threat (xT)',
    shortLabel: 'xT',
    category: 'metric',
    generation: '3G',
    definition:
      'Modello a catena di Markov discretizzato su griglia che quantifica la pericolosità di ogni cella del campo e calcola il guadagno di pericolosità muovendo la palla da (x₁, y₁) a (x₂, y₂) tramite passaggio o conduzione.',
    tacticalUsage:
      'Valuta il contributo determinante nella risalita del campo, nel superamento del pressing avversario e nella progressione prima dell’assist finale.',
    formula: 'xT(x,y) = s(x,y)·g(x,y) + m(x,y)·Σ T_{(x,y)→(z,w)} xT(z,w)',
    source: 'Karun Singh (2018) — Introducing Expected Threat',
    url: 'https://karun.in/blog/introducing-expected-threat.html',
  },
  {
    id: 'ppda',
    name: 'Passes Allowed Per Defensive Action (PPDA)',
    shortLabel: 'PPDA',
    category: 'metric',
    generation: '3G',
    definition:
      'Rapporto tra i passaggi riusciti della squadra in costruzione e il numero di interventi difensivi (tackle, intercetti, falli, contrasti) della squadra difendente negli ultimi 60 metri di campo.',
    tacticalUsage:
      'Misura l’altezza e la ferocia del pressing: valori inferiori a 8.0 indicano un gegenpressing aggressivo orientato sulla palla (stile Klopp o Guardiola).',
    formula: 'Passaggi Squadra in Costruzione (X ∈ [40,105]) / (Tackle + Intercetti + Falli)',
    source: 'Colin Trainor (2014) / StatsBomb',
    url: 'https://statsbomb.com/articles/soccer/defensive-metrics-measuring-the-intensity-of-a-high-press/',
  },
  {
    id: 'half-space',
    name: 'Mezzo-Spazio (Half-Space / Zwischenlinienraum)',
    shortLabel: 'Half-Space',
    category: 'spatial',
    generation: 'Tactical',
    definition:
      'I due corridoi longitudinali compresi tra la corsia laterale esterna e il corridoio centrale (Y ∈ [14, 30]m e Y ∈ [38, 54]m su campo 68m).',
    tacticalUsage:
      'Zona fondamentale per ricevere con orientamento del corpo diagonale, aprendo la visuale sia verso la porta sia verso il lato debole per il cambio gioco.',
    source: 'Spielverlagerung / René Marić (2014)',
    url: 'https://spielverlagerung.com/2014/09/16/the-half-spaces/',
  },
  {
    id: 'packing',
    name: 'Packing (Avversari Superati / Impect)',
    shortLabel: 'Packing',
    category: 'metric',
    generation: '3G',
    definition:
      'Numero totale di giocatori avversari (o difensori) scavalcati longitudinalmente tra il momento del rilascio e quello della ricezione di un passaggio o di una conduzione palla al piede.',
    tacticalUsage:
      'Misura la capacità di perforare le linee di pressione con passaggi verticali diretti (line-breaking passes).',
    formula: 'Σ I(x_partenza < x_avversario < x_ricezione)',
    source: 'Stefan Reinartz & Jens Hegeler (2016) / Impect GmbH',
    url: 'https://www.impect.com/',
  },
  {
    id: 'pitch-control',
    name: 'Pitch Control (Dominio Spaziale Probabilistico)',
    shortLabel: 'Pitch Control',
    category: 'spatial',
    generation: '3G',
    definition:
      'Modello fisico basato su equazioni differenziali (ODE) che calcola la probabilità che una squadra controlli la palla se questa arrivasse in un punto (x,y), calcolando il tempo minimo di intercettazione (TTI) di ciascun giocatore considerando posizione, velocità e tempo di reazione.',
    tacticalUsage:
      'Mappa le finestre di passaggio aperte, gli spazi dominati e le vulnerabilità strutturali alle spalle dei reparti difensivi.',
    formula: 'PC(r, t) = ∫ P_arrival(Squadra A, r, τ) · (1 - F_B(r, τ)) dτ',
    source: 'William Spearman (2017) — MIT Sloan Sports Analytics Conference',
    url: 'https://www.sloansportsconference.com/',
  },
  {
    id: 'fiedler-eigenvalue',
    name: 'Resilienza Spettrale della Rete (Autovalore di Fiedler λ₂)',
    shortLabel: 'Fiedler λ₂',
    category: 'metric',
    generation: '3G',
    definition:
      'Secondo autovalore più piccolo del Laplaciano normalizzato della rete di passaggi (L = D - A). Misura la connettività algebrica e la robustezza globale della squadra.',
    tacticalUsage:
      'Un valore λ₂ elevato (> 0.25) certifica che la squadra non dipende da un singolo regista: se un canale viene bloccato dalla marcatura avversaria, la rete conserva percorsi alternativi.',
    formula: 'λ₂ = min_{x ⊥ 1, x ≠ 0} (x^T L x) / (x^T D x)',
    source: 'Miroslav Fiedler (1973) / Graph Theory & Pass Networks',
    url: 'https://en.wikipedia.org/wiki/Algebraic_connectivity',
  },
  {
    id: 'build-up',
    name: 'Costruzione dal Basso & Provocazione (Baiting)',
    shortLabel: 'Build-Up',
    category: 'tactical',
    generation: 'Tactical',
    definition:
      'Fase di prima impostazione difensiva (X < 35m) volta ad attirare volontariamente la prima linea di pressione avversaria con passaggi corti per liberare spazio alle spalle.',
    tacticalUsage:
      'Richiede superiorità posizionale (es. 3+2 o coinvolgimento attivo del portiere) per creare l’uomo libero tra le linee (terzo uomo).',
    source: 'Roberto De Zerbi / Manuale UEFA Pro Coverciano',
    url: 'https://www.settoretecnico.figc.it/',
  },
];

