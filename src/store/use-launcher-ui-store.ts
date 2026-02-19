import { create } from "zustand";

import type { CommandPanel } from "@/command-registry/types";

export type QuicklinksView = "create" | "manage";

const TAKEOVER_PANELS = new Set<CommandPanel>([
  "file-search",
  "dictionary",
  "translation",
  "quicklinks",
  "speed-test",
  "clipboard",
]);

const INPUT_HIDDEN_PANELS = new Set<CommandPanel>([
  ...TAKEOVER_PANELS,
  "emoji",
]);

const FOOTER_HIDDEN_PANELS = new Set<CommandPanel>([
  ...TAKEOVER_PANELS,
  "emoji",
]);

export interface LauncherUiState {
  commandSearch: string;
  activePanel: CommandPanel;
  fileSearchQuery: string;
  dictionaryQuery: string;
  translationQuery: string;
  quicklinksView: QuicklinksView;
  setCommandSearch(value: string): void;
  setActivePanel(panel: CommandPanel): void;
  setFileSearchQuery(query: string): void;
  setDictionaryQuery(query: string): void;
  setTranslationQuery(query: string): void;
  setQuicklinksView(view: QuicklinksView): void;
  openPanel(panel: CommandPanel, clearCommandSearch?: boolean): void;
  openFileSearch(query: string): void;
  openDictionary(query: string): void;
  openTranslation(query: string): void;
  backToCommands(): void;
}

export const useLauncherUiStore = create<LauncherUiState>((set) => ({
  commandSearch: "",
  activePanel: "commands",
  fileSearchQuery: "",
  dictionaryQuery: "",
  translationQuery: "",
  quicklinksView: "manage",
  setCommandSearch: (value) => set({ commandSearch: value }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setFileSearchQuery: (query) => set({ fileSearchQuery: query }),
  setDictionaryQuery: (query) => set({ dictionaryQuery: query }),
  setTranslationQuery: (query) => set({ translationQuery: query }),
  setQuicklinksView: (view) => set({ quicklinksView: view }),
  openPanel: (panel, clearCommandSearch = false) =>
    set((state) => ({
      activePanel: panel,
      commandSearch: clearCommandSearch ? "" : state.commandSearch,
    })),
  openFileSearch: (query) =>
    set({
      fileSearchQuery: query,
      activePanel: "file-search",
    }),
  openDictionary: (query) =>
    set({
      dictionaryQuery: query,
      activePanel: "dictionary",
    }),
  openTranslation: (query) =>
    set({
      translationQuery: query,
      activePanel: "translation",
    }),
  backToCommands: () =>
    set({
      activePanel: "commands",
      commandSearch: "",
    }),
}));

export function isLauncherInputHidden(panel: CommandPanel): boolean {
  return INPUT_HIDDEN_PANELS.has(panel);
}

export function isLauncherFooterHidden(panel: CommandPanel): boolean {
  return FOOTER_HIDDEN_PANELS.has(panel);
}

export function isLauncherCommandListExpandedPanel(panel: CommandPanel): boolean {
  return panel === "emoji";
}
