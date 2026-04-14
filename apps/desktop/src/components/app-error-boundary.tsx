import { Component, type ErrorInfo, type ReactNode } from "react";

import { AppCrashScreen } from "@/components/app-crash-screen";
import { router } from "@/router";
import { useLauncherUiStore } from "@/store/use-launcher-ui-store";

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
    useLauncherUiStore.getState().backToCommands();
    this.setState({ hasError: false, error: null }, () => {
      void router.navigate({ to: "/", replace: true });
    });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <AppCrashScreen
          title="Beam Could Not Render This Screen"
          description="Go to the main screen to recover and continue using Beam."
          error={this.state.error}
          onGoHome={this.handleGoHome}
          onTryAgain={this.handleTryAgain}
        />
      );
    }

    return this.props.children;
  }
}
