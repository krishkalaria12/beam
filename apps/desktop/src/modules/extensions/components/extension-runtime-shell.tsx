import { AlertTriangle, Copy, RefreshCw, Settings2 } from "lucide-react";
import type { ReactElement } from "react";
import { toast } from "sonner";

import { CommandSkeleton, CommandSkeletonText } from "@/components/command/command-skeleton";
import { EmptyView, ModuleFooter, SearchBar } from "@/components/module";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/modules/clipboard/api/copy-to-clipboard";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { extensionManagerService } from "@/modules/extensions/extension-manager-service";

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

function ExtensionRuntimeLoadingState({ state }: { state: UseExtensionRunnerStateResult }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-[var(--launcher-card-border)] px-4 py-3">
        <p className="text-launcher-sm font-medium text-foreground">
          Starting {state.runningSession?.title || "extension"}
        </p>
        <p className="mt-1 text-launcher-xs text-muted-foreground">
          Beam is preparing the command shell. The extension view will hydrate as soon as the first
          render arrives.
        </p>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <CommandSkeleton rows={6} showSubtitle className="px-3" />
        <CommandSkeletonText lines={4} className="px-3 pb-3" />
      </div>
    </div>
  );
}

function ExtensionRuntimeCrashState({
  state,
  onOpenExtensions,
}: {
  state: UseExtensionRunnerStateResult;
  onOpenExtensions?: () => void;
}) {
  const message = state.runningSession?.error?.message || "The extension runtime crashed.";
  const stack = state.runningSession?.error?.stack?.trim();
  const details = stack ? `${message}\n\n${stack}` : message;

  const handleRetry = () => {
    void extensionManagerService.retryLastForegroundLaunch().catch((error) => {
      const retryMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to relaunch extension: ${retryMessage}`);
    });
  };

  const handleCopy = () => {
    void copyToClipboard(details, false)
      .then(() => {
        toast.success("Extension crash details copied");
      })
      .catch((error) => {
        const copyMessage = error instanceof Error ? error.message : String(error);
        toast.error(`Failed to copy crash details: ${copyMessage}`);
      });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-4 py-5">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-hidden">
        <EmptyView
          className="min-h-0 px-0 py-0"
          icon={<AlertTriangle className="size-5 text-amber-500" />}
          title="Extension crashed"
          description={message}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleRetry}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
          <Button size="sm" variant="outline" onClick={state.handleBack}>
            Back
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="size-3.5" />
            Copy Error
          </Button>
          {onOpenExtensions ? (
            <Button size="sm" variant="ghost" onClick={onOpenExtensions}>
              Open Extensions
            </Button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]">
          <div className="border-b border-[var(--launcher-card-border)] px-4 py-2 text-launcher-xs font-medium text-muted-foreground">
            Crash Details
          </div>
          <pre className="h-full overflow-auto whitespace-pre-wrap break-words px-4 py-3 text-launcher-xs leading-5 text-foreground/90">
            {details}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function ExtensionRuntimeShell({ state, onOpenExtensions }: ExtensionRuntimeShellProps) {
  const rootNode = state.rootNode;
  const sessionStatus = state.runningSession?.status ?? (rootNode ? "ready" : "launching");
  const rootType = rootNode?.type ?? "";
  const showSearchInput = sessionStatus === "ready" && (rootType === "List" || rootType === "Grid");
  const searchBarAccessoryNodeId =
    sessionStatus === "ready" ? rootNode?.namedChildren?.searchBarAccessory : undefined;
  const searchPlaceholder =
    typeof rootNode?.props.searchBarPlaceholder === "string"
      ? rootNode.props.searchBarPlaceholder
      : "Search…";
  const searchBarClassName = readClassName(rootNode?.props.searchBarClassName);
  const searchBarStyle = readStyle(rootNode?.props.searchBarStyle);
  const searchInputContainerClassName = readClassName(
    rootNode?.props.searchInputContainerClassName,
  );
  const searchInputClassName = readClassName(rootNode?.props.searchInputClassName);
  const titleClassName = readClassName(rootNode?.props.searchTitleClassName);
  const subtitleClassName = readClassName(rootNode?.props.searchSubtitleClassName);
  const rightSlotClassName = readClassName(rootNode?.props.searchAccessoryClassName);

  let content: ReactElement;
  if (sessionStatus === "crashed") {
    content = <ExtensionRuntimeCrashState state={state} onOpenExtensions={onOpenExtensions} />;
  } else if (!rootNode) {
    content = <ExtensionRuntimeLoadingState state={state} />;
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
      className="extension-runtime-shell ext-shell flex h-full w-full flex-col overflow-hidden bg-background text-foreground"
      onKeyDownCapture={state.handleRootKeyDownCapture}
      onKeyDown={state.handleRootKeyDown}
      role="application"
      tabIndex={-1}
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
        inputContainerClassName={["ext-search-input-container", searchInputContainerClassName]
          .filter(Boolean)
          .join(" ")}
        inputClassName={["ext-search-input", searchInputClassName].filter(Boolean).join(" ")}
        titleClassName={["ext-search-title", titleClassName].filter(Boolean).join(" ")}
        subtitleClassName={["ext-search-subtitle", subtitleClassName].filter(Boolean).join(" ")}
        rightSlotClassName={["ext-search-accessories", rightSlotClassName]
          .filter(Boolean)
          .join(" ")}
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

      {!rootNode || sessionStatus === "crashed" ? (
        <ModuleFooter shortcuts={[{ keys: ["Esc"], label: "Back" }]} />
      ) : null}
    </div>
  );
}
