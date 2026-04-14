import type { ErrorComponentProps } from "@tanstack/react-router";

import { AppCrashScreen } from "@/components/app-crash-screen";
import { router } from "@/router";
import { useLauncherUiStore } from "@/store/use-launcher-ui-store";

export function RouterErrorFallback({ error, reset }: ErrorComponentProps) {
  const handleGoHome = (): void => {
    useLauncherUiStore.getState().backToCommands();
    void router.navigate({ to: "/", replace: true });
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
