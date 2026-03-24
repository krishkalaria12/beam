import { invoke, isTauri } from "@tauri-apps/api/core";

import type { CalculatorHistoryEntry } from "@/modules/calculator-history/api/get-calculator-history";

export const pinnedCalculatorHistoryQueryKey = ["calculator", "history", "pinned"] as const;

function normalizeTimestampList(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<number>();
  const normalized: number[] = [];
  for (const entry of value) {
    if (typeof entry !== "number" || !Number.isFinite(entry) || seen.has(entry)) {
      continue;
    }

    seen.add(entry);
    normalized.push(entry);
  }

  return normalized;
}

export async function getPinnedCalculatorHistoryTimestamps(): Promise<number[]> {
  if (!isTauri()) {
    return [];
  }

  const response = await invoke<unknown>("get_pinned_calculator_history_timestamps");
  return normalizeTimestampList(response);
}

export async function setCalculatorHistoryEntryPinned(
  entry: Pick<CalculatorHistoryEntry, "timestamp">,
  pinned: boolean,
): Promise<number[]> {
  const response = await invoke<unknown>("set_calculator_history_entry_pinned", {
    timestamp: entry.timestamp,
    pinned,
  });

  return normalizeTimestampList(response);
}

export async function deleteCalculatorHistoryEntry(
  entry: Pick<CalculatorHistoryEntry, "timestamp">,
) {
  await invoke("delete_calculator_history_entry", { timestamp: entry.timestamp });
}

export async function clearCalculatorHistory() {
  await invoke("clear_calculator_history");
}
