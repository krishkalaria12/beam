import type { DispatchResult } from "@/command-registry/dispatcher";
import type {
  CommandMode,
  CommandPanel,
  CommandProviderResolution,
} from "@/command-registry/types";

interface ProviderTelemetryLogContext {
  mode: CommandMode;
  activePanel: CommandPanel;
  query: string;
}

interface DispatchFailureLogContext {
  mode: CommandMode;
  activePanel: CommandPanel;
  query: string;
}

function normalizeQuery(query: string): string {
  return query.trim().slice(0, 120);
}

export function logProviderResolution(
  resolution: CommandProviderResolution,
  context: ProviderTelemetryLogContext,
): void {
  const query = normalizeQuery(context.query);
  const contextLine = `mode=${context.mode} panel=${context.activePanel} query="${query}"`;

  for (const providerError of resolution.errors) {
    console.error(`[provider:${providerError.providerId}] ${providerError.message} ${contextLine}`);
  }
}

export function logDispatchFailure(
  commandId: string,
  result: DispatchResult,
  context: DispatchFailureLogContext,
): void {
  if (result.ok) {
    return;
  }

  const query = normalizeQuery(context.query);
  const contextLine = `mode=${context.mode} panel=${context.activePanel} query="${query}"`;
  const backendLine = result.backend
    ? `backendType=${result.backend.type} backendMessage="${result.backend.technicalMessage}"`
    : "backendType=none";

  console.error(
    `[dispatcher:${result.code}] commandId=${commandId} message="${result.message}" ${backendLine} ${contextLine}`,
  );
}
