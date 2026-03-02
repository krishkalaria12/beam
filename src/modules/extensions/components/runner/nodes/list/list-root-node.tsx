import { cn } from "@/lib/utils";
import { RunnerActionBar } from "@/modules/extensions/components/runner/runner-action-bar";
import { RunnerNodeRenderer } from "@/modules/extensions/components/runner/nodes/node-renderer";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";
import { asBoolean } from "@/modules/extensions/components/runner/utils";

interface ListRenderRow {
  type: "section" | "item";
  key: string;
  title?: string;
  sectionNodeId?: number;
  entryIndex?: number;
  nodeId?: number;
}

function toRenderRows(state: RunnerNodeComponentProps["state"]): ListRenderRow[] {
  const rows: ListRenderRow[] = [];
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

export function ListRootNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "List") {
    return null;
  }

  const rows = toRenderRows(state);
  const showDetail =
    asBoolean(node.props.isShowingDetail) && Boolean(state.selectedEntry?.detailNodeId);

  const selectedActions =
    state.selectedEntryActions.length > 0 ? state.selectedEntryActions : state.rootActions;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className={cn("h-full", showDetail ? "grid grid-cols-[46%_54%]" : "")}>
          <div className="h-full overflow-y-auto p-2">
            {rows.length === 0 ? (
              state.listModel?.emptyViewNodeId ? (
                <RunnerNodeRenderer nodeId={state.listModel.emptyViewNodeId} state={state} />
              ) : (
                <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                  No results.
                </div>
              )
            ) : (
              <div className="space-y-1">
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
                      <h3
                        key={row.key}
                        className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {row.title}
                      </h3>
                    );
                  }

                  if (
                    row.type === "item" &&
                    row.nodeId !== undefined &&
                    row.entryIndex !== undefined
                  ) {
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

          {showDetail ? (
            <div className="h-full overflow-y-auto border-l border-border/50 p-3">
              {state.selectedEntry?.detailNodeId ? (
                <RunnerNodeRenderer nodeId={state.selectedEntry.detailNodeId} state={state} />
              ) : (
                <div className="text-sm text-muted-foreground">No detail available.</div>
              )}
            </div>
          ) : null}
        </div>
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
