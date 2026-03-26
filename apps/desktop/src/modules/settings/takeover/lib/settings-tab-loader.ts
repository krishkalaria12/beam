import type { ComponentType } from "react";

import type { SettingsPageTab } from "@/modules/settings/takeover/store/use-settings-page-store";

type SettingsTabComponent = ComponentType<unknown>;

const settingsTabLoaders: Record<SettingsPageTab, () => Promise<SettingsTabComponent>> = {
  about: () =>
    import("@/modules/settings/takeover/tabs/about/about-tab").then(
      (mod) => mod.AboutTab as SettingsTabComponent,
    ),
  extensions: () =>
    import("@/modules/settings/takeover/tabs/extensions/extensions-tab").then(
      (mod) => mod.ExtensionsTab as SettingsTabComponent,
    ),
  general: () =>
    import("@/modules/settings/takeover/tabs/general/general-tab").then(
      (mod) => mod.GeneralTab as SettingsTabComponent,
    ),
  keybinds: () =>
    import("@/modules/settings/takeover/tabs/keybinds/keybinds-tab").then(
      (mod) => mod.KeybindsTab as SettingsTabComponent,
    ),
};

const loadedSettingsTabs = new Map<SettingsPageTab, SettingsTabComponent>();
const settingsTabPromises = new Map<SettingsPageTab, Promise<SettingsTabComponent>>();

async function loadSettingsTab(tab: SettingsPageTab): Promise<SettingsTabComponent> {
  const cachedTab = loadedSettingsTabs.get(tab);
  if (cachedTab) {
    return cachedTab;
  }

  const pendingTab = settingsTabPromises.get(tab);
  if (pendingTab) {
    return pendingTab;
  }

  const loader = settingsTabLoaders[tab];
  const nextTabPromise = loader()
    .then((component) => {
      loadedSettingsTabs.set(tab, component);
      settingsTabPromises.delete(tab);
      return component;
    })
    .catch((error) => {
      settingsTabPromises.delete(tab);
      throw error;
    });

  settingsTabPromises.set(tab, nextTabPromise);
  return nextTabPromise;
}

export function getLoadedSettingsTab(tab: SettingsPageTab): SettingsTabComponent | null {
  return loadedSettingsTabs.get(tab) ?? null;
}

export async function preloadSettingsTab(tab: SettingsPageTab): Promise<void> {
  await loadSettingsTab(tab);
}
