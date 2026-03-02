import type { BuildCommandContextInput, CommandContext } from "@/command-registry/types";
import { parseTriggerInput } from "@/command-registry/trigger-registry";

function normalizeRawQuery(search: string): string {
  return search.trim();
}

export function buildCommandContext(input: BuildCommandContextInput): CommandContext {
  const rawQuery = normalizeRawQuery(input.search);
  const fallbackMode = input.isCompressed ? "compressed" : "normal";
  const triggerInput = parseTriggerInput(rawQuery, fallbackMode);

  if (triggerInput) {
    return {
      rawQuery,
      query: triggerInput.query,
      quicklinkKeyword: triggerInput.quicklinkKeyword,
      triggeredCommandId: triggerInput.triggeredCommandId,
      mode: triggerInput.mode,
      activePanel: input.activePanel,
      isDesktopRuntime: input.isDesktopRuntime,
    };
  }

  return {
    rawQuery,
    query: rawQuery,
    quicklinkKeyword: "",
    triggeredCommandId: null,
    mode: fallbackMode,
    activePanel: input.activePanel,
    isDesktopRuntime: input.isDesktopRuntime,
  };
}
