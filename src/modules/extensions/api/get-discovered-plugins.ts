import { invoke, isTauri } from "@tauri-apps/api/core";

import { pluginInfoSchema, pluginListSchema, type PluginInfo } from "@/modules/extensions/types";

function normalizePluginInfo(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  return {
    ...record,
    pluginTitle: record.pluginTitle ?? record.plugin_title,
    pluginName: record.pluginName ?? record.plugin_name,
    commandName: record.commandName ?? record.command_name,
    pluginPath: record.pluginPath ?? record.plugin_path,
    commandPreferences: record.commandPreferences ?? record.command_preferences,
    interval: record.interval,
  };
}

export async function getDiscoveredPlugins(): Promise<PluginInfo[]> {
  if (!isTauri()) {
    return [];
  }

  const response = await invoke<unknown>("get_discovered_plugins");
  const parsed = pluginListSchema.safeParse(response);
  if (parsed.success) {
    return parsed.data;
  }

  if (!Array.isArray(response)) {
    throw new Error("invalid plugin discovery response from backend");
  }

  const discoveredPlugins: PluginInfo[] = [];
  for (const plugin of response) {
    const normalized = normalizePluginInfo(plugin);
    const parsedPlugin = pluginInfoSchema.safeParse(normalized);
    if (parsedPlugin.success) {
      discoveredPlugins.push(parsedPlugin.data);
    }
  }

  return discoveredPlugins;
}
