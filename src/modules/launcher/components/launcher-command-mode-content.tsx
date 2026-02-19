import RegistryCommandGroup from "@/command-registry/components/registry-command-group";
import type { CommandContext } from "@/command-registry/types";
import type { RankedCommand } from "@/command-registry/ranker";
import { CommandSeparator } from "@/components/ui/command";
import { QuicklinkPreview } from "@/modules/quicklinks/components/quicklink-preview";
import type { Quicklink } from "@/modules/quicklinks/types";

interface LauncherCommandModeContentProps {
  isQuicklinkTrigger: boolean;
  quicklinks: Quicklink[];
  quicklinkKeyword: string;
  quicklinkQuery: string;
  rankedRegistryCommands: readonly RankedCommand[];
  commandContext: CommandContext;
  onQuicklinkExecute: (keyword: string, query: string) => void;
  onQuicklinkFill: (value: string) => void;
  onRegistryCommandSelect: (commandId: string) => void;
}

export function LauncherCommandModeContent({
  isQuicklinkTrigger,
  quicklinks,
  quicklinkKeyword,
  quicklinkQuery,
  rankedRegistryCommands,
  commandContext,
  onQuicklinkExecute,
  onQuicklinkFill,
  onRegistryCommandSelect,
}: LauncherCommandModeContentProps) {
  return (
    <div className="py-1">
      {isQuicklinkTrigger ? (
        <>
          <QuicklinkPreview
            quicklinks={quicklinks}
            keyword={quicklinkKeyword}
            query={quicklinkQuery}
            onExecute={onQuicklinkExecute}
            onFill={onQuicklinkFill}
          />
          <CommandSeparator className="my-1 opacity-50" />
        </>
      ) : null}

      <RegistryCommandGroup
        commands={rankedRegistryCommands}
        query={commandContext.query}
        mode={commandContext.mode}
        onSelect={onRegistryCommandSelect}
      />
    </div>
  );
}
