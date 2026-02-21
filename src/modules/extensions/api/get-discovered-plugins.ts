import { invoke, isTauri } from "@tauri-apps/api/core";

import { pluginListSchema, type PluginInfo } from "@/modules/extensions/types";

export async function getDiscoveredPlugins(): Promise<PluginInfo[]> {
  if (!isTauri()) {
    return [];
  }

  const response = await invoke<unknown>("get_discovered_plugins");
  const parsed = pluginListSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("invalid plugin discovery response from backend");
  }

  return parsed.data;
}
