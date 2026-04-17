import RegistryCommandGroup from "@/command-registry/components/registry-command-group";
import type { CommandUsageEntry } from "@/command-registry/command-preferences";
import type { CommandContext, CommandDescriptor } from "@/command-registry/types";
import type { RankedCommand } from "@/command-registry/ranker";
import { InlineFileResultsGroup } from "@/modules/file-search/components/inline-file-results-group";
import { QuicklinkPreview } from "@/modules/quicklinks/components/quicklink-preview";
import type { Quicklink } from "@/modules/quicklinks/types";

interface LauncherCommandModeContentProps {
  isQuicklinkTrigger: boolean;
  quicklinks: Quicklink[];
  quicklinkAliasesById: Record<string, string[]>;
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
  onRegistryCommandIntent: (command: CommandDescriptor) => void;
  onNonFileIntent: () => void;
  onSetPinned: (commandId: string, pinned: boolean) => void;
}

export function LauncherCommandModeContent({
  isQuicklinkTrigger,
  quicklinks,
  quicklinkAliasesById,
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
  onRegistryCommandIntent,
  onNonFileIntent,
  onSetPinned,
}: LauncherCommandModeContentProps) {
  const shouldShowInlineFiles =
    commandContext.activePanel === "commands" &&
    (commandContext.mode === "normal" || commandContext.mode === "compressed") &&
    commandContext.query.trim().length > 0;

  return (
    <div className="pb-1">
      {isQuicklinkTrigger ? (
        <QuicklinkPreview
          quicklinks={quicklinks}
          aliasesById={quicklinkAliasesById}
          keyword={quicklinkKeyword}
          query={quicklinkQuery}
          onExecute={onQuicklinkExecute}
          onFill={onQuicklinkFill}
        />
      ) : null}

      {shouldShowInlineFiles ? <InlineFileResultsGroup query={commandContext.query} /> : null}

      <RegistryCommandGroup
        commands={rankedRegistryCommands}
        fallbackCommands={fallbackRegistryCommands}
        query={commandContext.query}
        mode={commandContext.mode}
        onSelect={onRegistryCommandSelect}
        onCommandIntent={(command) => {
          onNonFileIntent();
          onRegistryCommandIntent(command);
        }}
        orderedPinnedCommandIds={pinnedCommandIds}
        usageById={usageById}
        onSetPinned={onSetPinned}
      />
    </div>
  );
}
