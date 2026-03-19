import { Settings2 } from "lucide-react";
import type { ReactElement } from "react";

import { EmptyView, ModuleFooter, SearchBar } from "@/components/module";
import { Button } from "@/components/ui/button";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";

import { RuntimeDetailView } from "./extension-runtime-shell/runtime-detail-view";
import { RuntimeDropdownAccessory } from "./extension-runtime-shell/runtime-dropdown-accessory";
import { RuntimeFormView } from "./extension-runtime-shell/runtime-form-view";
import { RuntimeGridView } from "./extension-runtime-shell/runtime-grid-view";
import { RuntimeListView } from "./extension-runtime-shell/runtime-list-view";
import { readClassName, readStyle } from "./extension-runtime-shell/utils";

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
  const searchBarClassName = readClassName(rootNode?.props.searchBarClassName);
  const searchBarStyle = readStyle(rootNode?.props.searchBarStyle);
  const searchInputContainerClassName = readClassName(rootNode?.props.searchInputContainerClassName);
  const searchInputClassName = readClassName(rootNode?.props.searchInputClassName);
  const titleClassName = readClassName(rootNode?.props.searchTitleClassName);
  const subtitleClassName = readClassName(rootNode?.props.searchSubtitleClassName);
  const rightSlotClassName = readClassName(rootNode?.props.searchAccessoryClassName);

  let content: ReactElement;
  if (!rootNode) {
    content = (
      <EmptyView
        className="ext-empty-view"
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
      className="extension-runtime-shell ext-shell flex h-full w-full flex-col overflow-hidden bg-[var(--solid-bg)] text-foreground"
      onKeyDownCapture={state.handleRootKeyDownCapture}
      onKeyDown={state.handleRootKeyDown}
    >
      <SearchBar
        onBack={state.handleBack}
        showBackButton
        interactive={showSearchInput}
        className={["ext-search-bar", searchBarClassName].filter(Boolean).join(" ")}
        style={searchBarStyle}
        value={showSearchInput ? state.searchText : ""}
        onChange={showSearchInput ? state.handleSearchInputChange : undefined}
        onKeyDown={showSearchInput ? state.handleSearchInputKeyDown : undefined}
        placeholder={searchPlaceholder}
        inputContainerClassName={["ext-search-input-container", searchInputContainerClassName].filter(Boolean).join(" ")}
        inputClassName={["ext-search-input", searchInputClassName].filter(Boolean).join(" ")}
        titleClassName={["ext-search-title", titleClassName].filter(Boolean).join(" ")}
        subtitleClassName={["ext-search-subtitle", subtitleClassName].filter(Boolean).join(" ")}
        rightSlotClassName={["ext-search-accessories", rightSlotClassName].filter(Boolean).join(" ")}
        title={state.runningSession?.title || "Extension"}
        subtitle={
          state.runningSession?.subtitle || state.runningSession?.pluginPath || "Beam extension"
        }
        rightSlot={
          <div className="ext-search-actions flex items-center gap-2">
            {searchBarAccessoryNodeId ? (
              <RuntimeDropdownAccessory nodeId={searchBarAccessoryNodeId} state={state} />
            ) : null}
            {onOpenExtensions ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenExtensions}
                className="ext-search-settings h-8 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2.5 text-launcher-xs"
              >
                <Settings2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        }
      />

      {content}

      {!rootNode ? <ModuleFooter shortcuts={[{ keys: ["Esc"], label: "Back" }]} /> : null}
    </div>
  );
}
