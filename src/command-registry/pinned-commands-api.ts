import { invoke } from "@tauri-apps/api/core";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePinnedCommandIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of value) {
    const rawId = typeof entry === "string"
      ? entry
      : isRecord(entry) && typeof entry.command_id === "string"
        ? entry.command_id
        : "";
    const commandId = rawId.trim();
    if (!commandId || seen.has(commandId)) {
      continue;
    }
    seen.add(commandId);
    normalized.push(commandId);
  }

  return normalized;
}

export async function getPinnedCommandIds(): Promise<string[]> {
  const response = await invoke<unknown>("get_pinned_command_ids");
  return normalizePinnedCommandIds(response);
}

export async function setPinnedCommand(
  commandId: string,
  pinned: boolean,
): Promise<string[]> {
  const response = await invoke<unknown>("set_command_pinned", {
    commandId,
    pinned,
  });

  return normalizePinnedCommandIds(response);
}

