import { COMMAND_PANEL_VALUES, type CommandPanelValue } from "@/command-registry/panels";
import type { CommandDescriptor, CommandPanel } from "@/command-registry/types";
import { isCommandPanel } from "@/command-registry/panels";

export type LauncherPanelWarmupTier = "boot" | "idle" | "intent" | "rare";

const PANEL_WARMUP_TIERS: Partial<Record<CommandPanel, LauncherPanelWarmupTier>> = {
  "calculator-history": "boot",
  emoji: "boot",
  clipboard: "idle",
  notes: "idle",
  quicklinks: "idle",
  settings: "idle",
  todo: "intent",
  ai: "intent",
  snippets: "intent",
  "speed-test": "intent",
  "file-search": "intent",
  dictionary: "intent",
  "window-switcher": "intent",
  translation: "intent",
  spotify: "intent",
  github: "intent",
  extensions: "intent",
  "script-commands": "intent",
  hyprwhspr: "rare",
  dmenu: "rare",
  "extension-runner": "rare",
};

export function getLauncherPanelWarmupTier(panel: CommandPanel): LauncherPanelWarmupTier {
  return PANEL_WARMUP_TIERS[panel] ?? "rare";
}

export function getLauncherPanelsForWarmupTier(
  tier: LauncherPanelWarmupTier,
): readonly CommandPanel[] {
  return COMMAND_PANEL_VALUES.filter(
    (panel): panel is CommandPanel =>
      panel !== "commands" && getLauncherPanelWarmupTier(panel as CommandPanelValue) === tier,
  );
}

export function getLauncherPanelFromCommand(command: CommandDescriptor): CommandPanel | null {
  if (command.action?.type !== "OPEN_PANEL") {
    return null;
  }

  const panel = command.action.payload?.panel;
  return isCommandPanel(panel) ? panel : null;
}
