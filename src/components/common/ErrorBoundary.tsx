import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { logLocalEvent, exportLogsJSON } from '../../lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logLocalEvent('error', 'ErrorBoundary', error.message, {
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleExportDiagnostics = () => {
    exportLogsJSON();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h2 className="text-lg font-bold">Si è verificato un errore inaspettato</h2>
                <p className="text-xs text-zinc-400">LavagnaTattica ha intercettato l'eccezione evitando il blocco totale del browser.</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-zinc-800 font-mono text-xs text-red-400 overflow-x-auto max-h-40">
              {this.state.error?.toString()}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2ea043] hover:bg-[#2c974b] text-white text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Ricarica Applicazione
              </button>

              <button
                onClick={this.handleExportDiagnostics}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Esporta Log Diagnostici Locali (JSON)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
