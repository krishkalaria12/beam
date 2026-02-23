import { ArrowLeft, Loader2, Search, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RunnerNodeRenderer } from "@/modules/extensions/components/runner/nodes/node-renderer";
import { RootNodeRenderer } from "@/modules/extensions/components/runner/nodes/root-node-renderer";
import { useExtensionRunnerState } from "@/modules/extensions/components/runner/use-extension-runner-state";

interface ExtensionRunnerViewProps {
  onBack: () => void;
  onOpenExtensions?: () => void;
}

export function ExtensionRunnerView({ onBack, onOpenExtensions }: ExtensionRunnerViewProps) {
  const state = useExtensionRunnerState({ onBack });
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
      <div className="relative z-10 flex shrink-0 items-center gap-3 border-b border-[var(--ui-divider)] bg-background/15 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={state.handleBack}
          className="size-8 rounded-lg text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 shrink-0">
          <p className="truncate text-sm font-medium text-foreground">
            {state.runningSession?.title || "Extension"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {state.runningSession?.subtitle ||
              state.runningSession?.pluginPath ||
              "Raycast-compatible command"}
          </p>
        </div>
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
      </div>
      {!state.rootNode ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Waiting for extension UI...
        </div>
      ) : (
        <RootNodeRenderer state={state} />
      )}
    </div>
  );
}
