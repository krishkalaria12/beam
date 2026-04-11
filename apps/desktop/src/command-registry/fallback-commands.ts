import type { CommandMode } from "@/command-registry/types";
import type { RankedCommand } from "@/command-registry/ranker";

export const AVAILABLE_FALLBACK_COMMAND_IDS = [
  "file_search.panel.open",
  "search.web.google",
  "quicklinks.panel.create",
  "script_commands.panel.open",
  "todo.panel.open",
] as const;

export type FallbackCommandId = (typeof AVAILABLE_FALLBACK_COMMAND_IDS)[number];

export const DEFAULT_FALLBACK_COMMAND_IDS: readonly FallbackCommandId[] = [
  "file_search.panel.open",
  "search.web.google",
  "quicklinks.panel.create",
  "script_commands.panel.open",
  "todo.panel.open",
];

const FALLBACK_MODE_SET = new Set<CommandMode>(["normal", "compressed"]);
const AVAILABLE_FALLBACK_COMMAND_ID_SET = new Set<string>(AVAILABLE_FALLBACK_COMMAND_IDS);

export function isFallbackMode(mode: CommandMode): boolean {
  return FALLBACK_MODE_SET.has(mode);
}

function isAvailableFallbackCommandId(value: string): value is FallbackCommandId {
  return AVAILABLE_FALLBACK_COMMAND_ID_SET.has(value);
}

export function normalizeFallbackCommandIds(value: unknown): FallbackCommandId[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_FALLBACK_COMMAND_IDS];
  }

  const dedupe = new Set<FallbackCommandId>();
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    if (!isAvailableFallbackCommandId(entry)) {
      continue;
    }
    dedupe.add(entry);
  }

  return [...dedupe];
}

export function hasStrongRegistryMatch(commands: readonly RankedCommand[]): boolean {
  if (commands.length === 0) {
    return false;
  }

  return commands.some(
    (entry) =>
      entry.match.titleMatch !== "none" ||
      entry.match.keywordMatch !== "none" ||
      entry.match.aliasMatch !== "none" ||
      entry.match.matchedTokenCount > 0,
  );
}
