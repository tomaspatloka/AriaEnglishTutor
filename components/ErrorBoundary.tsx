import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Zachytí render chyby kdekoliv ve stromu a místo bílé obrazovky
 * zobrazí čitelný fallback s možností obnovit aplikaci.
 *
 * Pozn.: projekt nemá nainstalované @types/react, takže React.Component
 * je typově "untyped" — proto deklarujeme props/state explicitně.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // V dev konzoli drž stopu; v produkci nelogujeme.
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary zachytil chybu:', error, info.componentStack);
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-6">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="text-5xl mb-4">😟</div>
          <h1 className="text-xl font-semibold mb-2">Něco se pokazilo</h1>
          <p className="text-slate-400 text-sm mb-6">
            Aplikace narazila na neočekávanou chybu. Tvoje data zůstala uložená — stačí ji znovu načíst.
          </p>
          {this.state.error?.message && (
            <pre className="text-xs text-left text-rose-300/80 bg-slate-900/60 rounded-lg p-3 mb-6 overflow-x-auto whitespace-pre-wrap break-words">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors font-medium"
          >
            Načíst znovu
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
