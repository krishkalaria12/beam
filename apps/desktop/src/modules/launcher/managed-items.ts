import { useMemo } from "react";
import { create } from "zustand";

export type LauncherManagedItemKind =
  | "application"
  | "calculator-history"
  | "clipboard"
  | "emoji"
  | "file"
  | "quicklink"
  | "script";

interface ManagedItemUsageEntry {
  count: number;
  lastUsedAt: string | null;
}

export interface LauncherManagedItem {
  kind: LauncherManagedItemKind;
  id: string;
  title: string;
  subtitle?: string;
  keywords?: readonly string[];
  reservedAliases?: readonly string[];
  commandTarget?: {
    commandId: string;
    title?: string;
  };
  copyIdLabel?: string;
  copyIdValue?: string;
  supportsFavorite?: boolean;
  supportsAlias?: boolean;
  supportsResetRanking?: boolean;
  onOpenPreferences?: (() => void) | null;
}

type ManagedItemIdentity = Pick<LauncherManagedItem, "kind" | "id">;

interface ManagedItemPreferencesState {
  version: 1;
  usageById: Record<string, ManagedItemUsageEntry>;
  favoriteIds: string[];
  aliasesById: Record<string, string[]>;
}

interface ManagedItemPreferencesStore extends ManagedItemPreferencesState {
  setFavorite: (item: LauncherManagedItem | string, favorite: boolean) => void;
  setAliases: (item: LauncherManagedItem | string, aliases: readonly string[]) => void;
  recordUsage: (item: LauncherManagedItem | string, nowIso?: string) => void;
  resetUsage: (item: LauncherManagedItem | string) => void;
  renameItem: (previousItem: ManagedItemIdentity, nextItem: ManagedItemIdentity) => void;
  removeItem: (item: ManagedItemIdentity) => void;
}

const MANAGED_ITEM_PREFERENCES_STORAGE_KEY = "beam-managed-item-preferences";
const MANAGED_ITEM_PREFERENCES_VERSION = 1 as const;
const EMPTY_ALIASES: readonly string[] = [];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const next = new Set<string>();
  for (const item of value) {
    if (!isNonEmptyString(item)) {
      continue;
    }

    next.add(item.trim());
  }

  return [...next];
}

function normalizeAliases(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const aliasesById: Record<string, string[]> = {};
  for (const [id, aliases] of Object.entries(value as Record<string, unknown>)) {
    if (!isNonEmptyString(id) || !Array.isArray(aliases)) {
      continue;
    }

    aliasesById[id.trim()] = normalizeIdList(aliases);
  }

  return aliasesById;
}

function normalizeUsage(value: unknown): Record<string, ManagedItemUsageEntry> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const usageById: Record<string, ManagedItemUsageEntry> = {};
  for (const [id, rawEntry] of Object.entries(value as Record<string, unknown>)) {
    if (!isNonEmptyString(id) || !rawEntry || typeof rawEntry !== "object") {
      continue;
    }

    const entry = rawEntry as Record<string, unknown>;
    const count = entry.count;
    const lastUsedAt = entry.lastUsedAt;
    usageById[id.trim()] = {
      count:
        typeof count === "number" && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0,
      lastUsedAt:
        typeof lastUsedAt === "string" && lastUsedAt.trim().length > 0 ? lastUsedAt : null,
    };
  }

  return usageById;
}

function createDefaultManagedItemPreferencesState(): ManagedItemPreferencesState {
  return {
    version: MANAGED_ITEM_PREFERENCES_VERSION,
    usageById: {},
    favoriteIds: [],
    aliasesById: {},
  };
}

function getStorage(): Storage | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

function readManagedItemPreferences(): ManagedItemPreferencesState {
  const storage = getStorage();
  if (!storage) {
    return createDefaultManagedItemPreferencesState();
  }

  try {
    const raw = storage.getItem(MANAGED_ITEM_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return createDefaultManagedItemPreferencesState();
    }

    const record = JSON.parse(raw) as Record<string, unknown>;
    return {
      version: MANAGED_ITEM_PREFERENCES_VERSION,
      usageById: normalizeUsage(record.usageById),
      favoriteIds: normalizeIdList(record.favoriteIds),
      aliasesById: normalizeAliases(record.aliasesById),
    };
  } catch {
    return createDefaultManagedItemPreferencesState();
  }
}

function writeManagedItemPreferences(state: ManagedItemPreferencesState) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(MANAGED_ITEM_PREFERENCES_STORAGE_KEY, JSON.stringify(state));
}

function resolveManagedItemId(item: LauncherManagedItem | string): string {
  if (typeof item === "string") {
    return item.trim();
  }

  return getManagedItemPreferenceId(item);
}

function normalizeAliasValue(value: string): string {
  return value.trim().toLowerCase();
}

function setManagedItemFavorite(
  state: ManagedItemPreferencesState,
  item: LauncherManagedItem | string,
  favorite: boolean,
): ManagedItemPreferencesState {
  const id = resolveManagedItemId(item);
  if (!id) {
    return state;
  }

  const favoriteIds = new Set(state.favoriteIds);
  if (favorite) {
    favoriteIds.add(id);
  } else {
    favoriteIds.delete(id);
  }

  return {
    ...state,
    favoriteIds: [...favoriteIds],
  };
}

function setManagedItemAliases(
  state: ManagedItemPreferencesState,
  item: LauncherManagedItem | string,
  aliases: readonly string[],
): ManagedItemPreferencesState {
  const id = resolveManagedItemId(item);
  if (!id) {
    return state;
  }

  return {
    ...state,
    aliasesById: {
      ...state.aliasesById,
      [id]: normalizeIdList(aliases),
    },
  };
}

function recordManagedItemUsage(
  state: ManagedItemPreferencesState,
  item: LauncherManagedItem | string,
  nowIso: string,
): ManagedItemPreferencesState {
  const id = resolveManagedItemId(item);
  if (!id) {
    return state;
  }

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

function resetManagedItemUsage(
  state: ManagedItemPreferencesState,
  item: LauncherManagedItem | string,
): ManagedItemPreferencesState {
  const id = resolveManagedItemId(item);
  if (!id || !state.usageById[id]) {
    return state;
  }

  const usageById = { ...state.usageById };
  delete usageById[id];

  return {
    ...state,
    usageById,
  };
}

function renameManagedItemPreferences(
  state: ManagedItemPreferencesState,
  previousItem: ManagedItemIdentity,
  nextItem: ManagedItemIdentity,
): ManagedItemPreferencesState {
  const previousId = getManagedItemPreferenceId(previousItem);
  const nextId = getManagedItemPreferenceId(nextItem);
  if (!previousId || !nextId || previousId === nextId) {
    return state;
  }

  const favoriteIds = state.favoriteIds.map((id) => (id === previousId ? nextId : id));
  const aliasesById = { ...state.aliasesById };
  const usageById = { ...state.usageById };

  if (aliasesById[previousId]) {
    aliasesById[nextId] = aliasesById[previousId];
    delete aliasesById[previousId];
  }

  if (usageById[previousId]) {
    usageById[nextId] = usageById[previousId];
    delete usageById[previousId];
  }

  return {
    ...state,
    favoriteIds,
    aliasesById,
    usageById,
  };
}

function removeManagedItemPreferences(
  state: ManagedItemPreferencesState,
  item: ManagedItemIdentity,
): ManagedItemPreferencesState {
  const id = getManagedItemPreferenceId(item);
  if (!id) {
    return state;
  }

  const favoriteIds = state.favoriteIds.filter((entry) => entry !== id);
  const aliasesById = { ...state.aliasesById };
  const usageById = { ...state.usageById };
  delete aliasesById[id];
  delete usageById[id];

  return {
    ...state,
    favoriteIds,
    aliasesById,
    usageById,
  };
}

function persistManagedItemPreferences(nextState: ManagedItemPreferencesState) {
  writeManagedItemPreferences(nextState);
  return nextState;
}

export function getManagedItemPreferenceId(item: ManagedItemIdentity): string {
  const normalizedId = item.id.trim();
  return normalizedId ? `${item.kind}:${normalizedId}` : "";
}

export function getManagedItemAliases(
  aliasesById: Record<string, string[]>,
  item: ManagedItemIdentity,
): readonly string[] {
  const itemId = getManagedItemPreferenceId(item);
  if (!itemId) {
    return EMPTY_ALIASES;
  }

  return aliasesById[itemId] ?? EMPTY_ALIASES;
}

export function findManagedItemAliasConflictId(
  aliasesById: Record<string, string[]>,
  item: ManagedItemIdentity,
  alias: string,
): string | null {
  return findManagedItemAliasOwnerId(aliasesById, alias, getManagedItemPreferenceId(item));
}

export function findManagedItemAliasOwnerId(
  aliasesById: Record<string, string[]>,
  alias: string,
  excludedId?: string,
): string | null {
  const requestedAlias = normalizeAliasValue(alias);
  if (!requestedAlias) {
    return null;
  }

  for (const [existingId, aliases] of Object.entries(aliasesById)) {
    if (existingId === excludedId) {
      continue;
    }

    for (const existingAlias of aliases) {
      if (normalizeAliasValue(existingAlias) === requestedAlias) {
        return existingId;
      }
    }
  }

  return null;
}

export function isManagedItemAliasReserved(
  item: Pick<LauncherManagedItem, "reservedAliases">,
  alias: string,
): boolean {
  const requestedAlias = normalizeAliasValue(alias);
  if (!requestedAlias) {
    return false;
  }

  return (item.reservedAliases ?? EMPTY_ALIASES).some(
    (reservedAlias) => normalizeAliasValue(reservedAlias) === requestedAlias,
  );
}

function scoreSearchText(
  text: string,
  query: string,
  exact: number,
  prefix: number,
  partial: number,
) {
  const normalizedText = text.trim().toLowerCase();
  if (!normalizedText) {
    return 0;
  }

  if (normalizedText === query) {
    return exact;
  }

  if (normalizedText.startsWith(query)) {
    return prefix;
  }

  return normalizedText.includes(query) ? partial : 0;
}

export function rankManagedItems<T>(options: {
  items: readonly T[];
  query: string;
  favorites: readonly string[];
  aliasesById: Record<string, string[]>;
  usageById: Record<string, ManagedItemUsageEntry>;
  getManagedItem: (item: T) => LauncherManagedItem;
  getSearchableText?: (item: T) => string;
  compareFallback?: (left: T, right: T) => number;
}): T[] {
  const normalizedQuery = options.query.trim().toLowerCase();
  const favoriteSet = new Set(options.favorites);

  const ranked = options.items
    .map((item, index) => {
      const managedItem = options.getManagedItem(item);
      const id = getManagedItemPreferenceId(managedItem);
      const aliases = options.aliasesById[id] ?? EMPTY_ALIASES;
      const usage = options.usageById[id]?.count ?? 0;
      const searchableText = options.getSearchableText?.(item) ?? managedItem.subtitle ?? "";

      let score = 0;
      if (normalizedQuery) {
        score += scoreSearchText(managedItem.title, normalizedQuery, 700, 460, 220);
        score += scoreSearchText(searchableText, normalizedQuery, 220, 160, 90);

        for (const keyword of managedItem.keywords ?? EMPTY_ALIASES) {
          score += scoreSearchText(keyword, normalizedQuery, 260, 200, 120);
        }

        for (const alias of aliases) {
          score += scoreSearchText(alias, normalizedQuery, 920, 640, 340);
        }

        if (score === 0) {
          return null;
        }
      }

      if (favoriteSet.has(id)) {
        score += 1_200;
      }

      score += Math.min(usage, 25) * 24;

      return {
        item,
        index,
        score,
        title: managedItem.title.toLowerCase(),
      };
    })
    .filter(
      (entry): entry is { item: T; index: number; score: number; title: string } => entry !== null,
    );

  ranked.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }

    const fallback = options.compareFallback?.(left.item, right.item) ?? 0;
    if (fallback !== 0) {
      return fallback;
    }

    if (left.title !== right.title) {
      return left.title.localeCompare(right.title);
    }

    return left.index - right.index;
  });

  return ranked.map((entry) => entry.item);
}

interface ManagedItemRankingOptions<T> {
  items: readonly T[];
  query: string;
  getManagedItem: (item: T) => LauncherManagedItem;
  getSearchableText?: (item: T) => string;
  compareFallback?: (left: T, right: T) => number;
}

interface ManagedItemGroupedRankingOptions<T> {
  groups: readonly (readonly T[])[];
  query: string;
  getManagedItem: (item: T) => LauncherManagedItem;
  getSearchableText?: (item: T) => string;
  compareFallback?: (left: T, right: T) => number;
}

function rankManagedItemGroups<T>(options: {
  groups: readonly (readonly T[])[];
  query: string;
  favorites: readonly string[];
  aliasesById: Record<string, string[]>;
  usageById: Record<string, ManagedItemUsageEntry>;
  getManagedItem: (item: T) => LauncherManagedItem;
  getSearchableText?: (item: T) => string;
  compareFallback?: (left: T, right: T) => number;
}): T[] {
  return options.groups.flatMap((group) =>
    rankManagedItems({
      items: group,
      query: options.query,
      favorites: options.favorites,
      aliasesById: options.aliasesById,
      usageById: options.usageById,
      getManagedItem: options.getManagedItem,
      getSearchableText: options.getSearchableText,
      compareFallback: options.compareFallback,
    }),
  );
}

export function useManagedItemRankedList<T>(options: ManagedItemRankingOptions<T>): T[] {
  const favoriteIds = useManagedItemPreferencesStore((state) => state.favoriteIds);
  const aliasesById = useManagedItemPreferencesStore((state) => state.aliasesById);
  const usageById = useManagedItemPreferencesStore((state) => state.usageById);
  const { items, query, getManagedItem, getSearchableText, compareFallback } = options;

  return useMemo(
    () =>
      rankManagedItems({
        items,
        query,
        favorites: favoriteIds,
        aliasesById,
        usageById,
        getManagedItem,
        getSearchableText,
        compareFallback,
      }),
    [
      aliasesById,
      compareFallback,
      favoriteIds,
      getManagedItem,
      getSearchableText,
      items,
      query,
      usageById,
    ],
  );
}

export function useManagedItemRankedGroups<T>(options: ManagedItemGroupedRankingOptions<T>): T[] {
  const favoriteIds = useManagedItemPreferencesStore((state) => state.favoriteIds);
  const aliasesById = useManagedItemPreferencesStore((state) => state.aliasesById);
  const usageById = useManagedItemPreferencesStore((state) => state.usageById);
  const { groups, query, getManagedItem, getSearchableText, compareFallback } = options;

  return useMemo(
    () =>
      rankManagedItemGroups({
        groups,
        query,
        favorites: favoriteIds,
        aliasesById,
        usageById,
        getManagedItem,
        getSearchableText,
        compareFallback,
      }),
    [
      aliasesById,
      compareFallback,
      favoriteIds,
      getManagedItem,
      getSearchableText,
      groups,
      query,
      usageById,
    ],
  );
}

const initialState = readManagedItemPreferences();

export const useManagedItemPreferencesStore = create<ManagedItemPreferencesStore>((set) => ({
  ...initialState,
  setFavorite: (item, favorite) => {
    set((state) => persistManagedItemPreferences(setManagedItemFavorite(state, item, favorite)));
  },
  setAliases: (item, aliases) => {
    set((state) => persistManagedItemPreferences(setManagedItemAliases(state, item, aliases)));
  },
  recordUsage: (item, nowIso = new Date().toISOString()) => {
    set((state) => persistManagedItemPreferences(recordManagedItemUsage(state, item, nowIso)));
  },
  resetUsage: (item) => {
    set((state) => persistManagedItemPreferences(resetManagedItemUsage(state, item)));
  },
  renameItem: (previousItem, nextItem) => {
    set((state) =>
      persistManagedItemPreferences(renameManagedItemPreferences(state, previousItem, nextItem)),
    );
  },
  removeItem: (item) => {
    set((state) => persistManagedItemPreferences(removeManagedItemPreferences(state, item)));
  },
}));
