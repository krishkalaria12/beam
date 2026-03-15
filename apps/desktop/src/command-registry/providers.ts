import type {
  CommandContext,
  CommandDescriptor,
  CommandProvider,
  CommandProviderError,
  CommandProviderTelemetry,
  CommandProviderResolution,
} from "@/command-registry/types";
import debounce from "@/lib/debounce";
import { validateCommandDescriptors } from "@/command-registry/validation";

export interface CommandProviderOrchestrator {
  resolve(context: CommandContext): Promise<CommandProviderResolution>;
  resolveIncremental(
    context: CommandContext,
    onProgress?: (result: CommandProviderResolution) => void,
  ): Promise<CommandProviderResolution>;
  cancel(): void;
  setProviders(providers: readonly CommandProvider[]): void;
}

export interface CommandProviderOrchestratorOptions {
  providers?: readonly CommandProvider[];
  debounceMs?: number;
}

function toProviderError(providerId: string, message: string): CommandProviderError {
  return {
    providerId,
    message,
  };
}

function toEmptyResolution(): CommandProviderResolution {
  return {
    commands: [],
    errors: [],
    telemetry: [],
  };
}

function nowMs(): number {
  if (
    typeof globalThis.performance !== "undefined" &&
    typeof globalThis.performance.now === "function"
  ) {
    return globalThis.performance.now();
  }

  return Date.now();
}

function shouldRunProvider(provider: CommandProvider, context: CommandContext): boolean {
  if (!provider.scope || provider.scope.length === 0) {
    return true;
  }

  return provider.scope.includes(context.mode);
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  if (error instanceof Error) {
    return error.name === "AbortError";
  }

  return false;
}

interface ProviderResolutionOutcome {
  commands: CommandDescriptor[];
  errors: CommandProviderError[];
  telemetry: CommandProviderTelemetry;
}

function createTelemetry(params: {
  providerId: string;
  status: CommandProviderTelemetry["status"];
  startedAt: number;
  commandCount: number;
  errorCount: number;
}): CommandProviderTelemetry {
  return {
    providerId: params.providerId,
    status: params.status,
    durationMs: Math.max(0, nowMs() - params.startedAt),
    commandCount: params.commandCount,
    errorCount: params.errorCount,
  };
}

async function resolveProvider(
  provider: CommandProvider,
  context: CommandContext,
  signal: AbortSignal,
): Promise<ProviderResolutionOutcome> {
  const startedAt = nowMs();
  if (!shouldRunProvider(provider, context)) {
    return {
      commands: [],
      errors: [],
      telemetry: createTelemetry({
        providerId: provider.id,
        status: "skipped",
        startedAt,
        commandCount: 0,
        errorCount: 0,
      }),
    };
  }

  try {
    const provided = await provider.provide({ context, signal });
    if (signal.aborted) {
      return {
        commands: [],
        errors: [],
        telemetry: createTelemetry({
          providerId: provider.id,
          status: "aborted",
          startedAt,
          commandCount: 0,
          errorCount: 0,
        }),
      };
    }

    const descriptors = [...provided] as CommandDescriptor[];
    const validationErrors = validateCommandDescriptors(descriptors);

    if (validationErrors.length > 0) {
      const errors = validationErrors.map((entry) => toProviderError(provider.id, entry.message));
      return {
        commands: [],
        errors,
        telemetry: createTelemetry({
          providerId: provider.id,
          status: "error",
          startedAt,
          commandCount: 0,
          errorCount: errors.length,
        }),
      };
    }

    return {
      commands: descriptors,
      errors: [],
      telemetry: createTelemetry({
        providerId: provider.id,
        status: "success",
        startedAt,
        commandCount: descriptors.length,
        errorCount: 0,
      }),
    };
  } catch (error) {
    if (isAbortError(error)) {
      return {
        commands: [],
        errors: [],
        telemetry: createTelemetry({
          providerId: provider.id,
          status: "aborted",
          startedAt,
          commandCount: 0,
          errorCount: 0,
        }),
      };
    }

    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Provider failed to resolve commands.";

    const errors = [toProviderError(provider.id, message)];
    return {
      commands: [],
      errors,
      telemetry: createTelemetry({
        providerId: provider.id,
        status: "error",
        startedAt,
        commandCount: 0,
        errorCount: errors.length,
      }),
    };
  }
}

export function createCommandProviderOrchestrator(
  options: CommandProviderOrchestratorOptions = {},
): CommandProviderOrchestrator {
  let providers = [...(options.providers ?? [])];
  const debounceMs = Math.max(0, options.debounceMs ?? 80);
  let currentController: AbortController | null = null;
  let runId = 0;
  let pendingResolve: ((result: CommandProviderResolution) => void) | null = null;

  const resolvePendingIfCurrent = (
    resolvePromise: (result: CommandProviderResolution) => void,
    result: CommandProviderResolution,
  ) => {
    if (pendingResolve !== resolvePromise) {
      return;
    }

    pendingResolve(result);
    pendingResolve = null;
  };

  const runResolution = async (
    context: CommandContext,
    targetRunId: number,
    resolvePromise: (result: CommandProviderResolution) => void,
    onProgress?: (result: CommandProviderResolution) => void,
  ) => {
    if (runId !== targetRunId) {
      resolvePendingIfCurrent(resolvePromise, toEmptyResolution());
      return;
    }

    const controller = new AbortController();
    currentController = controller;
    const aggregatedCommands: CommandDescriptor[] = [];
    const aggregatedErrors: CommandProviderError[] = [];
    const aggregatedTelemetry: CommandProviderTelemetry[] = [];

    const emitProgress = () => {
      if (!onProgress) {
        return;
      }

      onProgress({
        commands: [...aggregatedCommands],
        errors: [...aggregatedErrors],
        telemetry: [...aggregatedTelemetry],
      });
    };

    await Promise.all(
      providers.map((provider) =>
        resolveProvider(provider, context, controller.signal).then((result) => {
          if (runId !== targetRunId || controller.signal.aborted) {
            return;
          }

          aggregatedCommands.push(...result.commands);
          aggregatedErrors.push(...result.errors);
          aggregatedTelemetry.push(result.telemetry);
          emitProgress();
        }),
      ),
    );

    if (currentController === controller) {
      currentController = null;
    }

    if (runId !== targetRunId || controller.signal.aborted) {
      resolvePendingIfCurrent(resolvePromise, toEmptyResolution());
      return;
    }

    resolvePendingIfCurrent(resolvePromise, {
      commands: aggregatedCommands,
      errors: aggregatedErrors,
      telemetry: aggregatedTelemetry,
    });
  };

  const scheduleResolution = debounce(
    (
      context: CommandContext,
      targetRunId: number,
      resolvePromise: (result: CommandProviderResolution) => void,
      onProgress?: (result: CommandProviderResolution) => void,
    ) => {
      void runResolution(context, targetRunId, resolvePromise, onProgress);
    },
    debounceMs,
  );

  const cancel = () => {
    runId += 1;
    scheduleResolution.clear();

    if (currentController) {
      currentController.abort();
      currentController = null;
    }

    if (pendingResolve) {
      pendingResolve(toEmptyResolution());
      pendingResolve = null;
    }
  };

  const setProviders = (nextProviders: readonly CommandProvider[]) => {
    providers = [...nextProviders];
  };

  const resolveIncremental = (
    context: CommandContext,
    onProgress?: (result: CommandProviderResolution) => void,
  ): Promise<CommandProviderResolution> =>
    new Promise((resolvePromise) => {
      const targetRunId = runId + 1;
      cancel();
      runId = targetRunId;
      pendingResolve = resolvePromise;
      scheduleResolution(context, targetRunId, resolvePromise, onProgress);
    });

  const resolve = (context: CommandContext): Promise<CommandProviderResolution> =>
    resolveIncremental(context);

  return {
    resolve,
    resolveIncremental,
    cancel,
    setProviders,
  };
}
