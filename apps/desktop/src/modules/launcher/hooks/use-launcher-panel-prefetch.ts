import { useQueryClient, type QueryClient } from "@tanstack/react-query";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { preloadExtensionInfrastructure } from "@/modules/extensions/lib/extension-infrastructure-loader";
import { prepareLauncherPanel } from "@/modules/launcher/lib/launcher-panel-preparation";
import { getLauncherPanelsForWarmupTier } from "@/modules/launcher/lib/panel-warmup-policy";

type IdleCallbackHandle = number;
type IdleCallbackOptions = { timeout?: number };
type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadline) => void,
    options?: IdleCallbackOptions,
  ) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

function preloadLauncherPanels(queryClient: QueryClient) {
  for (const panel of getLauncherPanelsForWarmupTier("idle")) {
    void prepareLauncherPanel(panel, queryClient);
  }
}

export function useLauncherPanelPrefetch() {
  const queryClient = useQueryClient();

  useMountEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const idleWindow = window as IdleWindow;
    let timeoutHandle: number | null = null;
    let idleHandle: IdleCallbackHandle | null = null;

    void preloadExtensionInfrastructure();

    for (const panel of getLauncherPanelsForWarmupTier("boot")) {
      void prepareLauncherPanel(panel, queryClient);
    }

    const runPrefetch = () => {
      preloadLauncherPanels(queryClient);
    };

    if (idleWindow.requestIdleCallback) {
      idleHandle = idleWindow.requestIdleCallback(
        () => {
          runPrefetch();
        },
        { timeout: 1500 },
      );
    } else {
      timeoutHandle = window.setTimeout(runPrefetch, 600);
    }

    return () => {
      if (idleHandle !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  });
}
