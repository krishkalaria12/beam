export type HyprWhsprRecordState = "idle" | "recording" | "unknown";

function normalizeStatusToken(value: string): string {
  return value.trim().toLowerCase();
}

export function parseHyprWhsprRecordState(output: string | null | undefined): HyprWhsprRecordState {
  const normalizedOutput = String(output ?? "").trim();
  if (!normalizedOutput) {
    return "unknown";
  }

  const statusMatch = normalizedOutput.match(/status:\s*([a-z-]+)/i);
  const statusToken = normalizeStatusToken(statusMatch?.[1] ?? normalizedOutput);

  if (statusToken.includes("recording") || statusToken.includes("active")) {
    return "recording";
  }

  if (
    statusToken.includes("idle") ||
    statusToken.includes("stopped") ||
    statusToken.includes("inactive")
  ) {
    return "idle";
  }

  return "unknown";
}
