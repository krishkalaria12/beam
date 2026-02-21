import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RunnerActionBar } from "@/modules/extensions/components/runner/runner-action-bar";
import type { FlattenedAction, ListEntry } from "@/modules/extensions/components/runner/types";
import { extractText } from "@/modules/extensions/components/runner/utils";
import type { ExtensionToast, ExtensionUiNode } from "@/modules/extensions/runtime/store";

interface RunnerListGridPanelProps {
  rootType: "List" | "Grid";
  uiTree: Map<number, ExtensionUiNode>;
  searchText: string;
  searchPlaceholder: string;
  currentEntries: ListEntry[];
  selectedIndex: number;
  emptyViewNodeId?: number;
  showDetail: boolean;
  detailContent: ReactNode;
  selectedEntryActions: FlattenedAction[];
  rootActions: FlattenedAction[];
  toast?: ExtensionToast;
  onSearchChange: (value: string) => void;
  onSelectIndex: (index: number) => void;
  onRunPrimaryAction: () => void;
  onToastAction: (toastId: number, actionType: "primary" | "secondary") => void;
  onToastHide: (toastId: number) => void;
  onExecuteAction: (action: FlattenedAction) => void;
}

export function RunnerListGridPanel({
  rootType,
  uiTree,
  searchText,
  searchPlaceholder,
  currentEntries,
  selectedIndex,
  emptyViewNodeId,
  showDetail,
  detailContent,
  selectedEntryActions,
  rootActions,
  toast,
  onSearchChange,
  onSelectIndex,
  onRunPrimaryAction,
  onToastAction,
  onToastHide,
  onExecuteAction,
}: RunnerListGridPanelProps) {
  return (
    <>
      <div className="border-b border-border/50 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className={cn("h-full", showDetail ? "grid grid-cols-[46%_54%]" : "")}>
          <div className="h-full overflow-y-auto p-2">
            {currentEntries.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                {emptyViewNodeId
                  ? extractText(uiTree, emptyViewNodeId) || "No results."
                  : "No results."}
              </div>
            ) : (
              <div className={cn(rootType === "Grid" ? "grid grid-cols-2 gap-2" : "space-y-1")}>
                {currentEntries.map((entry, index) => (
                  <button
                    key={entry.nodeId}
                    type="button"
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left transition-colors",
                      index === selectedIndex
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent bg-card hover:border-border/70",
                    )}
                    onMouseEnter={() => onSelectIndex(index)}
                    onClick={() => onSelectIndex(index)}
                    onDoubleClick={onRunPrimaryAction}
                  >
                    {entry.sectionTitle ? (
                      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                        {entry.sectionTitle}
                      </p>
                    ) : null}
                    <p className="truncate text-sm font-medium">{entry.title}</p>
                    {entry.subtitle ? (
                      <p className="truncate text-xs text-muted-foreground">{entry.subtitle}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          {showDetail ? (
            <div className="h-full overflow-y-auto border-l border-border/50 p-3">
              {detailContent ?? (
                <div className="text-sm text-muted-foreground">No detail available.</div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <RunnerActionBar
        actions={selectedEntryActions.length > 0 ? selectedEntryActions : rootActions}
        toast={toast}
        onToastAction={onToastAction}
        onToastHide={onToastHide}
        onExecuteAction={onExecuteAction}
      />
    </>
  );
}
