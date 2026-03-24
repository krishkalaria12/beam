import { useMountEffect } from "@/hooks/use-mount-effect";

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

const launchPanelPreloaders = [
  () => import("@/modules/ai/components/ai-command-group"),
  () => import("@/modules/calculator-history/components/calculator-history-command-group"),
  () => import("@/modules/clipboard/components/clipboard-command-group"),
  () => import("@/modules/notes/components/notes-command-group"),
  () => import("@/modules/quicklinks/components/quicklinks-command-group"),
  () => import("@/modules/settings/takeover/components/settings-takeover-view"),
  () => import("@/modules/settings/takeover/tabs/about/about-tab"),
  () => import("@/modules/settings/takeover/tabs/extensions/extensions-tab"),
  () => import("@/modules/settings/takeover/tabs/general/general-tab"),
  () => import("@/modules/settings/takeover/tabs/keybinds/keybinds-tab"),
];

function preloadLauncherPanels() {
  for (const preload of launchPanelPreloaders) {
    void preload();
  }
}

export function useLauncherPanelPrefetch() {
  useMountEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const idleWindow = window as IdleWindow;
    let timeoutHandle: number | null = null;
    let idleHandle: IdleCallbackHandle | null = null;

    const runPrefetch = () => {
      preloadLauncherPanels();
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
