import React from "react";

interface State {
  error: Error | null;
  info: string | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App crashed:", error, info);
    this.setState({ info: info.componentStack ?? null });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-midnight text-textPrimary p-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="font-serif text-2xl text-coral mb-4">
              Something crashed
            </h1>
            <pre className="text-xs bg-indigoDeep border border-coral/40 rounded-lg p-4 overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
              {"\n\n"}
              {this.state.info}
            </pre>
            <button
              onClick={() => {
                this.setState({ error: null, info: null });
                window.location.hash = "#/";
                window.location.reload();
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-peach text-midnight text-sm"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
