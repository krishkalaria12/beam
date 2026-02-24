import type { CommandRankingSignals } from "@/command-registry/ranker";

export const COMMAND_PREFERENCES_STORAGE_KEY = "beam-command-preferences";
export const COMMAND_PREFERENCES_SCHEMA_VERSION = 2 as const;

export interface CommandUsageEntry {
  count: number;
  lastUsedAt: string | null;
}

export interface CommandPreferencesState {
  version: typeof COMMAND_PREFERENCES_SCHEMA_VERSION;
  usageById: Record<string, CommandUsageEntry>;
  favoriteCommandIds: string[];
  pinnedCommandIds: string[];
  hiddenCommandIds: string[];
  aliasesById: Record<string, string[]>;
  hotkeysByCommandId: Record<string, string>;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function getStorage(storageOverride?: StorageLike): StorageLike | null {
  if (storageOverride) {
    return storageOverride;
  }

  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const dedupe = new Set<string>();
  for (const item of value) {
    if (!isNonEmptyString(item)) {
      continue;
    }
    dedupe.add(item.trim());
  }

  return [...dedupe];
}

function normalizeAliases(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const aliases: Record<string, string[]> = {};
  for (const [commandId, commandAliases] of Object.entries(value as Record<string, unknown>)) {
    if (!isNonEmptyString(commandId) || !Array.isArray(commandAliases)) {
      continue;
    }

    const uniqueAliases = new Set<string>();
    for (const alias of commandAliases) {
      if (!isNonEmptyString(alias)) {
        continue;
      }
      uniqueAliases.add(alias.trim());
    }

    aliases[commandId.trim()] = [...uniqueAliases];
  }

  return aliases;
}

function normalizeHotkeys(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const hotkeys: Record<string, string> = {};
  for (const [commandId, hotkey] of Object.entries(value as Record<string, unknown>)) {
    if (!isNonEmptyString(commandId) || !isNonEmptyString(hotkey)) {
      continue;
    }
    hotkeys[commandId.trim()] = hotkey.trim();
  }

  return hotkeys;
}

function normalizeUsage(value: unknown): Record<string, CommandUsageEntry> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const usage: Record<string, CommandUsageEntry> = {};
  for (const [commandId, rawEntry] of Object.entries(value as Record<string, unknown>)) {
    if (!isNonEmptyString(commandId)) {
      continue;
    }

    if (typeof rawEntry === "number" && Number.isFinite(rawEntry)) {
      usage[commandId.trim()] = {
        count: Math.max(0, Math.floor(rawEntry)),
        lastUsedAt: null,
      };
      continue;
    }

    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }

    const entry = rawEntry as Record<string, unknown>;
    const count = entry.count;
    const lastUsedAt = entry.lastUsedAt;

    usage[commandId.trim()] = {
      count: typeof count === "number" && Number.isFinite(count)
        ? Math.max(0, Math.floor(count))
        : 0,
      lastUsedAt: typeof lastUsedAt === "string" && lastUsedAt.trim().length > 0
        ? lastUsedAt
        : null,
    };
  }

  return usage;
}

export function createDefaultCommandPreferencesState(): CommandPreferencesState {
  return {
    version: COMMAND_PREFERENCES_SCHEMA_VERSION,
    usageById: {},
    favoriteCommandIds: [],
    pinnedCommandIds: [],
    hiddenCommandIds: [],
    aliasesById: {},
    hotkeysByCommandId: {},
  };
}

export function migrateCommandPreferences(raw: unknown): CommandPreferencesState {
  const defaults = createDefaultCommandPreferencesState();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const record = raw as Record<string, unknown>;

  if (record.version === COMMAND_PREFERENCES_SCHEMA_VERSION) {
    return {
      version: COMMAND_PREFERENCES_SCHEMA_VERSION,
      usageById: normalizeUsage(record.usageById),
      favoriteCommandIds: normalizeIdList(record.favoriteCommandIds),
      pinnedCommandIds: normalizeIdList(record.pinnedCommandIds),
      hiddenCommandIds: normalizeIdList(record.hiddenCommandIds),
      aliasesById: normalizeAliases(record.aliasesById),
      hotkeysByCommandId: normalizeHotkeys(record.hotkeysByCommandId),
    };
  }

  const usage = normalizeUsage(record.usageById ?? record.usage);
  return {
    version: COMMAND_PREFERENCES_SCHEMA_VERSION,
    usageById: usage,
    favoriteCommandIds: normalizeIdList(record.favoriteCommandIds ?? record.favorites),
    pinnedCommandIds: normalizeIdList(record.pinnedCommandIds ?? record.pins),
    hiddenCommandIds: normalizeIdList(record.hiddenCommandIds ?? record.hidden),
    aliasesById: normalizeAliases(record.aliasesById ?? record.aliases),
    hotkeysByCommandId: normalizeHotkeys(record.hotkeysByCommandId ?? record.hotkeys),
  };
}

export function readCommandPreferences(storageOverride?: StorageLike): CommandPreferencesState {
  const storage = getStorage(storageOverride);
  if (!storage) {
    return createDefaultCommandPreferencesState();
  }

  try {
    const raw = storage.getItem(COMMAND_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return createDefaultCommandPreferencesState();
    }

    return migrateCommandPreferences(JSON.parse(raw));
  } catch {
    return createDefaultCommandPreferencesState();
  }
}

export function writeCommandPreferences(
  state: CommandPreferencesState,
  storageOverride?: StorageLike,
): void {
  const storage = getStorage(storageOverride);
  if (!storage) {
    return;
  }

  storage.setItem(COMMAND_PREFERENCES_STORAGE_KEY, JSON.stringify(state));
}

export function recordCommandUsage(
  state: CommandPreferencesState,
  commandId: string,
  nowIso: string = new Date().toISOString(),
): CommandPreferencesState {
  if (!isNonEmptyString(commandId)) {
    return state;
  }

  const id = commandId.trim();
  const current = state.usageById[id] ?? { count: 0, lastUsedAt: null };
  return {
    ...state,
    usageById: {
      ...state.usageById,
      [id]: {
        count: current.count + 1,
        lastUsedAt: nowIso,
      },
    },
  };
}

export function setCommandFavorite(
  state: CommandPreferencesState,
  commandId: string,
  isFavorite: boolean,
): CommandPreferencesState {
  if (!isNonEmptyString(commandId)) {
    return state;
  }

  const id = commandId.trim();
  const next = new Set(state.favoriteCommandIds);
  if (isFavorite) {
    next.add(id);
  } else {
    next.delete(id);
  }

  return {
    ...state,
    favoriteCommandIds: [...next],
  };
}

export function setCommandPinned(
  state: CommandPreferencesState,
  commandId: string,
  isPinned: boolean,
): CommandPreferencesState {
  if (!isNonEmptyString(commandId)) {
    return state;
  }

  const id = commandId.trim();
  if (isPinned) {
    return {
      ...state,
      pinnedCommandIds: [id, ...state.pinnedCommandIds.filter((entry) => entry !== id)],
    };
  }

  return {
    ...state,
    pinnedCommandIds: state.pinnedCommandIds.filter((entry) => entry !== id),
  };
}

export function replacePinnedCommandIds(
  state: CommandPreferencesState,
  pinnedCommandIds: readonly string[],
): CommandPreferencesState {
  return {
    ...state,
    pinnedCommandIds: normalizeIdList(pinnedCommandIds),
  };
}

export function setCommandHidden(
  state: CommandPreferencesState,
  commandId: string,
  isHidden: boolean,
): CommandPreferencesState {
  if (!isNonEmptyString(commandId)) {
    return state;
  }

  const id = commandId.trim();
  const next = new Set(state.hiddenCommandIds);
  if (isHidden) {
    next.add(id);
  } else {
    next.delete(id);
  }

  return {
    ...state,
    hiddenCommandIds: [...next],
  };
}

export function setCommandAliases(
  state: CommandPreferencesState,
  commandId: string,
  aliases: readonly string[],
): CommandPreferencesState {
  if (!isNonEmptyString(commandId)) {
    return state;
  }

  const id = commandId.trim();
  const cleaned = normalizeIdList(aliases);
  return {
    ...state,
    aliasesById: {
      ...state.aliasesById,
      [id]: cleaned,
    },
  };
}

export function setCommandHotkey(
  state: CommandPreferencesState,
  commandId: string,
  hotkey?: string,
): CommandPreferencesState {
  if (!isNonEmptyString(commandId)) {
    return state;
  }

  const id = commandId.trim();
  const next = { ...state.hotkeysByCommandId };
  if (isNonEmptyString(hotkey)) {
    next[id] = hotkey.trim();
  } else {
    delete next[id];
  }

  return {
    ...state,
    hotkeysByCommandId: next,
  };
}

export function toRankingSignals(
  state: CommandPreferencesState,
): CommandRankingSignals {
  const favorites = new Set<string>([
    ...state.favoriteCommandIds,
    ...state.pinnedCommandIds,
  ]);
  const usageCountById = new Map<string, number>();
  for (const [commandId, usage] of Object.entries(state.usageById)) {
    usageCountById.set(commandId, usage.count);
  }

  const aliasesById = new Map<string, readonly string[]>(
    Object.entries(state.aliasesById),
  );

  return {
    favorites,
    usageCountById,
    aliasesById,
  };
}

export function toHiddenCommandIdSet(
  state: CommandPreferencesState,
): ReadonlySet<string> {
  return new Set(state.hiddenCommandIds);
}
