import type { ComponentType } from "react";

import type { CommandPanel } from "@/command-registry/types";

const SECONDARY_LAUNCHER_PANELS = ["calculator-history", "emoji"] as const;

export type SecondaryLauncherPanel = (typeof SECONDARY_LAUNCHER_PANELS)[number];

type SecondaryPanelComponent = ComponentType<unknown>;

const secondaryPanelLoaders: Record<
  SecondaryLauncherPanel,
  () => Promise<SecondaryPanelComponent>
> = {
  "calculator-history": () =>
    import("@/modules/calculator-history/components/calculator-history-command-group").then(
      (mod) => mod.default as SecondaryPanelComponent,
    ),
  emoji: () =>
    import("@/modules/emoji/components/emoji-command-group").then(
      (mod) => mod.default as SecondaryPanelComponent,
    ),
};

const loadedSecondaryPanels = new Map<SecondaryLauncherPanel, SecondaryPanelComponent>();
const secondaryPanelPromises = new Map<SecondaryLauncherPanel, Promise<SecondaryPanelComponent>>();

export function isSecondaryLauncherPanel(panel: CommandPanel): panel is SecondaryLauncherPanel {
  return (SECONDARY_LAUNCHER_PANELS as readonly string[]).includes(panel);
}

async function loadSecondaryPanel(panel: SecondaryLauncherPanel): Promise<SecondaryPanelComponent> {
  const cachedPanel = loadedSecondaryPanels.get(panel);
  if (cachedPanel) {
    return cachedPanel;
  }

  const pendingPanel = secondaryPanelPromises.get(panel);
  if (pendingPanel) {
    return pendingPanel;
  }

  const loader = secondaryPanelLoaders[panel];
  const nextPanelPromise = loader()
    .then((component) => {
      loadedSecondaryPanels.set(panel, component);
      secondaryPanelPromises.delete(panel);
      return component;
    })
    .catch((error) => {
      secondaryPanelPromises.delete(panel);
      throw error;
    });

  secondaryPanelPromises.set(panel, nextPanelPromise);
  return nextPanelPromise;
}

export function getLoadedSecondaryPanel(
  panel: SecondaryLauncherPanel,
): SecondaryPanelComponent | null {
  return loadedSecondaryPanels.get(panel) ?? null;
}

export async function preloadSecondaryLauncherPanel(panel: SecondaryLauncherPanel): Promise<void> {
  await loadSecondaryPanel(panel);
}
