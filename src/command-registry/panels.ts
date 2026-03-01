export const COMMAND_PANELS = {
  COMMANDS: "commands",
  TODO: "todo",
  SNIPPETS: "snippets",
  CLIPBOARD: "clipboard",
  EMOJI: "emoji",
  SETTINGS: "settings",
  CALCULATOR_HISTORY: "calculator-history",
  FILE_SEARCH: "file-search",
  DICTIONARY: "dictionary",
  QUICKLINKS: "quicklinks",
  SPEED_TEST: "speed-test",
  TRANSLATION: "translation",
  SPOTIFY: "spotify",
  GITHUB: "github",
  EXTENSIONS: "extensions",
  WINDOW_SWITCHER: "window-switcher",
  HYPRWHSPR: "hyprwhspr",
  SCRIPT_COMMANDS: "script-commands",
  EXTENSION_RUNNER: "extension-runner",
} as const;

export type CommandPanelValue = (typeof COMMAND_PANELS)[keyof typeof COMMAND_PANELS];

export const COMMAND_PANEL_VALUES = Object.values(COMMAND_PANELS) as readonly CommandPanelValue[];

const COMMAND_PANEL_SET: ReadonlySet<CommandPanelValue> = new Set(COMMAND_PANEL_VALUES);

export function isCommandPanel(value: unknown): value is CommandPanelValue {
  return typeof value === "string" && COMMAND_PANEL_SET.has(value as CommandPanelValue);
}

export const TAKEOVER_COMMAND_PANELS = [
  COMMAND_PANELS.TODO,
  COMMAND_PANELS.SNIPPETS,
  COMMAND_PANELS.FILE_SEARCH,
  COMMAND_PANELS.DICTIONARY,
  COMMAND_PANELS.TRANSLATION,
  COMMAND_PANELS.SPOTIFY,
  COMMAND_PANELS.GITHUB,
  COMMAND_PANELS.QUICKLINKS,
  COMMAND_PANELS.SPEED_TEST,
  COMMAND_PANELS.CLIPBOARD,
  COMMAND_PANELS.EXTENSIONS,
  COMMAND_PANELS.WINDOW_SWITCHER,
  COMMAND_PANELS.HYPRWHSPR,
  COMMAND_PANELS.SCRIPT_COMMANDS,
  COMMAND_PANELS.EXTENSION_RUNNER,
] as const;

export type TakeoverCommandPanel = (typeof TAKEOVER_COMMAND_PANELS)[number];
