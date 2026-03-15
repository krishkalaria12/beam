import { create } from "zustand";

import type { CommandPanel } from "@/command-registry/types";
import type { DmenuSession } from "@/modules/dmenu/types";

export type QuicklinksView = "create" | "manage";

interface LauncherUiSnapshot {
  commandSearch: string;
  activePanel: CommandPanel;
  fileSearchQuery: string;
  dictionaryQuery: string;
  translationQuery: string;
  spotifyQuery: string;
  githubQuery: string;
  quicklinksView: QuicklinksView;
}

const TAKEOVER_PANELS = new Set<CommandPanel>([
  "todo",
  "notes",
  "ai",
  "snippets",
  "file-search",
  "dictionary",
  "translation",
  "spotify",
  "github",
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
  activePanel: CommandPanel;
  fileSearchQuery: string;
  dictionaryQuery: string;
  translationQuery: string;
  spotifyQuery: string;
  githubQuery: string;
  quicklinksView: QuicklinksView;
  dmenuSession: DmenuSession | null;
  dmenuQuery: string;
  dmenuSnapshot: LauncherUiSnapshot | null;
  setCommandSearch(value: string): void;
  setActivePanel(panel: CommandPanel): void;
  setFileSearchQuery(query: string): void;
  setDictionaryQuery(query: string): void;
  setTranslationQuery(query: string): void;
  setSpotifyQuery(query: string): void;
  setGithubQuery(query: string): void;
  setQuicklinksView(view: QuicklinksView): void;
  setDmenuQuery(query: string): void;
  openPanel(panel: CommandPanel, clearCommandSearch?: boolean): void;
  openFileSearch(query: string): void;
  openDictionary(query: string): void;
  openTranslation(query: string): void;
  openSpotify(query: string): void;
  openGithub(query: string): void;
  openDmenuSession(session: DmenuSession): void;
  closeDmenuSession(): void;
  backToCommands(): void;
}

function createSnapshot(state: {
  commandSearch: string;
  activePanel: CommandPanel;
  fileSearchQuery: string;
  dictionaryQuery: string;
  translationQuery: string;
  spotifyQuery: string;
  githubQuery: string;
  quicklinksView: QuicklinksView;
}): LauncherUiSnapshot {
  return {
    commandSearch: state.commandSearch,
    activePanel: state.activePanel,
    fileSearchQuery: state.fileSearchQuery,
    dictionaryQuery: state.dictionaryQuery,
    translationQuery: state.translationQuery,
    spotifyQuery: state.spotifyQuery,
    githubQuery: state.githubQuery,
    quicklinksView: state.quicklinksView,
  };
}

export const useLauncherUiStore = create<LauncherUiState>((set) => ({
  commandSearch: "",
  activePanel: "commands",
  fileSearchQuery: "",
  dictionaryQuery: "",
  translationQuery: "",
  spotifyQuery: "",
  githubQuery: "",
  quicklinksView: "manage",
  dmenuSession: null,
  dmenuQuery: "",
  dmenuSnapshot: null,
  setCommandSearch: (value) => set({ commandSearch: value }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setFileSearchQuery: (query) => set({ fileSearchQuery: query }),
  setDictionaryQuery: (query) => set({ dictionaryQuery: query }),
  setTranslationQuery: (query) => set({ translationQuery: query }),
  setSpotifyQuery: (query) => set({ spotifyQuery: query }),
  setGithubQuery: (query) => set({ githubQuery: query }),
  setQuicklinksView: (view) => set({ quicklinksView: view }),
  setDmenuQuery: (query) => set({ dmenuQuery: query }),
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
  openSpotify: (query) =>
    set({
      spotifyQuery: query,
      activePanel: "spotify",
    }),
  openGithub: (query) =>
    set({
      githubQuery: query,
      activePanel: "github",
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
          dmenuSession: null,
          dmenuQuery: "",
          dmenuSnapshot: null,
        };
      }

      return {
        activePanel: snapshot.activePanel,
        commandSearch: snapshot.commandSearch,
        fileSearchQuery: snapshot.fileSearchQuery,
        dictionaryQuery: snapshot.dictionaryQuery,
        translationQuery: snapshot.translationQuery,
        spotifyQuery: snapshot.spotifyQuery,
        githubQuery: snapshot.githubQuery,
        quicklinksView: snapshot.quicklinksView,
        dmenuSession: null,
        dmenuQuery: "",
        dmenuSnapshot: null,
      };
    }),
  backToCommands: () =>
    set({
      activePanel: "commands",
      commandSearch: "",
      dmenuSession: null,
      dmenuQuery: "",
      dmenuSnapshot: null,
    }),
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
