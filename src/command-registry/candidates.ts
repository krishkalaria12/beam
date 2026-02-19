import type { StaticCommandRegistry } from "@/command-registry/static-registry";
import { resolveStaticCommandCandidates } from "@/command-registry/static-candidates";
import type {
  CommandContext,
  CommandDescriptor,
  CommandProviderError,
} from "@/command-registry/types";
import type { CommandProviderOrchestrator } from "@/command-registry/providers";

export interface CommandCandidatesResult {
  staticCommands: CommandDescriptor[];
  dynamicCommands: CommandDescriptor[];
  commands: CommandDescriptor[];
  providerErrors: CommandProviderError[];
}

export async function resolveCommandCandidates(options: {
  context: CommandContext;
  registry: StaticCommandRegistry;
  providers?: CommandProviderOrchestrator;
}): Promise<CommandCandidatesResult> {
  const staticCommands = resolveStaticCommandCandidates(
    options.registry,
    options.context,
  );

  if (!options.providers) {
    return {
      staticCommands,
      dynamicCommands: [],
      commands: staticCommands,
      providerErrors: [],
    };
  }

  const dynamicResolution = await options.providers.resolve(options.context);
  const dynamicCommands = dynamicResolution.commands.filter((command) =>
    command.scope.includes("all") || command.scope.includes(options.context.mode),
  );

  return {
    staticCommands,
    dynamicCommands,
    commands: [...staticCommands, ...dynamicCommands],
    providerErrors: dynamicResolution.errors,
  };
}

