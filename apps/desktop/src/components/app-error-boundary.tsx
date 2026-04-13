import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[beam] ui render error", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#111] text-[#f2f2f2] flex items-center justify-center">
          <div className="max-w-md rounded-xl border border-white/20 bg-black/30 px-5 py-4 text-center">
            <p className="text-sm font-semibold">beam failed to render this view</p>
            <p className="mt-1 text-xs text-white/70">
              try relaunching beam. if the issue persists, rebuild the appimage.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
