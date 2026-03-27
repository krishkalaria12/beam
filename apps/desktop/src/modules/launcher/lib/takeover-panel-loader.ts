import type { ComponentType } from "react";

import { TAKEOVER_COMMAND_PANELS, type TakeoverCommandPanel } from "@/command-registry/panels";
import type { CommandPanel } from "@/command-registry/types";

type TakeoverPanelComponent = ComponentType<unknown>;

const takeoverPanelLoaders: Record<TakeoverCommandPanel, () => Promise<TakeoverPanelComponent>> = {
  ai: () =>
    import("@/modules/ai/components/ai-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  clipboard: () =>
    import("@/modules/clipboard/components/clipboard-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  dictionary: () =>
    import("@/modules/dictionary/components/dictionary-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  dmenu: () =>
    import("@/modules/dmenu/components/dmenu-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  "extension-runner": () =>
    import("@/modules/extensions/components/extension-runner-view").then(
      (mod) => mod.ExtensionRunnerView as TakeoverPanelComponent,
    ),
  extensions: () =>
    import("@/modules/extensions/components/extensions-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  "file-search": () =>
    import("@/modules/file-search/components/file-search-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  hyprwhspr: () =>
    import("@/modules/hyprwhspr/components/hyprwhspr-view").then(
      (mod) => mod.HyprWhsprView as TakeoverPanelComponent,
    ),
  notes: () =>
    import("@/modules/notes/components/notes-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  quicklinks: () =>
    import("@/modules/quicklinks/components/quicklinks-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  settings: () =>
    import("@/modules/settings/takeover/components/settings-takeover-view").then(
      (mod) => mod.SettingsTakeoverView as TakeoverPanelComponent,
    ),
  snippets: () =>
    import("@/modules/snippets/components/snippets-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  "speed-test": () =>
    import("@/modules/speed-test/components/speed-test-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  "script-commands": () =>
    import("@/modules/script-commands/components/script-commands-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  todo: () =>
    import("@/modules/todo/components/todo-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  translation: () =>
    import("@/modules/translation/components/translation-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
  "window-switcher": () =>
    import("@/modules/window-switcher/components/window-switcher-command-group").then(
      (mod) => mod.default as TakeoverPanelComponent,
    ),
};

const loadedTakeoverPanels = new Map<TakeoverCommandPanel, TakeoverPanelComponent>();
const takeoverPanelPromises = new Map<TakeoverCommandPanel, Promise<TakeoverPanelComponent>>();

export function isTakeoverLauncherPanel(panel: CommandPanel): panel is TakeoverCommandPanel {
  return (TAKEOVER_COMMAND_PANELS as readonly string[]).includes(panel);
}

async function loadTakeoverPanel(panel: TakeoverCommandPanel): Promise<TakeoverPanelComponent> {
  const cachedPanel = loadedTakeoverPanels.get(panel);
  if (cachedPanel) {
    return cachedPanel;
  }

  const pendingPanel = takeoverPanelPromises.get(panel);
  if (pendingPanel) {
    return pendingPanel;
  }

  const loader = takeoverPanelLoaders[panel];
  const nextPanelPromise = loader()
    .then((component) => {
      loadedTakeoverPanels.set(panel, component);
      takeoverPanelPromises.delete(panel);
      return component;
    })
    .catch((error) => {
      takeoverPanelPromises.delete(panel);
      throw error;
    });

  takeoverPanelPromises.set(panel, nextPanelPromise);
  return nextPanelPromise;
}

export function getLoadedTakeoverPanel(panel: TakeoverCommandPanel): TakeoverPanelComponent | null {
  return loadedTakeoverPanels.get(panel) ?? null;
}

export async function preloadTakeoverLauncherPanel(panel: TakeoverCommandPanel): Promise<void> {
  await loadTakeoverPanel(panel);
}
