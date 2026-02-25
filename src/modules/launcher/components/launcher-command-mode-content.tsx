import RegistryCommandGroup from "@/command-registry/components/registry-command-group";
import type { CommandContext } from "@/command-registry/types";
import type { RankedCommand } from "@/command-registry/ranker";
import { CommandSeparator } from "@/components/ui/command";
import { QuicklinkPreview } from "@/modules/quicklinks/components/quicklink-preview";
import { TodoPreviewGroup, shouldShowTodoPreview } from "@/modules/todo/components/todo-preview-group";
import type { Quicklink } from "@/modules/quicklinks/types";

interface LauncherCommandModeContentProps {
  isQuicklinkTrigger: boolean;
  quicklinks: Quicklink[];
  quicklinkKeyword: string;
  quicklinkQuery: string;
  rankedRegistryCommands: readonly RankedCommand[];
  pinnedCommandIds: readonly string[];
  commandContext: CommandContext;
  onQuicklinkExecute: (keyword: string, query: string) => void;
  onQuicklinkFill: (value: string) => void;
  onRegistryCommandSelect: (commandId: string) => void;
  onSetPinned: (commandId: string, pinned: boolean) => void;
  onOpenTodoPreview: () => void;
}

export function LauncherCommandModeContent({
  isQuicklinkTrigger,
  quicklinks,
  quicklinkKeyword,
  quicklinkQuery,
  rankedRegistryCommands,
  pinnedCommandIds,
  commandContext,
  onQuicklinkExecute,
  onQuicklinkFill,
  onRegistryCommandSelect,
  onSetPinned,
  onOpenTodoPreview,
}: LauncherCommandModeContentProps) {
  const shouldRenderTodoPreview =
    (commandContext.mode === "normal" || commandContext.mode === "compressed") &&
    shouldShowTodoPreview(commandContext.query);

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

      {shouldRenderTodoPreview ? (
        <>
          <TodoPreviewGroup query={commandContext.query} onOpenTodo={onOpenTodoPreview} />
          <CommandSeparator className="my-1 opacity-50" />
        </>
      ) : null}

      <RegistryCommandGroup
        commands={rankedRegistryCommands}
        query={commandContext.query}
        mode={commandContext.mode}
        onSelect={onRegistryCommandSelect}
        orderedPinnedCommandIds={pinnedCommandIds}
        onSetPinned={onSetPinned}
      />
    </div>
  );
}
