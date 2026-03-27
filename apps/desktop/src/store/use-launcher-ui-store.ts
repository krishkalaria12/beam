import { create } from "zustand";

import type { CommandPanel } from "@/command-registry/types";
import type { DmenuSession } from "@/modules/dmenu/types";

export type QuicklinksView = "create" | "manage";

interface LauncherUiSnapshot {
  commandSearch: string;
  commandSearchSessionSeed: number;
  activePanel: CommandPanel;
  fileSearchQuery: string;
  dictionaryQuery: string;
  translationQuery: string;
  quicklinksView: QuicklinksView;
}

const TAKEOVER_PANELS = new Set<CommandPanel>([
  "settings",
  "todo",
  "notes",
  "ai",
  "snippets",
  "file-search",
  "dictionary",
  "translation",
  "quicklinks",
  "speed-test",
  "clipboard",
  "extensions",
  "window-switcher",
  "hyprwhspr",
  "script-commands",
  "dmenu",
  "extension-runner",
]);

const INPUT_HIDDEN_PANELS = new Set<CommandPanel>([...TAKEOVER_PANELS, "emoji"]);

const FOOTER_HIDDEN_PANELS = new Set<CommandPanel>([...TAKEOVER_PANELS, "emoji"]);

export interface LauncherUiState {
  commandSearch: string;
  commandSearchSessionSeed: number;
  activePanel: CommandPanel;
  fileSearchQuery: string;
  dictionaryQuery: string;
  translationQuery: string;
  quicklinksView: QuicklinksView;
  dmenuSession: DmenuSession | null;
  dmenuQuery: string;
  dmenuSnapshot: LauncherUiSnapshot | null;
  setCommandSearch(value: string): void;
  setActivePanel(panel: CommandPanel): void;
  setFileSearchQuery(query: string): void;
  setDictionaryQuery(query: string): void;
  setTranslationQuery(query: string): void;
  setQuicklinksView(view: QuicklinksView): void;
  setDmenuQuery(query: string): void;
  openPanel(panel: CommandPanel, clearCommandSearch?: boolean): void;
  openFileSearch(query: string): void;
  openDictionary(query: string): void;
  openTranslation(query: string): void;
  openDmenuSession(session: DmenuSession): void;
  closeDmenuSession(): void;
  backToCommands(): void;
}

function createSnapshot(state: {
  commandSearch: string;
  commandSearchSessionSeed: number;
  activePanel: CommandPanel;
  fileSearchQuery: string;
  dictionaryQuery: string;
  translationQuery: string;
  quicklinksView: QuicklinksView;
}): LauncherUiSnapshot {
  return {
    commandSearch: state.commandSearch,
    commandSearchSessionSeed: state.commandSearchSessionSeed,
    activePanel: state.activePanel,
    fileSearchQuery: state.fileSearchQuery,
    dictionaryQuery: state.dictionaryQuery,
    translationQuery: state.translationQuery,
    quicklinksView: state.quicklinksView,
  };
}

function nextCommandSearchSessionSeed(
  previousSearch: string,
  nextSearch: string,
  previousSeed: number,
): number {
  return nextSearch.trim().length === 0 && previousSearch.trim().length > 0
    ? previousSeed + 1
    : previousSeed;
}

export const useLauncherUiStore = create<LauncherUiState>((set) => ({
  commandSearch: "",
  commandSearchSessionSeed: 0,
  activePanel: "commands",
  fileSearchQuery: "",
  dictionaryQuery: "",
  translationQuery: "",
  quicklinksView: "manage",
  dmenuSession: null,
  dmenuQuery: "",
  dmenuSnapshot: null,
  setCommandSearch: (value) =>
    set((state) => ({
      commandSearch: value,
      commandSearchSessionSeed: nextCommandSearchSessionSeed(
        state.commandSearch,
        value,
        state.commandSearchSessionSeed,
      ),
    })),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setFileSearchQuery: (query) => set({ fileSearchQuery: query }),
  setDictionaryQuery: (query) => set({ dictionaryQuery: query }),
  setTranslationQuery: (query) => set({ translationQuery: query }),
  setQuicklinksView: (view) => set({ quicklinksView: view }),
  setDmenuQuery: (query) => set({ dmenuQuery: query }),
  openPanel: (panel, clearCommandSearch = false) =>
    set((state) => ({
      activePanel: panel,
      commandSearch: clearCommandSearch ? "" : state.commandSearch,
      commandSearchSessionSeed: clearCommandSearch
        ? nextCommandSearchSessionSeed(state.commandSearch, "", state.commandSearchSessionSeed)
        : state.commandSearchSessionSeed,
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
  openDmenuSession: (session) =>
    set((state) => ({
      activePanel: "dmenu",
      dmenuSession: session,
      dmenuQuery: session.initialQuery,
      dmenuSnapshot: state.dmenuSnapshot ?? createSnapshot(state),
    })),
  closeDmenuSession: () =>
    set((state) => {
      const snapshot = state.dmenuSnapshot;
      if (!snapshot) {
        return {
          activePanel: "commands" as CommandPanel,
          commandSearch: "",
          commandSearchSessionSeed: nextCommandSearchSessionSeed(
            state.commandSearch,
            "",
            state.commandSearchSessionSeed,
          ),
          dmenuSession: null,
          dmenuQuery: "",
          dmenuSnapshot: null,
        };
      }

      return {
        activePanel: snapshot.activePanel,
        commandSearch: snapshot.commandSearch,
        commandSearchSessionSeed: snapshot.commandSearchSessionSeed,
        fileSearchQuery: snapshot.fileSearchQuery,
        dictionaryQuery: snapshot.dictionaryQuery,
        translationQuery: snapshot.translationQuery,
        quicklinksView: snapshot.quicklinksView,
        dmenuSession: null,
        dmenuQuery: "",
        dmenuSnapshot: null,
      };
    }),
  backToCommands: () =>
    set((state) => ({
      activePanel: "commands",
      commandSearch: "",
      commandSearchSessionSeed: nextCommandSearchSessionSeed(
        state.commandSearch,
        "",
        state.commandSearchSessionSeed,
      ),
      dmenuSession: null,
      dmenuQuery: "",
      dmenuSnapshot: null,
    })),
}));

export function isLauncherInputHidden(panel: CommandPanel): boolean {
  return INPUT_HIDDEN_PANELS.has(panel);
}

export function isLauncherFooterHidden(panel: CommandPanel): boolean {
  return FOOTER_HIDDEN_PANELS.has(panel);
}

export function isLauncherTakeoverPanel(panel: CommandPanel): boolean {
  return TAKEOVER_PANELS.has(panel);
}

export function isLauncherCommandListExpandedPanel(panel: CommandPanel): boolean {
  return panel === "emoji";
}