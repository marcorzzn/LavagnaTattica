import React, { useState } from 'react';
import { Download, Film, LayoutGrid, Video } from 'lucide-react';
import { UniversalVideoLab } from './components/video/UniversalVideoLab';
import { FreeBoardCanvas } from './components/studio/FreeBoardCanvas';
import { AnimatedBoardView } from './components/studio/AnimatedBoardView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useStudioStore } from './stores/studioStore';

type MainWorkspaceView = 'analisi' | 'lavagna_animata' | 'lavagna_libera';

const VIEWS: Array<{ id: MainWorkspaceView; label: string; icon: React.ReactNode }> = [
  { id: 'analisi', label: 'Analisi', icon: <Video className="w-4 h-4" /> },
  { id: 'lavagna_animata', label: 'Lavagna animata', icon: <Film className="w-4 h-4" /> },
  { id: 'lavagna_libera', label: 'Lavagna libera', icon: <LayoutGrid className="w-4 h-4" /> },
];

export default function App() {
  const [activeView, setActiveView] = useState<MainWorkspaceView>('analisi');

  const exportProjectJson = () => {
    const jsonStr = useStudioStore.getState().exportProjectJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lavagnatattica_progetto_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
        <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-zinc-800/90 bg-[#0B0B10] sticky top-0 z-40 backdrop-blur">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('analisi');
            }}
            className="text-lg font-bold tracking-tight text-zinc-100 font-display whitespace-nowrap shrink-0 hover:text-[#00E5FF] transition-colors"
          >
            LavagnaTattica
          </a>

          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-medium text-zinc-400 overflow-x-auto">
            {VIEWS.map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeView === view.id
                    ? 'text-zinc-950 bg-[#00E5FF] font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                {view.icon}
                <span>{view.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={exportProjectJson}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-[#00E5FF] rounded-lg hover:bg-[#00E5FF]/90 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
              title="Salva il progetto in un file JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Esporta JSON</span>
              <span className="sm:hidden">JSON</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full mx-auto px-2 sm:px-4 py-2 flex flex-col min-h-0">
          {activeView === 'analisi' && <UniversalVideoLab />}
          {activeView === 'lavagna_animata' && <AnimatedBoardView />}
          {activeView === 'lavagna_libera' && <FreeBoardCanvas />}
        </main>
      </div>
    </ErrorBoundary>
  );
}
