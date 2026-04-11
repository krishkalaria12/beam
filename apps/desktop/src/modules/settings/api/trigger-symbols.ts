import { invoke } from "@tauri-apps/api/core";

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

export const TRIGGER_SYMBOLS_CHANGE_EVENT = "beam-trigger-symbols-change";

const DEFAULT_TRIGGER_SYMBOLS: TriggerSymbols = Object.freeze({
  quicklink: "!",
  system: "$",
  script: ">",
  shell: "~",
  customBindings: [],
});

let cachedSymbols: TriggerSymbols = {
  ...DEFAULT_TRIGGER_SYMBOLS,
  customBindings: [],
};

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
  const used = new Set<string>([symbols.quicklink, symbols.system, symbols.script, symbols.shell]);

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

function cloneSymbols(symbols: TriggerSymbols): TriggerSymbols {
  return {
    ...symbols,
    customBindings: symbols.customBindings.map((binding) => ({
      symbol: binding.symbol,
      commandId: binding.commandId,
    })),
  };
}

function updateCachedSymbols(symbols: TriggerSymbols, dispatchChange = true): TriggerSymbols {
  cachedSymbols = cloneSymbols(symbols);
  if (dispatchChange) {
    window.dispatchEvent(new Event(TRIGGER_SYMBOLS_CHANGE_EVENT));
  }
  return cloneSymbols(cachedSymbols);
}

async function writeTriggerSymbolsToBackend(symbols: TriggerSymbols): Promise<TriggerSymbols> {
  const result = await invoke<unknown>("set_trigger_symbols", { symbols });
  return normalizeSymbols(result);
}

export async function initializeTriggerSymbols(): Promise<TriggerSymbols> {
  const result = await invoke<unknown>("get_trigger_symbols");
  return updateCachedSymbols(normalizeSymbols(result), false);
}

export function getTriggerSymbols(): TriggerSymbols {
  return cloneSymbols(cachedSymbols);
}

export async function setTriggerSymbol(
  target: TriggerSymbolTarget,
  symbol: string,
): Promise<TriggerSymbols> {
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

  const saved = await writeTriggerSymbolsToBackend(next);
  return updateCachedSymbols(saved);
}

export async function setCustomTriggerBindings(
  bindings: CustomTriggerBinding[],
): Promise<TriggerSymbols> {
  const normalizedBindings = normalizeCustomBindings(bindings);
  const current = getTriggerSymbols();
  const next: TriggerSymbols = {
    ...current,
    customBindings: normalizedBindings,
  };

  if (!hasUniqueSymbols(next)) {
    throw new Error("Each trigger symbol must be unique.");
  }

  const saved = await writeTriggerSymbolsToBackend(next);
  return updateCachedSymbols(saved);
}

export async function resetTriggerSymbols(): Promise<TriggerSymbols> {
  const saved = await writeTriggerSymbolsToBackend({
    ...DEFAULT_TRIGGER_SYMBOLS,
    customBindings: [],
  });
  return updateCachedSymbols(saved);
}
