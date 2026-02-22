import { ArrowLeft, Loader2, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RunnerDetailPanel } from "@/modules/extensions/components/runner/runner-detail-panel";
import { RunnerFormPanel } from "@/modules/extensions/components/runner/runner-form-panel";
import { RunnerListGridPanel } from "@/modules/extensions/components/runner/runner-list-grid-panel";
import { useExtensionRunnerState } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { asBoolean, asString } from "@/modules/extensions/components/runner/utils";

interface ExtensionRunnerViewProps {
  onBack: () => void;
  onOpenExtensions?: () => void;
}

export function ExtensionRunnerView({ onBack, onOpenExtensions }: ExtensionRunnerViewProps) {
  const state = useExtensionRunnerState({ onBack });

  const renderBody = () => {
    if (!state.rootNode) {
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Waiting for extension UI...
        </div>
      );
    }

    if (state.rootType === "List" || state.rootType === "Grid") {
      const showDetail =
        state.rootType === "List" &&
        asBoolean(state.rootNode.props.isShowingDetail) &&
        Boolean(state.selectedEntry?.detailNodeId);

      return (
        <RunnerListGridPanel
          rootType={state.rootType}
          uiTree={state.uiTree}
          searchText={state.searchText}
          searchPlaceholder={asString(state.rootNode.props.searchBarPlaceholder, "Search")}
          currentEntries={state.currentEntries}
          selectedIndex={state.selectedIndex}
          emptyViewNodeId={state.listModel?.emptyViewNodeId}
          showDetail={showDetail}
          detailContent={state.detailContent}
          selectedEntryActions={state.selectedEntryActions}
          rootActions={state.rootActions}
          toast={state.activeToast}
          onSearchChange={state.handleSearchInputChange}
          onSelectIndex={state.setSelectedIndex}
          onRunPrimaryAction={state.runPrimarySelectionAction}
          onToastAction={state.handleToastAction}
          onToastHide={state.handleToastHide}
          onExecuteAction={(action) => {
            void state.executeAction(action);
          }}
        />
      );
    }

    if (state.rootType === "Detail") {
      return (
        <RunnerDetailPanel
          rootNode={state.rootNode}
          uiTree={state.uiTree}
          rootActions={state.rootActions}
          toast={state.activeToast}
          onToastAction={state.handleToastAction}
          onToastHide={state.handleToastHide}
          onExecuteAction={(action) => {
            void state.executeAction(action);
          }}
        />
      );
    }

    if (state.rootType === "Form") {
      return (
        <RunnerFormPanel
          formFields={state.formFields}
          descriptions={state.formDescriptions}
          formValues={state.formValues}
          rootActions={state.rootActions}
          toast={state.activeToast}
          onSetValue={state.handleSetFormValue}
          onToastAction={state.handleToastAction}
          onToastHide={state.handleToastHide}
          onExecuteAction={(action) => {
            void state.executeAction(action);
          }}
          onRegisterFieldRef={state.registerFieldRef}
        />
      );
    }

    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm text-muted-foreground">
        Unsupported root component:{" "}
        <span className="font-mono text-foreground">{state.rootType || "unknown"}</span>
      </div>
    );
  };

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
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{state.runningSession?.title || "Extension"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {state.runningSession?.subtitle ||
              state.runningSession?.pluginPath ||
              "Raycast-compatible command"}
          </p>
        </div>
        {onOpenExtensions ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenExtensions}
            className="ml-auto h-8 gap-1.5"
          >
            <Settings2 className="size-3.5" />
            Setup
          </Button>
        ) : null}
      </div>
      {renderBody()}
    </div>
  );
}
