import { create } from "zustand";

export type SettingsPageTab = "general" | "extensions" | "keybinds" | "about";

export interface SettingsExtensionTarget {
  pluginName: string | null;
  commandName: string | null;
  requestKey: number;
}

interface SettingsPageState {
  activeTab: SettingsPageTab;
  extensionTarget: SettingsExtensionTarget | null;
  setActiveTab: (tab: SettingsPageTab) => void;
  openGeneral: () => void;
  openExtensions: (pluginName?: string | null, commandName?: string | null) => void;
  clearExtensionTarget: () => void;
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export const useSettingsPageStore = create<SettingsPageState>((set) => ({
  activeTab: "general",
  extensionTarget: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  openGeneral: () => set({ activeTab: "general", extensionTarget: null }),
  openExtensions: (pluginName, commandName) =>
    set({
      activeTab: "extensions",
      extensionTarget: {
        pluginName: normalizeOptionalString(pluginName),
        commandName: normalizeOptionalString(commandName),
        requestKey: Date.now(),
      },
    }),
  clearExtensionTarget: () => set({ extensionTarget: null }),
}));
