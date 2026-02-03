"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              Došlo je do greške
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Aplikacija je naišla na neočekivanu grešku. Molimo osvježite stranicu.
            </p>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Ne resetuj state prije reload-a da ne uzrokuje beskonačnu petlju
                window.location.reload();
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Osvježi stranicu
            </button>
            {this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-slate-500">
                  Detalji greške (samo u development modu)
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-slate-100 p-2 text-xs">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

