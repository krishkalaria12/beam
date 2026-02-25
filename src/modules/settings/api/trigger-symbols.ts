export type TriggerSymbolTarget = "quicklink" | "system" | "script";

export interface TriggerSymbols {
  quicklink: string;
  system: string;
  script: string;
}

export const TRIGGER_SYMBOLS_STORAGE_KEY = "beam-trigger-symbols";
export const TRIGGER_SYMBOLS_CHANGE_EVENT = "beam-trigger-symbols-change";

export const DEFAULT_TRIGGER_SYMBOLS: TriggerSymbols = Object.freeze({
  quicklink: "!",
  system: "$",
  script: ">",
});

let cachedRawValue: string | null = null;
let cachedSymbols: TriggerSymbols = DEFAULT_TRIGGER_SYMBOLS;

function isValidSymbol(input: string): boolean {
  return input.length === 1 && !/\s/.test(input);
}

function sanitizeSymbol(input: unknown, fallback: string): string {
  if (typeof input !== "string") {
    return fallback;
  }

  const trimmed = input.trim();
  return isValidSymbol(trimmed) ? trimmed : fallback;
}

function hasUniqueSymbols(symbols: TriggerSymbols): boolean {
  return new Set(Object.values(symbols)).size === 3;
}

function normalizeSymbols(input: unknown): TriggerSymbols {
  const source = input && typeof input === "object"
    ? input as Partial<Record<TriggerSymbolTarget, unknown>>
    : {};
  const next: TriggerSymbols = {
    quicklink: sanitizeSymbol(source.quicklink, DEFAULT_TRIGGER_SYMBOLS.quicklink),
    system: sanitizeSymbol(source.system, DEFAULT_TRIGGER_SYMBOLS.system),
    script: sanitizeSymbol(source.script, DEFAULT_TRIGGER_SYMBOLS.script),
  };

  return hasUniqueSymbols(next) ? next : { ...DEFAULT_TRIGGER_SYMBOLS };
}

function readSymbolsFromStorage(): TriggerSymbols {
  if (typeof window === "undefined") {
    return { ...DEFAULT_TRIGGER_SYMBOLS };
  }

  const raw = window.localStorage.getItem(TRIGGER_SYMBOLS_STORAGE_KEY);
  if (raw === cachedRawValue) {
    return cachedSymbols;
  }

  cachedRawValue = raw;

  if (!raw) {
    cachedSymbols = { ...DEFAULT_TRIGGER_SYMBOLS };
    return cachedSymbols;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    cachedSymbols = normalizeSymbols(parsed);
  } catch {
    cachedSymbols = { ...DEFAULT_TRIGGER_SYMBOLS };
  }

  return cachedSymbols;
}

function persistSymbols(symbols: TriggerSymbols): void {
  if (typeof window === "undefined") {
    return;
  }

  const raw = JSON.stringify(symbols);
  window.localStorage.setItem(TRIGGER_SYMBOLS_STORAGE_KEY, raw);
  cachedRawValue = raw;
  cachedSymbols = symbols;
  window.dispatchEvent(new Event(TRIGGER_SYMBOLS_CHANGE_EVENT));
}

export function getTriggerSymbols(): TriggerSymbols {
  return readSymbolsFromStorage();
}

export function setTriggerSymbol(target: TriggerSymbolTarget, symbol: string): void {
  const normalizedSymbol = sanitizeSymbol(symbol, "");
  if (!isValidSymbol(normalizedSymbol)) {
    throw new Error("Symbol must be exactly one non-space character.");
  }

  const current = getTriggerSymbols();
  const next = {
    ...current,
    [target]: normalizedSymbol,
  };
  if (!hasUniqueSymbols(next)) {
    throw new Error("This symbol is already used by another trigger.");
  }

  persistSymbols(next);
}

export function resetTriggerSymbols(): void {
  persistSymbols({ ...DEFAULT_TRIGGER_SYMBOLS });
}
