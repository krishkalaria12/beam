export type TriggerSymbolTarget = "quicklink" | "system" | "script" | "shell";

export interface CustomTriggerBinding {
  symbol: string;
  commandId: string;
}

export interface TriggerSymbols {
  quicklink: string;
  system: string;
  script: string;
  shell: string;
  customBindings: CustomTriggerBinding[];
}

export const TRIGGER_SYMBOLS_STORAGE_KEY = "beam-trigger-symbols";
export const TRIGGER_SYMBOLS_CHANGE_EVENT = "beam-trigger-symbols-change";

export const DEFAULT_TRIGGER_SYMBOLS: TriggerSymbols = Object.freeze({
  quicklink: "!",
  system: "$",
  script: ">",
  shell: "~",
  customBindings: [],
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

function sanitizeCommandId(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }

  return input.trim();
}

function normalizeCustomBindings(input: unknown): CustomTriggerBinding[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const uniqueBySymbol = new Set<string>();
  const normalized: CustomTriggerBinding[] = [];

  for (const entry of input) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const source = entry as Record<string, unknown>;
    const symbol = sanitizeSymbol(source.symbol, "");
    const commandId = sanitizeCommandId(source.commandId);
    if (!isValidSymbol(symbol) || commandId.length === 0) {
      continue;
    }

    if (uniqueBySymbol.has(symbol)) {
      continue;
    }

    uniqueBySymbol.add(symbol);
    normalized.push({ symbol, commandId });
  }

  return normalized;
}

function hasUniqueSymbols(symbols: {
  quicklink: string;
  system: string;
  script: string;
  shell: string;
  customBindings: readonly CustomTriggerBinding[];
}): boolean {
  const used = new Set<string>([
    symbols.quicklink,
    symbols.system,
    symbols.script,
    symbols.shell,
  ]);

  if (used.size !== 4) {
    return false;
  }

  for (const binding of symbols.customBindings) {
    if (used.has(binding.symbol)) {
      return false;
    }
    used.add(binding.symbol);
  }

  return true;
}

function normalizeSymbols(input: unknown): TriggerSymbols {
  const source =
    input && typeof input === "object"
      ? (input as Partial<Record<TriggerSymbolTarget, unknown>> & {
          customBindings?: unknown;
        })
      : {};
  const next: TriggerSymbols = {
    quicklink: sanitizeSymbol(source.quicklink, DEFAULT_TRIGGER_SYMBOLS.quicklink),
    system: sanitizeSymbol(source.system, DEFAULT_TRIGGER_SYMBOLS.system),
    script: sanitizeSymbol(source.script, DEFAULT_TRIGGER_SYMBOLS.script),
    shell: sanitizeSymbol(source.shell, DEFAULT_TRIGGER_SYMBOLS.shell),
    customBindings: normalizeCustomBindings(source.customBindings),
  };

  if (!hasUniqueSymbols(next)) {
    return { ...DEFAULT_TRIGGER_SYMBOLS, customBindings: [] };
  }

  return next;
}

function readSymbolsFromStorage(): TriggerSymbols {
  if (typeof window === "undefined") {
    return { ...DEFAULT_TRIGGER_SYMBOLS, customBindings: [] };
  }

  const raw = window.localStorage.getItem(TRIGGER_SYMBOLS_STORAGE_KEY);
  if (raw === cachedRawValue) {
    return cachedSymbols;
  }

  cachedRawValue = raw;

  if (!raw) {
    cachedSymbols = { ...DEFAULT_TRIGGER_SYMBOLS, customBindings: [] };
    return cachedSymbols;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    cachedSymbols = normalizeSymbols(parsed);
  } catch {
    cachedSymbols = { ...DEFAULT_TRIGGER_SYMBOLS, customBindings: [] };
  }

  return cachedSymbols;
}

function persistSymbols(symbols: TriggerSymbols): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedSymbols: TriggerSymbols = {
    ...symbols,
    customBindings: symbols.customBindings.map((binding) => ({
      symbol: binding.symbol,
      commandId: binding.commandId,
    })),
  };

  const raw = JSON.stringify(normalizedSymbols);
  window.localStorage.setItem(TRIGGER_SYMBOLS_STORAGE_KEY, raw);
  cachedRawValue = raw;
  cachedSymbols = normalizedSymbols;
  window.dispatchEvent(new Event(TRIGGER_SYMBOLS_CHANGE_EVENT));
}

export function getTriggerSymbols(): TriggerSymbols {
  const symbols = readSymbolsFromStorage();
  return {
    ...symbols,
    customBindings: symbols.customBindings.map((binding) => ({
      symbol: binding.symbol,
      commandId: binding.commandId,
    })),
  };
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

export function setCustomTriggerBindings(bindings: CustomTriggerBinding[]): void {
  const normalizedBindings = normalizeCustomBindings(bindings);
  const current = getTriggerSymbols();
  const next: TriggerSymbols = {
    ...current,
    customBindings: normalizedBindings,
  };

  if (!hasUniqueSymbols(next)) {
    throw new Error("Each trigger symbol must be unique.");
  }

  persistSymbols(next);
}

export function resetTriggerSymbols(): void {
  persistSymbols({ ...DEFAULT_TRIGGER_SYMBOLS, customBindings: [] });
}
