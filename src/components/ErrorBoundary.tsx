"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches React rendering errors and displays a fallback UI.
 * Wraps Convex-dependent components so connection/render errors don't produce blank screens.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback && typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error!, this.handleReset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Default fallback
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
