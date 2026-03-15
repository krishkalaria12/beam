import { invoke, isTauri } from "@tauri-apps/api/core";
import { parseDiscoveredPluginList } from "@beam/extension-protocol";

import type { PluginInfo } from "@/modules/extensions/types";

export async function getDiscoveredPlugins(): Promise<PluginInfo[]> {
  if (!isTauri()) {
    return [];
  }

  const response = await invoke<unknown>("get_discovered_plugins");
  const parsed = parseDiscoveredPluginList(response);
  if (parsed) {
    return parsed;
  }

  if (!Array.isArray(response)) {
    throw new Error("invalid plugin discovery response from backend");
  }
  throw new Error("invalid plugin discovery response from backend");
}
