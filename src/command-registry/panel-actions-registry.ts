import { COMMAND_PANELS } from "@/command-registry/panels";
import type { CommandPanel } from "@/command-registry/types";

export type PanelQuicklinksView = "create" | "manage";

export interface PanelCommandRegistration {
  id: string;
  title: string;
}

const PANEL_COMMAND_REGISTRY: Partial<Record<CommandPanel, PanelCommandRegistration>> = {
  [COMMAND_PANELS.SETTINGS]: { id: "settings.panel.open", title: "settings" },
  [COMMAND_PANELS.CALCULATOR_HISTORY]: {
    id: "calculator.history.panel.open",
    title: "calculator history",
  },
  [COMMAND_PANELS.EMOJI]: { id: "emoji.panel.open", title: "emoji picker" },
  [COMMAND_PANELS.TODO]: { id: "todo.panel.open", title: "todo list" },
  [COMMAND_PANELS.AI]: { id: "ai.panel.open", title: "ai chat" },
  [COMMAND_PANELS.SNIPPETS]: { id: "snippets.panel.open", title: "snippets" },
  [COMMAND_PANELS.CLIPBOARD]: { id: "clipboard.panel.open", title: "clipboard history" },
  [COMMAND_PANELS.SPEED_TEST]: { id: "speed_test.panel.open", title: "network speed test" },
  [COMMAND_PANELS.FILE_SEARCH]: { id: "file_search.panel.open", title: "search files" },
  [COMMAND_PANELS.DICTIONARY]: { id: "dictionary.panel.open", title: "define word" },
  [COMMAND_PANELS.WINDOW_SWITCHER]: {
    id: "window_switcher.panel.open",
    title: "focus open windows",
  },
  [COMMAND_PANELS.TRANSLATION]: { id: "translation.panel.open", title: "translate text" },
  [COMMAND_PANELS.SPOTIFY]: { id: "spotify.panel.open", title: "spotify controls" },
  [COMMAND_PANELS.GITHUB]: { id: "github.panel.open", title: "github activity" },
  [COMMAND_PANELS.EXTENSIONS]: { id: "extensions.panel.open", title: "manage extensions" },
  [COMMAND_PANELS.SCRIPT_COMMANDS]: {
    id: "script_commands.panel.open",
    title: "script commands",
  },
  [COMMAND_PANELS.HYPRWHSPR]: { id: "hyprwhspr.panel.open", title: "hyprwhspr" },
};

const QUICKLINK_COMMAND_REGISTRY: Record<PanelQuicklinksView, PanelCommandRegistration> = {
  create: { id: "quicklinks.panel.create", title: "add quicklink" },
  manage: { id: "quicklinks.panel.manage", title: "manage quicklinks" },
};

export function getPanelCommandRegistration(
  panel: CommandPanel,
  quicklinksView: PanelQuicklinksView = "manage",
): PanelCommandRegistration | null {
  if (panel === COMMAND_PANELS.QUICKLINKS) {
    return QUICKLINK_COMMAND_REGISTRY[quicklinksView];
  }

  return PANEL_COMMAND_REGISTRY[panel] ?? null;
}

const PANEL_PRIMARY_ACTION_LABELS: Partial<Record<CommandPanel, string>> = {
  [COMMAND_PANELS.SETTINGS]: "Open",
  [COMMAND_PANELS.CALCULATOR_HISTORY]: "Copy",
  [COMMAND_PANELS.EMOJI]: "Copy",
  [COMMAND_PANELS.TODO]: "Create",
  [COMMAND_PANELS.AI]: "Send",
  [COMMAND_PANELS.SNIPPETS]: "Paste",
  [COMMAND_PANELS.CLIPBOARD]: "Copy",
  [COMMAND_PANELS.SPEED_TEST]: "Start",
  [COMMAND_PANELS.FILE_SEARCH]: "Open",
  [COMMAND_PANELS.DICTIONARY]: "Copy",
  [COMMAND_PANELS.WINDOW_SWITCHER]: "Focus",
  [COMMAND_PANELS.TRANSLATION]: "Translate",
  [COMMAND_PANELS.SPOTIFY]: "Search",
  [COMMAND_PANELS.GITHUB]: "Search",
  [COMMAND_PANELS.QUICKLINKS]: "Open",
  [COMMAND_PANELS.EXTENSIONS]: "Open",
  [COMMAND_PANELS.SCRIPT_COMMANDS]: "Run",
  [COMMAND_PANELS.HYPRWHSPR]: "Toggle",
  [COMMAND_PANELS.EXTENSION_RUNNER]: "Run",
};

export function getPanelPrimaryActionLabel(panel: CommandPanel): string {
  return PANEL_PRIMARY_ACTION_LABELS[panel] ?? "Run";
}
