import { Search, Settings2 } from "lucide-react";

import { CommandLoadingState } from "@/components/command/command-loading-state";
import { ModuleFooter, ModuleHeader, SearchInput } from "@/components/module";
import { Button } from "@/components/ui/button";
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
      <ModuleHeader
        onBack={state.handleBack}
        title={state.runningSession?.title || "Extension"}
        subtitle={
          state.runningSession?.subtitle ||
          state.runningSession?.pluginPath ||
          "Raycast-compatible command"
        }
        rightSlot={
          <div className="flex items-center gap-2">
            {canRenderSearchAccessory ? (
              <RunnerNodeRenderer nodeId={searchBarAccessoryNodeId!} state={state} />
            ) : null}
            {onOpenExtensions ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenExtensions}
                className="h-8 gap-1.5 rounded-lg bg-[var(--launcher-card-bg)] text-xs text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-foreground transition-all duration-200"
              >
                <Settings2 className="size-3.5" />
                Setup
              </Button>
            ) : null}
          </div>
        }
      />

      {showSearchInput ? (
        <div className="flex-none border-b border-[var(--ui-divider)] p-3">
          <SearchInput
            value={state.searchText}
            onChange={state.handleSearchInputChange}
            placeholder={searchPlaceholder}
            leftIcon={<Search />}
          />
        </div>
      ) : null}

      {!state.rootNode ? (
        <>
          <CommandLoadingState label="Loading extension UI..." className="min-h-0 flex-1" />
          <ModuleFooter shortcuts={[{ keys: ["Esc"], label: "Back" }]} />
        </>
      ) : (
        <RootNodeRenderer state={state} />
      )}
    </div>
  );
}

