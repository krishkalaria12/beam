import type {
  BuildCommandContextInput,
  CommandContext,
  CommandMode,
} from "@/command-registry/types";

function normalizeRawQuery(search: string): string {
  return search.trim();
}

function parseQuicklinkInput(rawQuery: string): {
  keyword: string;
  query: string;
} {
  const parts = rawQuery
    .slice(1)
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    keyword: parts[0] ?? "",
    query: parts.slice(1).join(" "),
  };
}

function getMode(rawQuery: string, isCompressed: boolean): CommandMode {
  if (rawQuery.startsWith("$")) {
    return "system-trigger";
  }

  if (rawQuery.startsWith("!")) {
    return "quicklink-trigger";
  }

  return isCompressed ? "compressed" : "normal";
}

export function buildCommandContext(input: BuildCommandContextInput): CommandContext {
  const rawQuery = normalizeRawQuery(input.search);
  const mode = getMode(rawQuery, input.isCompressed);

  if (mode === "system-trigger") {
    return {
      rawQuery,
      query: rawQuery.slice(1).trim(),
      quicklinkKeyword: "",
      mode,
      activePanel: input.activePanel,
      isDesktopRuntime: input.isDesktopRuntime,
    };
  }

  if (mode === "quicklink-trigger") {
    const quicklink = parseQuicklinkInput(rawQuery);
    return {
      rawQuery,
      query: quicklink.query,
      quicklinkKeyword: quicklink.keyword,
      mode,
      activePanel: input.activePanel,
      isDesktopRuntime: input.isDesktopRuntime,
    };
  }

  return {
    rawQuery,
    query: rawQuery,
    quicklinkKeyword: "",
    mode,
    activePanel: input.activePanel,
    isDesktopRuntime: input.isDesktopRuntime,
  };
}

