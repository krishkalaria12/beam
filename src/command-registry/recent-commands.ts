import type { CommandUsageEntry } from "@/command-registry/command-preferences";
import type { RankedCommand } from "@/command-registry/ranker";
import type { CommandDescriptor } from "@/command-registry/types";

const DEFAULT_RECENT_COMMAND_LIMIT = 6;

interface ResolveRecentCommandsOptions {
  commands: readonly RankedCommand[];
  usageById: Readonly<Record<string, CommandUsageEntry>>;
  excludedCommandIds?: ReadonlySet<string>;
  limit?: number;
}

interface RecentCandidate {
  command: CommandDescriptor;
  lastUsedAt: number;
}

export function resolveRecentCommands({
  commands,
  usageById,
  excludedCommandIds,
  limit = DEFAULT_RECENT_COMMAND_LIMIT,
}: ResolveRecentCommandsOptions): CommandDescriptor[] {
  if (!Number.isFinite(limit) || limit <= 0) {
    return [];
  }

  const commandById = new Map<string, CommandDescriptor>();
  for (const entry of commands) {
    commandById.set(entry.command.id, entry.command);
  }

  const candidates: RecentCandidate[] = [];
  for (const [commandId, usage] of Object.entries(usageById)) {
    if (excludedCommandIds?.has(commandId)) {
      continue;
    }

    if (!usage?.lastUsedAt) {
      continue;
    }

    const command = commandById.get(commandId);
    if (!command) {
      continue;
    }

    const lastUsedAt = Date.parse(usage.lastUsedAt);
    if (!Number.isFinite(lastUsedAt)) {
      continue;
    }

    candidates.push({ command, lastUsedAt });
  }

  candidates.sort((left, right) => {
    if (left.lastUsedAt !== right.lastUsedAt) {
      return right.lastUsedAt - left.lastUsedAt;
    }

    const leftTitle = left.command.title.toLowerCase();
    const rightTitle = right.command.title.toLowerCase();
    if (leftTitle !== rightTitle) {
      return leftTitle.localeCompare(rightTitle);
    }

    return left.command.id.localeCompare(right.command.id);
  });

  return candidates.slice(0, Math.floor(limit)).map((entry) => entry.command);
}
