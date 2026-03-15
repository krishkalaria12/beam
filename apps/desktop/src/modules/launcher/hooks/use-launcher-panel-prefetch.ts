import { useEffect } from "react";

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
  () => import("@/modules/clipboard/components/clipboard-command-group"),
  () => import("@/modules/ai/components/ai-command-group"),
  () => import("@/modules/todo/components/todo-command-group"),
  () => import("@/modules/notes/components/notes-command-group"),
  () => import("@/modules/snippets/components/snippets-command-group"),
  () => import("@/modules/dictionary/components/dictionary-command-group"),
  () => import("@/modules/file-search/components/file-search-command-group"),
  () => import("@/modules/quicklinks/components/quicklinks-command-group"),
  () => import("@/modules/speed-test/components/speed-test-command-group"),
  () => import("@/modules/translation/components/translation-command-group"),
  () => import("@/modules/integrations/spotify/components/spotify-command-group"),
  () => import("@/modules/integrations/github/components/github-command-group"),
  () => import("@/modules/extensions/components/extensions-command-group"),
  () => import("@/modules/window-switcher/components/window-switcher-command-group"),
  () => import("@/modules/script-commands/components/script-commands-command-group"),
  () => import("@/modules/extensions/components/extension-runner-view"),
  () => import("@/modules/calculator-history/components/calculator-history-command-group"),
  () => import("@/modules/emoji/components/emoji-command-group"),
  () => import("@/modules/settings/components/settings-command-group"),
];

function preloadLauncherPanels() {
  for (const preload of launchPanelPreloaders) {
    void preload();
  }
}

export function useLauncherPanelPrefetch() {
  useEffect(() => {
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
  }, []);
}
