import { Component, type ErrorInfo, type ReactNode } from "react";

import { AppCrashScreen } from "@/components/app-crash-screen";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[beam] ui render error", error, errorInfo);
  }

  private readonly handleTryAgain = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private readonly handleGoHome = (): void => {
    window.location.assign("/");
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <AppCrashScreen
          title="Beam Could Not Render This Screen"
          description="Go to the main screen to reload the app with a clean state."
          error={this.state.error}
          onGoHome={this.handleGoHome}
          onTryAgain={this.handleTryAgain}
        />
      );
    }

    return this.props.children;
  }
}
