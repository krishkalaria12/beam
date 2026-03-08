export type ExtensionMode = "view" | "no-view" | "menu-bar";

export interface DiscoveredPluginRecord {
  title: string;
  description?: string;
  pluginTitle: string;
  pluginName: string;
  commandName: string;
  pluginPath: string;
  mode: ExtensionMode;
  interval?: string;
}

export function normalizeDiscoveredPluginRecord(value: unknown): DiscoveredPluginRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const pluginPathRaw = record.pluginPath ?? record.plugin_path;
  const commandNameRaw = record.commandName ?? record.command_name;
  const pluginNameRaw = record.pluginName ?? record.plugin_name;
  const pluginTitleRaw = record.pluginTitle ?? record.plugin_title;
  const titleRaw = record.title;
  const modeRaw = typeof record.mode === "string" ? record.mode.trim().toLowerCase() : "view";
  const intervalRaw = typeof record.interval === "string" ? record.interval.trim() : "";

  if (
    typeof pluginPathRaw !== "string" ||
    typeof commandNameRaw !== "string" ||
    typeof pluginNameRaw !== "string"
  ) {
    return null;
  }

  return {
    pluginPath: pluginPathRaw,
    commandName: commandNameRaw,
    pluginName: pluginNameRaw,
    pluginTitle: typeof pluginTitleRaw === "string" ? pluginTitleRaw : pluginNameRaw,
    title: typeof titleRaw === "string" ? titleRaw : commandNameRaw,
    description: typeof record.description === "string" ? record.description : undefined,
    mode: modeRaw === "menu-bar" ? "menu-bar" : modeRaw === "no-view" ? "no-view" : "view",
    interval: intervalRaw.length > 0 ? intervalRaw : undefined,
  };
}
