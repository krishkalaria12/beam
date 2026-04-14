import type { ErrorComponentProps } from "@tanstack/react-router";

import { AppCrashScreen } from "@/components/app-crash-screen";

export function RouterErrorFallback({ error, reset }: ErrorComponentProps) {
  const handleGoHome = (): void => {
    window.location.assign("/");
  };

  return (
    <AppCrashScreen
      title="Beam Could Not Open This Screen"
      description="Go to the main screen to recover and continue using Beam."
      error={error}
      onGoHome={handleGoHome}
      onTryAgain={reset}
    />
  );
}
