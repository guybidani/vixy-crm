import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional custom fallback. Defaults to a Hebrew-language error page. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Reusable React error boundary.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomePage />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<MyErrorPage />}>
 *     <SomePage />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8"
          dir="rtl"
        >
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
            <span className="text-red-500 text-2xl font-bold">!</span>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-text-primary mb-1">
              משהו השתבש
            </h2>
            <p className="text-sm text-text-secondary">
              אירעה שגיאה בלתי צפויה. נסה לרענן את הדף.
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm"
          >
            רענן דף
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
