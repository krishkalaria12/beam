import { Search, Settings2 } from "lucide-react";
import type { ReactElement } from "react";

import { EmptyView, ModuleFooter, ModuleHeader, SearchInput } from "@/components/module";
import { Button } from "@/components/ui/button";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";

import { RuntimeDetailView } from "./extension-runtime-shell/runtime-detail-view";
import { RuntimeDropdownAccessory } from "./extension-runtime-shell/runtime-dropdown-accessory";
import { RuntimeFormView } from "./extension-runtime-shell/runtime-form-view";
import { RuntimeGridView } from "./extension-runtime-shell/runtime-grid-view";
import { RuntimeListView } from "./extension-runtime-shell/runtime-list-view";

interface ExtensionRuntimeShellProps {
  state: UseExtensionRunnerStateResult;
  onOpenExtensions?: () => void;
}

export function ExtensionRuntimeShell({ state, onOpenExtensions }: ExtensionRuntimeShellProps) {
  const rootNode = state.rootNode;
  const rootType = rootNode?.type ?? "";
  const showSearchInput = rootType === "List" || rootType === "Grid";
  const searchBarAccessoryNodeId = rootNode?.namedChildren?.searchBarAccessory;
  const searchPlaceholder =
    typeof rootNode?.props.searchBarPlaceholder === "string"
      ? rootNode.props.searchBarPlaceholder
      : "Search…";

  let content: ReactElement;
  if (!rootNode) {
    content = (
      <EmptyView
        title="Loading extension"
        description="Waiting for the extension manager to produce a view."
      />
    );
  } else if (rootType === "List") {
    content = <RuntimeListView state={state} />;
  } else if (rootType === "Grid") {
    content = <RuntimeGridView state={state} />;
  } else if (rootType === "Form") {
    content = <RuntimeFormView state={state} />;
  } else {
    content = <RuntimeDetailView state={state} nodeId={rootNode.id} />;
  }

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-[var(--solid-bg)] text-foreground"
      onKeyDownCapture={state.handleRootKeyDownCapture}
      onKeyDown={state.handleRootKeyDown}
    >
      <ModuleHeader
        onBack={state.handleBack}
        title={state.runningSession?.title || "Extension"}
        subtitle={
          state.runningSession?.subtitle || state.runningSession?.pluginPath || "Beam extension"
        }
        rightSlot={
          <div className="flex items-center gap-2">
            {searchBarAccessoryNodeId ? (
              <RuntimeDropdownAccessory nodeId={searchBarAccessoryNodeId} state={state} />
            ) : null}
            {onOpenExtensions ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenExtensions}
                className="h-8 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2.5 text-xs"
              >
                <Settings2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        }
      />

      {showSearchInput ? (
        <div className="border-b border-[var(--ui-divider)] px-4 py-3">
          <SearchInput
            value={state.searchText}
            onChange={state.handleSearchInputChange}
            placeholder={searchPlaceholder}
            leftIcon={<Search />}
          />
        </div>
      ) : null}

      {content}

      {!rootNode ? <ModuleFooter shortcuts={[{ keys: ["Esc"], label: "Back" }]} /> : null}
    </div>
  );
}
