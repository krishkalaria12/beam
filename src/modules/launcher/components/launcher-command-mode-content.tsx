import RegistryCommandGroup from "@/command-registry/components/registry-command-group";
import type { CommandUsageEntry } from "@/command-registry/command-preferences";
import type { CommandContext, CommandDescriptor } from "@/command-registry/types";
import type { RankedCommand } from "@/command-registry/ranker";
import { QuicklinkPreview } from "@/modules/quicklinks/components/quicklink-preview";
import type { Quicklink } from "@/modules/quicklinks/types";

interface LauncherCommandModeContentProps {
  isQuicklinkTrigger: boolean;
  quicklinks: Quicklink[];
  quicklinkKeyword: string;
  quicklinkQuery: string;
  rankedRegistryCommands: readonly RankedCommand[];
  fallbackRegistryCommands: readonly CommandDescriptor[];
  pinnedCommandIds: readonly string[];
  usageById: Readonly<Record<string, CommandUsageEntry>>;
  commandContext: CommandContext;
  onQuicklinkExecute: (keyword: string, query: string) => void;
  onQuicklinkFill: (value: string) => void;
  onRegistryCommandSelect: (commandId: string) => void;
  onSetPinned: (commandId: string, pinned: boolean) => void;
}

export function LauncherCommandModeContent({
  isQuicklinkTrigger,
  quicklinks,
  quicklinkKeyword,
  quicklinkQuery,
  rankedRegistryCommands,
  fallbackRegistryCommands,
  pinnedCommandIds,
  usageById,
  commandContext,
  onQuicklinkExecute,
  onQuicklinkFill,
  onRegistryCommandSelect,
  onSetPinned,
}: LauncherCommandModeContentProps) {
  return (
    <div className="py-1">
      {isQuicklinkTrigger ? (
        <QuicklinkPreview
          quicklinks={quicklinks}
          keyword={quicklinkKeyword}
          query={quicklinkQuery}
          onExecute={onQuicklinkExecute}
          onFill={onQuicklinkFill}
        />
      ) : null}

      <RegistryCommandGroup
        commands={rankedRegistryCommands}
        fallbackCommands={fallbackRegistryCommands}
        query={commandContext.query}
        mode={commandContext.mode}
        onSelect={onRegistryCommandSelect}
        orderedPinnedCommandIds={pinnedCommandIds}
        usageById={usageById}
        onSetPinned={onSetPinned}
      />
    </div>
  );
}
