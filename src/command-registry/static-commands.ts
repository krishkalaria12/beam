import type { CommandDescriptor, CommandScope } from "@/command-registry/types";

const SCOPE_NORMAL: CommandScope[] = ["normal"];
const SCOPE_NORMAL_COMPRESSED: CommandScope[] = ["normal", "compressed"];
const SCOPE_NORMAL_COMPRESSED_QUICKLINK: CommandScope[] = [
  "normal",
  "compressed",
  "quicklink-trigger",
];
const SCOPE_NORMAL_COMPRESSED_SYSTEM: CommandScope[] = [
  "normal",
  "compressed",
  "system-trigger",
];
const SCOPE_ALL: CommandScope[] = ["all"];

const SYSTEM_ACTION_DESCRIPTORS: CommandDescriptor[] = [
  {
    id: "system.shutdown",
    title: "shutdown",
    keywords: ["shutdown", "power off", "turn off", "shut down"],
    endText: "system",
    icon: "system",
    kind: "backend-action",
    scope: SCOPE_NORMAL_COMPRESSED_SYSTEM,
    action: {
      type: "INVOKE_TAURI",
      payload: {
        command: "execute_system_action",
        args: { action: "shutdown" },
      },
    },
  },
  {
    id: "system.reboot",
    title: "reboot",
    keywords: ["reboot", "restart"],
    endText: "system",
    icon: "system",
    kind: "backend-action",
    scope: SCOPE_NORMAL_COMPRESSED_SYSTEM,
    action: {
      type: "INVOKE_TAURI",
      payload: {
        command: "execute_system_action",
        args: { action: "reboot" },
      },
    },
  },
  {
    id: "system.logout",
    title: "logout",
    keywords: ["logout", "log out", "sign out"],
    endText: "system",
    icon: "system",
    kind: "backend-action",
    scope: SCOPE_NORMAL_COMPRESSED_SYSTEM,
    action: {
      type: "INVOKE_TAURI",
      payload: {
        command: "execute_system_action",
        args: { action: "logout" },
      },
    },
  },
  {
    id: "system.sleep",
    title: "sleep",
    keywords: ["sleep", "suspend"],
    endText: "system",
    icon: "system",
    kind: "backend-action",
    scope: SCOPE_NORMAL_COMPRESSED_SYSTEM,
    action: {
      type: "INVOKE_TAURI",
      payload: {
        command: "execute_system_action",
        args: { action: "sleep" },
      },
    },
  },
  {
    id: "system.hibernate",
    title: "hibernate",
    keywords: ["hibernate", "deep sleep"],
    endText: "system",
    icon: "system",
    kind: "backend-action",
    scope: SCOPE_NORMAL_COMPRESSED_SYSTEM,
    action: {
      type: "INVOKE_TAURI",
      payload: {
        command: "execute_system_action",
        args: { action: "hibernate" },
      },
    },
  },
];

export const STATIC_COMMANDS: CommandDescriptor[] = [
  {
    id: "settings.panel.open",
    title: "settings",
    keywords: ["settings", "theme", "colors", "appearance", "mode"],
    endText: "open",
    icon: "settings",
    kind: "panel",
    scope: SCOPE_NORMAL_COMPRESSED,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "settings" },
    },
  },
  {
    id: "clipboard.panel.open",
    title: "clipboard history",
    keywords: ["clipboard", "history"],
    endText: "open",
    icon: "clipboard",
    kind: "panel",
    scope: SCOPE_NORMAL,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "clipboard" },
    },
  },
  {
    id: "calculator.history.panel.open",
    title: "calculator history",
    keywords: ["calculator", "history"],
    endText: "open",
    icon: "calculator",
    kind: "panel",
    scope: SCOPE_NORMAL,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "calculator-history" },
    },
  },
  {
    id: "emoji.panel.open",
    title: "emoji picker",
    keywords: ["emoji", "picker", "emoticon", "smiley", "reaction", "kaomoji", "symbols"],
    endText: "open",
    icon: "emoji",
    kind: "panel",
    scope: SCOPE_NORMAL,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "emoji" },
    },
  },
  {
    id: "speed_test.panel.open",
    title: "network speed test",
    keywords: ["speed", "speed test", "internet speed", "network", "diagnostics"],
    endText: "network",
    icon: "speed-test",
    kind: "panel",
    scope: SCOPE_NORMAL_COMPRESSED_QUICKLINK,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "speed-test" },
    },
  },
  {
    id: "file_search.panel.open",
    title: "search files",
    keywords: ["files", "search files", "open file"],
    endText: "files",
    icon: "files",
    kind: "panel",
    scope: SCOPE_NORMAL_COMPRESSED_QUICKLINK,
    requiresQuery: true,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "file-search" },
    },
  },
  {
    id: "dictionary.panel.open",
    title: "search word with dictionary",
    keywords: ["dictionary", "word", "meaning", "define"],
    endText: "dictionary",
    icon: "dictionary",
    kind: "panel",
    scope: SCOPE_NORMAL_COMPRESSED,
    requiresQuery: true,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "dictionary" },
    },
  },
  {
    id: "translation.panel.open",
    title: "translate text",
    keywords: ["translate", "translation", "language", "convert text"],
    endText: "translate",
    icon: "translation",
    kind: "panel",
    scope: SCOPE_NORMAL_COMPRESSED_QUICKLINK,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "translation" },
    },
  },
  {
    id: "quicklinks.panel.create",
    title: "add quicklink",
    keywords: ["quicklink", "add quicklink", "create quicklink"],
    endText: "quicklink",
    icon: "quicklink-create",
    kind: "panel",
    scope: SCOPE_NORMAL_COMPRESSED,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "quicklinks", view: "create" },
    },
  },
  {
    id: "quicklinks.panel.manage",
    title: "manage quicklinks",
    keywords: ["quicklink", "manage quicklinks", "quicklink list"],
    endText: "quicklink",
    icon: "quicklink-manage",
    kind: "panel",
    scope: SCOPE_NORMAL_COMPRESSED,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "quicklinks", view: "manage" },
    },
  },
  {
    id: "search.web.google",
    title: "search with google",
    keywords: ["google", "web search", "search"],
    endText: "web",
    icon: "google",
    kind: "action",
    scope: SCOPE_NORMAL_COMPRESSED_QUICKLINK,
    requiresQuery: true,
    action: {
      type: "INVOKE_TAURI",
      payload: {
        command: "search_with_browser",
        args: { site: "google" },
      },
    },
  },
  {
    id: "search.web.duckduckgo",
    title: "search with duckduckgo",
    keywords: ["duckduckgo", "ddg", "web search", "search"],
    endText: "web",
    icon: "duckduckgo",
    kind: "action",
    scope: SCOPE_NORMAL_COMPRESSED_QUICKLINK,
    requiresQuery: true,
    action: {
      type: "INVOKE_TAURI",
      payload: {
        command: "search_with_browser",
        args: { site: "duckduckgo" },
      },
    },
  },
  {
    id: "settings.appearance.open",
    title: "appearance mode",
    keywords: ["appearance", "dark", "light", "mode"],
    endText: "theme",
    icon: "appearance",
    kind: "panel",
    scope: SCOPE_ALL,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "settings", view: "appearance" },
    },
  },
  {
    id: "settings.themes.open",
    title: "theme selection",
    keywords: ["theme", "palette", "colors"],
    endText: "theme",
    icon: "theme",
    kind: "panel",
    scope: SCOPE_ALL,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "settings", view: "themes" },
    },
  },
  {
    id: "settings.layout.open",
    title: "ui density",
    keywords: ["ui density", "expand", "compress", "size", "layout"],
    endText: "size",
    icon: "layout",
    kind: "panel",
    scope: SCOPE_ALL,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "settings", view: "layout" },
    },
  },
  {
    id: "navigation.commands.back",
    title: "back to commands",
    keywords: ["back", "commands", "back to commands"],
    endText: "back",
    icon: "back",
    kind: "panel",
    scope: SCOPE_ALL,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "commands" },
    },
  },
  {
    id: "navigation.settings.back",
    title: "back to settings",
    keywords: ["back", "settings", "back to settings"],
    endText: "back",
    icon: "back",
    kind: "panel",
    scope: SCOPE_ALL,
    action: {
      type: "OPEN_PANEL",
      payload: { panel: "settings", view: "main" },
    },
  },
  ...SYSTEM_ACTION_DESCRIPTORS,
];

