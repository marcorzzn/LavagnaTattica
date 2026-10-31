/**
 * LavagnaTattica — Laboratorio Didattico & Percorsi Tattici
 *
 * Percorsi guidati con caricamento diretto sulla lavagna tattica,
 * quiz situazionali sul campo, puzzle con vincoli di passaggio a 3 tocchi (terzo uomo),
 * flashcards con persistenza locale IndexedDB e confronto strutturale tra formazioni.
 */

import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  GitCompare,
  HelpCircle,
  Plus,
  Puzzle,
  Sparkles,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { FormationPreset } from '../../core/types';
import { useStudioStore } from '../../stores/studioStore';
import {
  listFlashcardsFromIdb,
  saveFlashcardToIdb,
  deleteFlashcardFromIdb,
  SavedFlashcard,
} from '../../lib/idb';

interface GuidedLesson {
  id: string;
  track: 'Possesso & Rotazioni' | 'Transizioni & Gegenpressing' | 'Calci Piazzati & Palle Inattive';
  title: string;
  duration: string;
  summary: string;
  keyConcept: string;
  formationHome: FormationPreset;
  formationAway: FormationPreset;
  takeaways: string[];
}

const GUIDED_LESSONS: GuidedLesson[] = [
  {
    id: 'les_01',
    track: 'Possesso & Rotazioni',
    title: '01. Creare Superiorità 3v2 nell’Half-Space Sinistro',
    duration: '6 min',
    summary:
      'Come la rotazione tra terzino fluidificante in sovrapposizione, mezzala d’inserimento e ala invertita genera un uomo libero tra le linee avversarie.',
    keyConcept: 'Half-Space & Expected Threat (+0.075 xT)',
    formationHome: '4-3-3',
    formationAway: '4-4-2',
    takeaways: [
      'L’Ala Invertita riceve sui piedi dentro il campo per attrarre il terzino avversario fuori posizione.',
      'La corsia esterna si apre per la sovrapposizione in corsa del Terzino Fluidificante.',
      'Il passaggio diagonale nel mezzo-spazio incrementa l’xT di +0.08 rispetto al ricircolo orizzontale.',
    ],
  },
  {
    id: 'les_02',
    track: 'Transizioni & Gegenpressing',
    title: '02. Gegenpressing dei 5 Secondi & Copertura Preventiva',
    duration: '5 min',
    summary:
      'Struttura delle marcature preventive dei due difensori centrali e del metodista per mantenere un PPDA inferiore a 7.5 dopo la perdita del possesso.',
    keyConcept: 'PPDA & Pitch Control Difensivo',
    formationHome: '4-2-3-1',
    formationAway: '3-5-2',
    takeaways: [
      'Distanza massima longitudinale tra i reparti inferiore a 28 metri (blocco compatto sacchiano).',
      'Chiusura immediata del corridoio centrale per forzare il lancio lungo e sporco verso le fasce.',
      'Il recupero palla entro 25 metri dalla porta avversaria raddoppia l’xG medio della sequenza d’attacco successiva.',
    ],
  },
  {
    id: 'les_03',
    track: 'Calci Piazzati & Palle Inattive',
    title: '03. Blocchi sul Primo Palo & Attacco al Secondo su Corner a Uscire',
    duration: '4 min',
    summary:
      'Separazione tra zona di schermatura sul portiere nell’area piccola e terzo uomo che attacca il dischetto in corsa.',
    keyConcept: 'xG da Palla Inattiva & Zone d’Occupazione',
    formationHome: '3-5-2',
    formationAway: '4-4-2',
    takeaways: [
      'Due saltatori portano via i marcatori a uomo sul primo palo.',
      'Il tiratore calcia teso verso il dischetto del rigore dove il centrale difensivo arriva in corsa cieca.',
    ],
  },
];

interface TacticalQuiz {
  id: string;
  question: string;
  scenarioDescription: string;
  options: Array<{ id: string; text: string; isCorrect: boolean; explanation: string }>;
}

const TACTICAL_QUIZZES: TacticalQuiz[] = [
  {
    id: 'qz_1',
    question: 'Trova il passaggio chiave: contro un 4-4-2 compatto e stretto, quale scelta massimizza l’Expected Threat (xT)?',
    scenarioDescription:
      'Il Regista Vertice Basso ha il pallone nel cerchio di centrocampo con la linea dei mediani avversari schiacciata a protezione del centro.',
    options: [
      {
        id: 'a',
        text: 'Retropassaggio di sicurezza al centrale difensivo (X=34, Y=40)',
        isCorrect: false,
        explanation: 'Riduce l’xT (-0.012) e permette al blocco avversario di risalire.',
      },
      {
        id: 'b',
        text: 'Imbucata filtrante per la mezzala nell’half-space sinistro alle spalle dei mediani (X=72, Y=26)',
        isCorrect: true,
        explanation:
          'Corretto! Supera 4 avversari (Packing = 4) e porta la palla in una cella ad alto valore xT (+0.074).',
      },
      {
        id: 'c',
        text: 'Tiro diretto da 38 metri centrali con difesa schierata',
        isCorrect: false,
        explanation: 'Ha una probabilità xG inferiore a 0.02 e regala il possesso agli avversari.',
      },
    ],
  },
  {
    id: 'qz_2',
    question: 'Linea difensiva su palla scoperta: il regista avversario ha tempo e spazio senza pressione. Cosa deve fare la linea a 4?',
    scenarioDescription:
      'Palla scoperta sui piedi del regista avversario con due attaccanti rapidi pronti a scattare in profondità.',
    options: [
      {
        id: 'a',
        text: 'Alzare la linea del fuorigioco correndo tutti in avanti',
        isCorrect: false,
        explanation: 'Su palla scoperta è un errore fatale: il lancio lungo scavalcherebbe la linea trovando 40 metri di campo aperto.',
      },
      {
        id: 'b',
        text: 'Orientare il corpo a 45° e scappare preventivamente di 6–8 metri coprendo la profondità',
        isCorrect: true,
        explanation:
          'Esatto! Con palla scoperta la priorità assoluta è togliere la profondità (Pitch Control difensivo) finché non si ripristina pressione sul portatore.',
      },
      {
        id: 'c',
        text: 'Rompere la linea uscendo con entrambi i centrali in raddoppio sulla trequarti',
        isCorrect: false,
        explanation: 'Spacca la struttura difensiva lasciando un 2 contro 0 per gli attaccanti.',
      },
    ],
  },
];

const FORMATION_PROS_CONS: Record<
  FormationPreset,
  { strengths: string[]; weaknesses: string[]; keyZone: string }
> = {
  '4-3-3': {
    strengths: [
      'Triangoli naturali sulle catene laterali (terzino, mezzala, ala)',
      'Occupazione fluida e continua dei due Half-Spaces',
      'Pressing alto a tre punte con schermatura dei corridoi centrali',
    ],
    weaknesses: [
      'Regista vertice basso esposto se le due mezzali salgono contemporaneamente',
      'Vulnerabilità ai cambi gioco veloci sul lato debole',
    ],
    keyZone: 'Half-Spaces (X: 55–78, Y: 18–34 e 66–82)',
  },
  '4-2-3-1': {
    strengths: [
      'Doppio mediano (doppio perno) a protezione strutturale delle transizioni negative',
      'Trequartista centrale libero di agire tra le linee (Zona 14)',
      'Grande densità centrale per innescare riaggressioni immediate',
    ],
    weaknesses: [
      'Centravanti isolato se gli esterni offensivi non accompagnano rapidamente l’azione',
      'Distanza notevole tra i due mediani e la trequarti se il blocco si allunga',
    ],
    keyZone: 'Zona 14 / Rifinitura Centrale',
  },
  '3-5-2': {
    strengths: [
      'Superiorità numerica naturale 3v2 in prima costruzione contro difese a 2 punte',
      'Doppia punta per attacco coordinato della profondità e combinazioni nello stretto',
      'Densità ferrea al centro del campo con tre centrocampisti centrali',
    ],
    weaknesses: [
      'Quinti di fascia (esterni) costretti a coprire 70 metri di corsia da soli',
      'Spazi liberi alle spalle dei quinti se la scalata della mezzala è tardiva',
    ],
    keyZone: 'Ampiezza Quinti & Corridoio Centrale',
  },
  '4-4-2': {
    strengths: [
      'Copertura simmetrica e razionale di tutta l’ampiezza del campo',
      'Due linee da 4 compatte entro 25 metri, difficilissime da perforare centralmente',
      'Doppia pressione immediata sulle corsie esterne (raddoppio terzino + esterno)',
    ],
    weaknesses: [
      'Inferiorità numerica 2v3 a centrocampo contro sistemi a tre centrocampisti (es. 4-3-3)',
      'Difficoltà a trovare uomini tra le linee avversarie in fase di possesso',
    ],
    keyZone: 'Blocco Medio & Linee Compatte (X: 35–60)',
  },
  '3-4-3': {
    strengths: [
      'Ampiezza estrema + due trequartisti interni nei mezzo-spazi (box midfield 3-2-4-1)',
      'Riaggressione feroce e immediata non appena si perde il possesso',
    ],
    weaknesses: [
      'Spazi ampi ai lati dei due mediani se la squadra viene scavalcata con un cambio gioco',
      'Richiede ritmi atletici straordinari per mantenere le distanze brevi',
    ],
    keyZone: 'Quadrato di Centrocampo (Box Midfield)',
  },
  '5-3-2': {
    strengths: [
      'Massima protezione dell’area di rigore e densità impenetrabile davanti alla porta',
      'Ripartenza fulminea in campo aperto grazie ai due attaccanti liberi da compiti difensivi',
    ],
    weaknesses: [
      'Baricentro molto basso che concede il totale controllo territoriale agli avversari',
      'Transizioni lunghe ed estenuanti per risalire il campo',
    ],
    keyZone: 'Terzo Difensivo & Transizione Rapida',
  },
  '4-1-4-1': {
    strengths: [
      'Schermatura formidabile del vertice basso davanti alla difesa a 4',
      'Linea a 4 di centrocampo che chiude ermeticamente sia le fasce sia gli half-spaces',
    ],
    weaknesses: [
      'Distanza notevole tra l’unica punta e i centrocampisti in fase di risalita palla',
    ],
    keyZone: 'Corridoio Intermedio Difensivo (X: 38–62)',
  },
  '2-3-1': {
    strengths: [
      'Equilibrio classico del 7v7 con linea a 3 a supporto del perno offensivo',
      'Ottima ampiezza offerta dai due esterni di centrocampo',
      'Facilità di rotazione triangolare in fase di possesso palla',
    ],
    weaknesses: [
      'Transizioni difensive vulnerabili se i due esterni non ripiegano subito',
      'Centrocampista centrale esposto in transizione negativa se preso in mezzo',
    ],
    keyZone: 'Centrocampo & Corsie Laterali 7v7',
  },
  '3-2-1': {
    strengths: [
      'Solidità difensiva ferrea con linea a 3 bloccata',
      'Protezione totale dell’area e ripartenze rapide sulle corsie esterne',
      'Controllo geometrico e sicurezza nella propria metà campo',
    ],
    weaknesses: [
      'Rischio di isolamento dell’unica punta centrale',
      'Minore densità e presenza nella metà campo offensiva',
    ],
    keyZone: 'Prima Costruzione & Linea a 3 Difensiva',
  },
  '1-2-1': {
    strengths: [
      'Rombo (Diamante) perfetto per il 5v5 con linee di passaggio continue',
      'Perno centrale per scarico e inserimento continuo delle due ali',
      'Massima fluidità di rotazione posizionale e gioco relazionale',
    ],
    weaknesses: [
      'Basta un ritardo di marcatura dell’ultimo per concedere un tiro pulito',
      'Richiede sincronismo assoluto nelle scalate difensive',
    ],
    keyZone: 'Vertice & Diamante Centrale (Futsal / 5v5)',
  },
  '2-2': {
    strengths: [
      'Doppia coppia simmetrica (2 difensori + 2 attaccanti)',
      'Facile interscambiabilità e marcature dirette uomo su uomo',
      'Grande stabilità nelle transizioni veloci',
    ],
    weaknesses: [
      'Spazio centrale vuoto tra le due coppie sfruttabile dagli avversari',
      'Meno linee di passaggio diagonali rispetto al rombo (1-2-1)',
    ],
    keyZone: 'Zone Centrali & Interscambi 2v2',
  },
};

interface TacticalLearningLabProps {
  onLoadScenarioIntoStudio?: () => void;
}

export const TacticalLearningLab: React.FC<TacticalLearningLabProps> = ({
  onLoadScenarioIntoStudio,
}) => {
  const setHomeFormation = useStudioStore((s) => s.setHomeFormation);
  const setAwayFormation = useStudioStore((s) => s.setAwayFormation);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [puzzleSequence, setPuzzleSequence] = useState<string[]>([]);
  const [compareLeft, setCompareLeft] = useState<FormationPreset>('4-3-3');
  const [compareRight, setCompareRight] = useState<FormationPreset>('3-5-2');

  const [flashcards, setFlashcards] = useState<SavedFlashcard[]>([]);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardNote, setNewCardNote] = useState('');
  const [newCardTag, setNewCardTag] = useState('Half-Space');

  useEffect(() => {
    listFlashcardsFromIdb().then((cards) => {
      if (cards.length > 0) {
        setFlashcards(cards);
      } else {
        const seed: SavedFlashcard = {
          id: 'fc_seed_1',
          title: 'Regola del Terzo Uomo',
          note: 'Usare un giocatore che viene incontro (2° uomo) come sponda per servire in corsa chi attacca lo spazio cieco (3° uomo).',
          tags: ['Possesso', 'Half-Space'],
          createdAt: '2026-10-29',
        };
        setFlashcards([seed]);
      }
    });
  }, []);

  const handleAddFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim() || !newCardNote.trim()) return;
    const card: SavedFlashcard = {
      id: `fc_${Date.now()}`,
      title: newCardTitle.trim(),
      note: newCardNote.trim(),
      tags: [newCardTag],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    await saveFlashcardToIdb(card);
    setFlashcards((prev) => [card, ...prev]);
    setNewCardTitle('');
    setNewCardNote('');
  };

  const handleDeleteFlashcard = async (id: string) => {
    await deleteFlashcardFromIdb(id);
    setFlashcards((prev) => prev.filter((c) => c.id !== id));
  };

  const puzzleTarget = [
    'Regista Vertice Basso (DM)',
    'Mezzala d’Inserimento (CM)',
    'Terzino Fluidificante (LB)',
  ];
  const puzzleSolved =
    puzzleSequence.length === 3 &&
    puzzleSequence.every((step, idx) => step === puzzleTarget[idx]);

  return (
    <div className="flex flex-col gap-8 text-slate-200">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-5">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-cyan-400" />
          <span>Laboratorio Didattico & Percorsi Tattici</span>
        </h1>
        <p className="max-w-3xl text-sm text-slate-400 leading-relaxed">
          Comprendi i principi del calcio posizionale e le dottrine dei grandi maestri attraverso lezioni interattive
          caricabili sulla lavagna, quiz situazionali con feedback immediato, puzzle a vincoli di passaggio e confronto geometrico tra formazioni.
        </p>
      </div>

      {/* 01. Percorsi Guidati */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">01. Percorsi Didattici Guidati</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {GUIDED_LESSONS.map((lesson) => (
            <div
              key={lesson.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg"
            >
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-cyan-400">{lesson.track}</span>
                  <span>·</span>
                  <span>{lesson.duration}</span>
                  <span>·</span>
                  <span className="font-mono text-lime-400">{lesson.formationHome} vs {lesson.formationAway}</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{lesson.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {lesson.summary}
                </p>
                <div className="rounded-lg bg-slate-950 p-2.5 text-xs text-cyan-300 mb-3 border border-slate-800">
                  <strong className="text-lime-400">Concetto Chiave:</strong> {lesson.keyConcept}
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 mb-4">
                  {lesson.takeaways.map((t, i) => (
                    <li key={i}>• {t}</li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => {
                  setHomeFormation(lesson.formationHome);
                  setAwayFormation(lesson.formationAway);
                  if (onLoadScenarioIntoStudio) onLoadScenarioIntoStudio();
                }}
                className="w-full rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-4 py-2 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <span>Carica Lezione nella Lavagna Tattica</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 02 & 03. Quiz Situazionali & Puzzle 3 Passaggi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quiz Situazionali */}
        <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-lime-400" />
            <h2 className="text-lg font-semibold text-white">02. Quiz Situazionali sul Campo</h2>
          </div>

          <div className="space-y-4">
            {TACTICAL_QUIZZES.map((quiz) => {
              const chosenId = selectedAnswers[quiz.id];
              const chosenOption = quiz.options.find((o) => o.id === chosenId);

              return (
                <div key={quiz.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <h3 className="text-sm font-semibold text-white mb-1">{quiz.question}</h3>
                  <p className="text-xs text-slate-400 mb-3">{quiz.scenarioDescription}</p>
                  <div className="space-y-2">
                    {quiz.options.map((opt) => {
                      const isSelected = chosenId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setSelectedAnswers((prev) => ({ ...prev, [quiz.id]: opt.id }))
                          }
                          className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                            isSelected
                              ? opt.isCorrect
                                ? 'border-lime-400 bg-lime-500/15 text-white font-semibold'
                                : 'border-rose-500 bg-rose-500/15 text-white'
                              : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                  {chosenOption && (
                    <div
                      className={`mt-3 flex items-start gap-2 rounded-md p-2.5 text-xs ${
                        chosenOption.isCorrect
                          ? 'bg-lime-950/40 text-lime-400 border border-lime-500/30'
                          : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{chosenOption.explanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Puzzle 3 Passaggi (Terzo Uomo) */}
        <section className="flex flex-col justify-between space-y-4 rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Puzzle className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">
                03. Puzzle: Uscita dal Pressing in 3 Passaggi (Terzo Uomo)
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Obiettivo:</strong> Il centrale difensivo è pressato da due punte avversarie. Seleziona nell’ordine corretto i <strong>3 ricevitori</strong> per eludere la pressione centrale e attaccare il lato debole con un guadagno complessivo di <span className="font-mono text-cyan-400 font-bold">+0.14 xT</span>.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {[
                'Regista Vertice Basso (DM)',
                'Mezzala d’Inserimento (CM)',
                'Terzino Fluidificante (LB)',
                'Portiere sotto pressione (GK)',
              ].map((node) => (
                <button
                  key={node}
                  type="button"
                  disabled={puzzleSequence.length >= 3}
                  onClick={() => setPuzzleSequence((prev) => [...prev, node])}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:border-cyan-400 disabled:opacity-40 transition-colors"
                >
                  + Passa a: {node}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Catena selezionata ({puzzleSequence.length}/3):</span>
                <button
                  type="button"
                  onClick={() => setPuzzleSequence([])}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Resetta sequenza
                </button>
              </div>
              <div className="font-mono text-xs text-white">
                Centrale CB → {puzzleSequence.length > 0 ? puzzleSequence.join(' → ') : '...'}
              </div>

              {puzzleSequence.length === 3 && (
                <div
                  className={`mt-3 rounded-md p-2.5 text-xs font-medium ${
                    puzzleSolved
                      ? 'bg-lime-500/15 text-lime-400 border border-lime-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {puzzleSolved ? (
                    <span className="flex items-center gap-1.5">
                      <Award className="h-4 w-4" />
                      Soluzione perfetta! Hai applicato il principio del terzo uomo (Regista → Mezzala nell’half-space → Terzino sovrapposto) superando la pressione in 3 tocchi.
                    </span>
                  ) : (
                    <span>
                      Sequenza non ottimale. Suggerimento: scarica prima sul Regista (DM), imbuca per la Mezzala (CM) nell’half-space e apri sul Terzino (LB) in corsa.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Flashcards Local-First con IndexedDB */}
          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Appunti & Flashcard Tattiche (Offline IndexedDB)</h3>
            </div>
            <form onSubmit={handleAddFlashcard} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <input
                type="text"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Titolo concetto..."
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
              <input
                type="text"
                value={newCardNote}
                onChange={(e) => setNewCardNote(e.target.value)}
                placeholder="Sintesi operativa..."
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
              <div className="flex gap-1.5">
                <select
                  value={newCardTag}
                  onChange={(e) => setNewCardTag(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
                >
                  <option value="Half-Space">Half-Space</option>
                  <option value="Pressing">Pressing</option>
                  <option value="Build-Up">Build-Up</option>
                  <option value="xG/xT">xG/xT</option>
                </select>
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 px-3 py-1.5 text-xs font-bold text-slate-950 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Salva</span>
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-36 overflow-y-auto">
              {flashcards.map((fc) => (
                <div
                  key={fc.id}
                  className="flex items-start justify-between gap-2 rounded-lg bg-slate-950 p-2.5 text-xs border border-slate-800"
                >
                  <div>
                    <div className="font-semibold text-white">
                      {fc.title}{' '}
                      <span className="font-normal text-cyan-400">· {fc.tags.join(', ')}</span>
                    </div>
                    <p className="text-slate-400 mt-0.5">{fc.note}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteFlashcard(fc.id)}
                    aria-label="Elimina flashcard"
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* 04. Confronto Sistemi Tattici Affiancato */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">
              04. Confronto Geometrico Sistemi Tattici (Pro & Contro Strutturali)
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={compareLeft}
              onChange={(e) => setCompareLeft(e.target.value as FormationPreset)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-cyan-400"
            >
              {(Object.keys(FORMATION_PROS_CONS) as FormationPreset[]).map((f) => (
                <option key={`left_${f}`} value={f}>
                  Sistema A: {f}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400">vs</span>
            <select
              value={compareRight}
              onChange={(e) => setCompareRight(e.target.value as FormationPreset)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-lime-400"
            >
              {(Object.keys(FORMATION_PROS_CONS) as FormationPreset[]).map((f) => (
                <option key={`right_${f}`} value={f}>
                  Sistema B: {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { preset: compareLeft, accent: 'text-cyan-400', data: FORMATION_PROS_CONS[compareLeft] },
            { preset: compareRight, accent: 'text-lime-400', data: FORMATION_PROS_CONS[compareRight] },
          ].map((col, idx) => (
            <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`font-mono text-base font-bold ${col.accent}`}>{col.preset}</span>
                <span className="text-xs text-slate-400">
                  Zona chiave: <strong className="text-white">{col.data.keyZone}</strong>
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="font-semibold text-emerald-400 mb-1">Vantaggi Posizionali:</div>
                  <ul className="space-y-1 text-slate-300">
                    {col.data.strengths.map((s, i) => (
                      <li key={i}>+ {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-rose-400 mb-1">Vulnerabilità da Schermare:</div>
                  <ul className="space-y-1 text-slate-300">
                    {col.data.weaknesses.map((w, i) => (
                      <li key={i}>− {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

