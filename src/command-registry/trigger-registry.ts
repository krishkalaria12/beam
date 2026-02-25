import type { CommandDescriptor, CommandMode } from "@/command-registry/types";
import { getTriggerSymbols } from "@/modules/settings/api/trigger-symbols";

export const QUICKLINK_TRIGGER_MODE = "quicklink-trigger" as const;
export const SYSTEM_TRIGGER_MODE = "system-trigger" as const;
export const SCRIPT_TRIGGER_MODE = "script-trigger" as const;

export type TriggerMode =
  | typeof QUICKLINK_TRIGGER_MODE
  | typeof SYSTEM_TRIGGER_MODE
  | typeof SCRIPT_TRIGGER_MODE;

interface TriggerParseResult {
  query: string;
  quicklinkKeyword: string;
}

interface TriggerDefinition {
  mode: TriggerMode;
  symbol: string;
}

interface ParsedTriggerInput extends TriggerParseResult {
  mode: TriggerMode;
}

const QUICKLINK_TRIGGER_ALLOWED_COMMAND_IDS = new Set([
  "file_search.panel.open",
  "speed_test.panel.open",
  "translation.panel.open",
  "search.web.google",
  "search.web.duckduckgo",
]);

function parseQueryTrigger(rawQuery: string, symbol: string): TriggerParseResult {
  return {
    query: rawQuery.slice(symbol.length).trim(),
    quicklinkKeyword: "",
  };
}

function parseQuicklinkTrigger(rawQuery: string, symbol: string): TriggerParseResult {
  const parts = rawQuery
    .slice(symbol.length)
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    quicklinkKeyword: parts[0] ?? "",
    query: parts.slice(1).join(" "),
  };
}

function getTriggerDefinitions(): readonly TriggerDefinition[] {
  const symbols = getTriggerSymbols();
  return [
    {
      mode: QUICKLINK_TRIGGER_MODE,
      symbol: symbols.quicklink,
    },
    {
      mode: SYSTEM_TRIGGER_MODE,
      symbol: symbols.system,
    },
    {
      mode: SCRIPT_TRIGGER_MODE,
      symbol: symbols.script,
    },
  ];
}

export function getTriggerSymbol(mode: CommandMode): string | null {
  const symbols = getTriggerSymbols();
  if (mode === QUICKLINK_TRIGGER_MODE) {
    return symbols.quicklink;
  }

  if (mode === SYSTEM_TRIGGER_MODE) {
    return symbols.system;
  }

  if (mode === SCRIPT_TRIGGER_MODE) {
    return symbols.script;
  }

  return null;
}

export function parseTriggerInput(rawQuery: string): ParsedTriggerInput | null {
  for (const definition of getTriggerDefinitions()) {
    if (!rawQuery.startsWith(definition.symbol)) {
      continue;
    }

    const parsed = definition.mode === QUICKLINK_TRIGGER_MODE
      ? parseQuicklinkTrigger(rawQuery, definition.symbol)
      : parseQueryTrigger(rawQuery, definition.symbol);
    return {
      mode: definition.mode,
      query: parsed.query,
      quicklinkKeyword: parsed.quicklinkKeyword,
    };
  }

  return null;
}

export function matchesTriggerConstraints(
  command: CommandDescriptor,
  mode: CommandMode,
): boolean {
  if (mode === QUICKLINK_TRIGGER_MODE) {
    return (
      command.id.startsWith("quicklinks.") ||
      QUICKLINK_TRIGGER_ALLOWED_COMMAND_IDS.has(command.id)
    );
  }

  if (mode === SYSTEM_TRIGGER_MODE) {
    return command.id.startsWith("system.");
  }

  if (mode === SCRIPT_TRIGGER_MODE) {
    return command.id.startsWith("script_commands.");
  }

  return true;
}
