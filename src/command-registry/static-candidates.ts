import type { StaticCommandRegistry } from "@/command-registry/static-registry";
import type {
  CommandContext,
  CommandDescriptor,
  CommandScope,
} from "@/command-registry/types";

function isScopeMatch(scope: readonly CommandScope[], mode: CommandContext["mode"]): boolean {
  if (scope.includes("all")) {
    return true;
  }

  return scope.includes(mode);
}

function matchesPanelState(command: CommandDescriptor, context: CommandContext): boolean {
  const panel = command.action?.payload?.panel;
  if (typeof panel !== "string") {
    return true;
  }

  if (context.activePanel === "commands") {
    return panel === "commands" || panel !== context.activePanel;
  }

  return panel === context.activePanel || panel === "commands";
}

export function resolveStaticCommandCandidates(
  registry: StaticCommandRegistry,
  context: CommandContext,
): CommandDescriptor[] {
  return registry
    .getAll()
    .filter((command) => !command.hidden)
    .filter((command) => isScopeMatch(command.scope, context.mode))
    .filter((command) => {
      if (
        command.id.startsWith("system.") &&
        context.mode !== "system-trigger" &&
        context.query.length === 0
      ) {
        return false;
      }

      return true;
    })
    .filter((command) => matchesPanelState(command, context));
}
