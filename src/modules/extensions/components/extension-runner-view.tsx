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
      className="flex h-full w-full flex-col bg-background"
      onKeyDownCapture={state.handleRootKeyDownCapture}
      onKeyDown={state.handleRootKeyDown}
    >
      <div className="flex items-center gap-3 border-b border-border/50 p-3">
        <Button variant="ghost" size="icon" onClick={state.handleBack} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 shrink-0">
          <p className="truncate text-sm font-medium">{state.runningSession?.title || "Extension"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {state.runningSession?.subtitle ||
              state.runningSession?.pluginPath ||
              "Raycast-compatible command"}
          </p>
        </div>
        {showSearchInput ? (
          <div className="relative ml-auto w-full max-w-[360px]">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={state.searchText}
              onChange={(event) => {
                state.handleSearchInputChange(event.target.value);
              }}
              placeholder={searchPlaceholder}
              className="h-9 pl-8"
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
            variant="outline"
            size="sm"
            onClick={onOpenExtensions}
            className="h-8 shrink-0 gap-1.5"
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
