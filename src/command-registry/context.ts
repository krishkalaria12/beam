import type {
  BuildCommandContextInput,
  CommandContext,
} from "@/command-registry/types";
import { parseTriggerInput } from "@/command-registry/trigger-registry";

function normalizeRawQuery(search: string): string {
  return search.trim();
}

export function buildCommandContext(input: BuildCommandContextInput): CommandContext {
  const rawQuery = normalizeRawQuery(input.search);
  const triggerInput = parseTriggerInput(rawQuery);

  if (triggerInput) {
    return {
      rawQuery,
      query: triggerInput.query,
      quicklinkKeyword: triggerInput.quicklinkKeyword,
      mode: triggerInput.mode,
      activePanel: input.activePanel,
      isDesktopRuntime: input.isDesktopRuntime,
    };
  }

  const mode = input.isCompressed ? "compressed" : "normal";

  return {
    rawQuery,
    query: rawQuery,
    quicklinkKeyword: "",
    mode,
    activePanel: input.activePanel,
    isDesktopRuntime: input.isDesktopRuntime,
  };
}
