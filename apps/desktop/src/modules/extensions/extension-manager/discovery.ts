import {
  parseDiscoveredPlugin,
  type DiscoveredPluginRecord as ProtocolDiscoveredPluginRecord,
} from "@beam/extension-protocol";

export type ExtensionMode = "view" | "no-view" | "menu-bar";

interface DiscoveredPluginRecord extends Omit<ProtocolDiscoveredPluginRecord, "mode"> {
  mode: ExtensionMode;
}

function normalizeDiscoveredPluginRecord(value: unknown): DiscoveredPluginRecord | null {
  const plugin = parseDiscoveredPlugin(value);
  if (!plugin) {
    return null;
  }

  return {
    ...plugin,
    mode: plugin.mode === "menu-bar" ? "menu-bar" : plugin.mode === "no-view" ? "no-view" : "view",
  };
}
