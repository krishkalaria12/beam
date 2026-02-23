import { Search, Settings2 } from "lucide-react";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandLoadingState } from "@/components/command/command-loading-state";
import { CommandKeyHint } from "@/components/command/command-key-hint";
import {
  CommandPanelBackButton,
  CommandPanelHeader,
  CommandPanelTitleBlock,
} from "@/components/command/command-panel-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RunnerNodeRenderer } from "@/modules/extensions/components/runner/nodes/node-renderer";
import { RootNodeRenderer } from "@/modules/extensions/components/runner/nodes/root-node-renderer";
import { useExtensionRunnerState } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";

interface ExtensionRunnerViewProps {
  onBack: () => void;
  onOpenExtensions?: () => void;
}

export function ExtensionRunnerView({ onBack, onOpenExtensions }: ExtensionRunnerViewProps) {
  const state = useExtensionRunnerState({ onBack });
  useLauncherPanelBackHandler("extension-runner", state.handleBack);
  const showSearchInput = state.rootType === "List" || state.rootType === "Grid";
  const searchBarAccessoryNodeId = state.rootNode?.namedChildren?.searchBarAccessory;
  const searchPlaceholder =
    typeof state.rootNode?.props.searchBarPlaceholder === "string"
      ? state.rootNode.props.searchBarPlaceholder
      : "Search...";
  const canRenderSearchAccessory =
    searchBarAccessoryNodeId !== undefined &&
    (state.rootType === "List" || state.rootType === "Grid" || state.rootType === "Form");

  return (
    <div
      className="glass-effect flex h-full w-full flex-col overflow-hidden text-foreground"
      onKeyDownCapture={state.handleRootKeyDownCapture}
      onKeyDown={state.handleRootKeyDown}
    >
      <CommandPanelHeader>
        <CommandPanelBackButton onClick={state.handleBack} aria-label="Back" />
        <CommandPanelTitleBlock
          className="shrink-0"
          title={state.runningSession?.title || "Extension"}
          subtitle={
            state.runningSession?.subtitle ||
            state.runningSession?.pluginPath ||
            "Raycast-compatible command"
          }
        />
        {showSearchInput ? (
          <div className="relative ml-auto w-full max-w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={state.searchText}
              onChange={(event) => {
                state.handleSearchInputChange(event.target.value);
              }}
              placeholder={searchPlaceholder}
              className="h-9 rounded-lg border-border/40 bg-background/20 pl-9 text-sm text-foreground shadow-none placeholder:text-muted-foreground/50 focus-visible:bg-background/30 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>
        ) : (
          <div className="ml-auto" />
        )}
        {canRenderSearchAccessory ? (
          <RunnerNodeRenderer nodeId={searchBarAccessoryNodeId!} state={state} />
        ) : null}
        {onOpenExtensions ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenExtensions}
            className="h-8 shrink-0 gap-1.5 rounded-lg border border-border/40 bg-background/20 text-xs font-medium text-muted-foreground hover:bg-background/30 hover:text-foreground"
          >
            <Settings2 className="size-3.5" />
            Setup
          </Button>
        ) : null}
      </CommandPanelHeader>
      {!state.rootNode ? (
        <>
          <CommandLoadingState label="Loading extension UI..." className="min-h-0 flex-1" />
          <CommandFooterBar rightSlot={<CommandKeyHint keyLabel="ESC" label="Back" />} />
        </>
      ) : (
        <RootNodeRenderer state={state} />
      )}
    </div>
  );
}
