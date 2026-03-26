import type { CommandPanel } from "@/command-registry/types";

const MAX_RETAINED_TAKEOVER_PANELS = 5;

// Hidden-mounted panels must be free of global key listeners or destructive mount/unmount resets.
const RETAINED_TAKEOVER_PANELS = [
  "clipboard",
  "extensions",
  "notes",
  "quicklinks",
  "todo",
] as const;

export type RetainedTakeoverPanel = (typeof RETAINED_TAKEOVER_PANELS)[number];

export function isRetainedTakeoverPanel(panel: CommandPanel): panel is RetainedTakeoverPanel {
  return (RETAINED_TAKEOVER_PANELS as readonly string[]).includes(panel);
}

export function retainTakeoverPanel(
  panels: readonly RetainedTakeoverPanel[],
  activePanel: CommandPanel,
): readonly RetainedTakeoverPanel[] {
  if (!isRetainedTakeoverPanel(activePanel)) {
    return panels;
  }

  const existingIndex = panels.indexOf(activePanel);
  if (existingIndex === panels.length - 1 && panels.length <= MAX_RETAINED_TAKEOVER_PANELS) {
    return panels;
  }

  const nextPanels = panels.filter((panel) => panel !== activePanel);
  nextPanels.push(activePanel);

  if (nextPanels.length <= MAX_RETAINED_TAKEOVER_PANELS) {
    return nextPanels;
  }

  return nextPanels.slice(nextPanels.length - MAX_RETAINED_TAKEOVER_PANELS);
}
