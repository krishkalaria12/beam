import type {
  CommandContext,
  CommandDescriptor,
  CommandProvider,
  CommandProviderError,
  CommandProviderResolution,
} from "@/command-registry/types";
import debounce from "@/lib/debounce";
import { validateCommandDescriptors } from "@/command-registry/validation";

export interface CommandProviderOrchestrator {
  resolve(context: CommandContext): Promise<CommandProviderResolution>;
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

async function resolveProvider(
  provider: CommandProvider,
  context: CommandContext,
  signal: AbortSignal,
): Promise<CommandProviderResolution> {
  if (!shouldRunProvider(provider, context)) {
    return { commands: [], errors: [] };
  }

  try {
    const provided = await provider.provide({ context, signal });
    if (signal.aborted) {
      return { commands: [], errors: [] };
    }

    const descriptors = [...provided] as CommandDescriptor[];
    const validationErrors = validateCommandDescriptors(descriptors);

    if (validationErrors.length > 0) {
      return {
        commands: [],
        errors: validationErrors.map((entry) =>
          toProviderError(provider.id, entry.message),
        ),
      };
    }

    return {
      commands: descriptors,
      errors: [],
    };
  } catch (error) {
    if (isAbortError(error)) {
      return { commands: [], errors: [] };
    }

    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Provider failed to resolve commands.";

    return {
      commands: [],
      errors: [toProviderError(provider.id, message)],
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
  ) => {
    if (runId !== targetRunId) {
      resolvePendingIfCurrent(resolvePromise, { commands: [], errors: [] });
      return;
    }

    const controller = new AbortController();
    currentController = controller;

    const results = await Promise.all(
      providers.map((provider) =>
        resolveProvider(provider, context, controller.signal),
      ),
    );

    if (currentController === controller) {
      currentController = null;
    }

    if (runId !== targetRunId || controller.signal.aborted) {
      resolvePendingIfCurrent(resolvePromise, { commands: [], errors: [] });
      return;
    }

    const commands = results.flatMap((result) => result.commands);
    const errors = results.flatMap((result) => result.errors);
    resolvePendingIfCurrent(resolvePromise, { commands, errors });
  };

  const scheduleResolution = debounce(
    (
      context: CommandContext,
      targetRunId: number,
      resolvePromise: (result: CommandProviderResolution) => void,
    ) => {
      void runResolution(context, targetRunId, resolvePromise);
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
      pendingResolve({ commands: [], errors: [] });
      pendingResolve = null;
    }
  };

  const setProviders = (nextProviders: readonly CommandProvider[]) => {
    providers = [...nextProviders];
  };

  const resolve = (context: CommandContext): Promise<CommandProviderResolution> =>
    new Promise((resolvePromise) => {
      const targetRunId = runId + 1;
      cancel();
      runId = targetRunId;
      pendingResolve = resolvePromise;
      scheduleResolution(context, targetRunId, resolvePromise);
    });

  return {
    resolve,
    cancel,
    setProviders,
  };
}
