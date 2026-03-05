import { invoke, isTauri } from "@tauri-apps/api/core";

export const NON_HIDEABLE_COMMAND_IDS = new Set<string>(["settings.panel.open"]);

export function isNonHideableCommandId(commandId: string): boolean {
  return NON_HIDEABLE_COMMAND_IDS.has(commandId.trim());
}

function normalizeCommandIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const commandId = item.trim();
    if (!commandId || seen.has(commandId)) {
      continue;
    }
    seen.add(commandId);
    normalized.push(commandId);
  }

  return normalized;
}

export async function getHiddenCommandIds(): Promise<string[]> {
  if (!isTauri()) {
    return [];
  }

  const result = await invoke<unknown>("get_hidden_command_ids");
  return normalizeCommandIds(result);
}

export async function setCommandHidden(commandId: string, hidden: boolean): Promise<string[]> {
  if (!isTauri()) {
    return [];
  }

  const result = await invoke<unknown>("set_command_hidden", {
    commandId,
    hidden,
  });
  return normalizeCommandIds(result);
}
