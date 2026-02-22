import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { RunnerActionBar } from "@/modules/extensions/components/runner/runner-action-bar";
import { RunnerNodeRenderer } from "@/modules/extensions/components/runner/nodes/node-renderer";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";
import { asString } from "@/modules/extensions/components/runner/utils";

interface GridRenderRow {
  type: "section" | "item";
  key: string;
  title?: string;
  sectionNodeId?: number;
  entryIndex?: number;
  nodeId?: number;
}

function toRenderRows(state: RunnerNodeComponentProps["state"]): GridRenderRow[] {
  const rows: GridRenderRow[] = [];
  let previousSectionTitle: string | undefined;

  state.currentEntries.forEach((entry, index) => {
    const sectionTitle = entry.sectionTitle?.trim() || undefined;
    if (sectionTitle && sectionTitle !== previousSectionTitle) {
      rows.push({
        type: "section",
        key: `section:${sectionTitle}:${index}`,
        title: sectionTitle,
        sectionNodeId: entry.sectionNodeId,
      });
      previousSectionTitle = sectionTitle;
    }

    rows.push({
      type: "item",
      key: `item:${entry.nodeId}:${index}`,
      entryIndex: index,
      nodeId: entry.nodeId,
    });
  });

  return rows;
}

export function GridRootNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Grid") {
    return null;
  }

  const rows = toRenderRows(state);
  const emptyViewNodeId = node.children.find((childId) => {
    const child = state.uiTree.get(childId);
    return child?.type === "Grid.EmptyView";
  });
  const selectedActions = state.selectedEntryActions.length > 0
    ? state.selectedEntryActions
    : state.rootActions;

  return (
    <>
      <div className="border-b border-border/50 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={state.searchText}
            onChange={(event) => {
              state.handleSearchInputChange(event.target.value);
            }}
            placeholder={asString(node.props.searchBarPlaceholder, "Search")}
            className="pl-8"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {rows.length === 0 ? (
          emptyViewNodeId ? (
            <RunnerNodeRenderer nodeId={emptyViewNodeId} state={state} />
          ) : (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
              No results.
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {rows.map((row) => {
              if (row.type === "section" && row.title) {
                if (row.sectionNodeId !== undefined) {
                  return (
                    <RunnerNodeRenderer
                      key={row.key}
                      nodeId={row.sectionNodeId}
                      state={state}
                    />
                  );
                }
                return (
                  <div key={row.key} className="col-span-full pb-1 pt-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {row.title}
                    </h3>
                  </div>
                );
              }

              if (row.type === "item" && row.nodeId !== undefined && row.entryIndex !== undefined) {
                return (
                  <RunnerNodeRenderer
                    key={row.key}
                    nodeId={row.nodeId}
                    state={state}
                    renderContext={{
                      selected: row.entryIndex === state.selectedIndex,
                      onSelect: () => {
                        state.setSelectedIndex(row.entryIndex!);
                      },
                      onActivate: () => {
                        state.runPrimarySelectionAction();
                      },
                    }}
                  />
                );
              }

              return null;
            })}
          </div>
        )}
      </div>

      <RunnerActionBar
        actions={selectedActions}
        toast={state.activeToast}
        onToastAction={state.handleToastAction}
        onToastHide={state.handleToastHide}
        onExecuteAction={(action) => {
          void state.executeAction(action);
        }}
      />
    </>
  );
}
