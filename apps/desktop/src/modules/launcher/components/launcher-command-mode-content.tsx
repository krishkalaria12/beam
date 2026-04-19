import { useMemo, useRef, type RefObject } from "react";

import { CALCULATOR_RESULT_COMMAND_ID } from "@/command-registry/default-providers";
import RegistryCommandGroup from "@/command-registry/components/registry-command-group";
import type { CommandUsageEntry } from "@/command-registry/command-preferences";
import type { CommandContext, CommandDescriptor } from "@/command-registry/types";
import type { RankedCommand } from "@/command-registry/ranker";
import { useMountEffect } from "@/hooks/use-mount-effect";
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
  onPrimaryCommandValueChange: (value: string) => void;
}

function CommandModePrimarySelectionSync({
  containerRef,
  onPrimaryCommandValueChange,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  onPrimaryCommandValueChange: (value: string) => void;
}) {
  useMountEffect(() => {
    const nextValue =
      containerRef.current
        ?.querySelector<HTMLElement>('[cmdk-item][aria-disabled="false"]')
        ?.getAttribute("data-value") ?? "";
    onPrimaryCommandValueChange(nextValue);
  });

  return null;
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
  onPrimaryCommandValueChange,
}: LauncherCommandModeContentProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const shouldShowInlineFiles =
    commandContext.activePanel === "commands" &&
    (commandContext.mode === "normal" || commandContext.mode === "compressed") &&
    commandContext.query.trim().length > 0;
  const shouldShowCalculatorFirst = rankedRegistryCommands.some(
    (entry) => entry.command.id === CALCULATOR_RESULT_COMMAND_ID,
  );
  const selectionSyncKey = useMemo(
    () =>
      [
        isQuicklinkTrigger ? "quicklink" : "commands",
        quicklinkKeyword,
        quicklinkQuery,
        commandContext.query,
        rankedRegistryCommands.map((entry) => entry.command.id).join("\u0000"),
        fallbackRegistryCommands.map((command) => command.id).join("\u0000"),
      ].join("\u0001"),
    [
      commandContext.query,
      fallbackRegistryCommands,
      isQuicklinkTrigger,
      quicklinkKeyword,
      quicklinkQuery,
      rankedRegistryCommands,
    ],
  );
  const inlineFileResults = shouldShowInlineFiles ? (
    <InlineFileResultsGroup
      query={commandContext.query}
      onPrimaryCommandValueChange={onPrimaryCommandValueChange}
    />
  ) : null;

  return (
    <div ref={contentRef} className="pb-1">
      <CommandModePrimarySelectionSync
        key={selectionSyncKey}
        containerRef={contentRef}
        onPrimaryCommandValueChange={onPrimaryCommandValueChange}
      />
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

      {!shouldShowCalculatorFirst ? inlineFileResults : null}

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
      {shouldShowCalculatorFirst ? inlineFileResults : null}
    </div>
  );
}
