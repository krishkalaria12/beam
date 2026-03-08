import { useMemo, useRef, type UIEvent } from "react";

import { CommandLoadingState } from "@/components/command/command-loading-state";
import { RunnerActionBar } from "@/modules/extensions/components/runner/runner-action-bar";
import { RunnerNodeRenderer } from "@/modules/extensions/components/runner/nodes/node-renderer";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";
import { asBoolean } from "@/modules/extensions/components/runner/utils";

interface GridSectionBlock {
  key: string;
  title?: string;
  sectionNodeId?: number;
  columns: number;
  entries: Array<{
    key: string;
    nodeId: number;
    entryIndex: number;
  }>;
}

function toGridSections(state: RunnerNodeComponentProps["state"]): GridSectionBlock[] {
  const sections: GridSectionBlock[] = [];
  let currentSection: GridSectionBlock | null = null;

  state.currentEntries.forEach((entry, index) => {
    const sectionKeyBase = entry.sectionNodeId ?? `root-${entry.gridColumns ?? 6}`;
    if (!currentSection || currentSection.key !== String(sectionKeyBase)) {
      currentSection = {
        key: String(sectionKeyBase),
        title: entry.sectionTitle,
        sectionNodeId: entry.sectionNodeId,
        columns:
          typeof entry.gridColumns === "number" &&
          Number.isFinite(entry.gridColumns) &&
          entry.gridColumns > 0
            ? Math.max(1, Math.floor(entry.gridColumns))
            : 6,
        entries: [],
      };
      sections.push(currentSection);
    }

    currentSection.entries.push({
      key: `item:${entry.nodeId}:${index}`,
      nodeId: entry.nodeId,
      entryIndex: index,
    });
  });

  return sections;
}

export function GridRootNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Grid") {
    return null;
  }

  const sections = useMemo(() => toGridSections(state), [state]);
  const emptyViewNodeId = node.children.find((childId) => {
    const child = state.uiTree.get(childId);
    return child?.type === "Grid.EmptyView";
  });
  const selectedActions =
    state.selectedEntryActions.length > 0 ? state.selectedEntryActions : state.rootActions;
  const isLoading = asBoolean(node.props.isLoading);

  const pagination =
    node.props.pagination && typeof node.props.pagination === "object"
      ? (node.props.pagination as Record<string, unknown>)
      : undefined;
  const hasMore =
    pagination && typeof pagination.hasMore === "boolean" ? pagination.hasMore : false;
  const pageSize =
    pagination && typeof pagination.pageSize === "number" && pagination.pageSize > 0
      ? Math.max(0, Math.floor(pagination.pageSize))
      : 0;
  const hasOnLoadMore = pagination ? asBoolean(pagination.onLoadMore) : false;
  const showPlaceholders = hasMore && pageSize > 0;

  const lastLoadMoreAtRef = useRef(0);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!hasOnLoadMore || !hasMore) {
      return;
    }

    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom > 300) {
      return;
    }

    const now = Date.now();
    if (now - lastLoadMoreAtRef.current < 400) {
      return;
    }
    lastLoadMoreAtRef.current = now;
    state.dispatchNodeEvent(node.id, "onLoadMore", []);
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 custom-scrollbar" onScroll={handleScroll}>
        {sections.length === 0 ? (
          isLoading ? (
            <CommandLoadingState label="Loading..." className="min-h-[180px]" />
          ) : emptyViewNodeId ? (
            <RunnerNodeRenderer nodeId={emptyViewNodeId} state={state} />
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4 text-center text-[12px] text-muted-foreground/50 m-2">
              No results.
            </div>
          )
        ) : (
          <div className="space-y-2">
            {sections.map((section) => (
              <div key={section.key} className="space-y-1.5">
                {section.sectionNodeId !== undefined ? (
                  <RunnerNodeRenderer nodeId={section.sectionNodeId} state={state} />
                ) : section.title ? (
                  <div className="pt-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                      {section.title}
                    </h3>
                  </div>
                ) : null}

                <div
                  className="grid content-start gap-x-2.5"
                  style={{ gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))` }}
                >
                  {section.entries.map((entry) => (
                    <div key={entry.key} id={`item-${entry.nodeId}`}>
                      <RunnerNodeRenderer
                        nodeId={entry.nodeId}
                        state={state}
                        renderContext={{
                          selected: entry.entryIndex === state.selectedIndex,
                          onSelect: () => {
                            state.setSelectedIndex(entry.entryIndex);
                          },
                          onActivate: () => {
                            state.runPrimarySelectionAction();
                          },
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {showPlaceholders ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: pageSize }).map((_, index) => (
                  <div
                    key={`placeholder:${index}`}
                    className="aspect-square w-full animate-pulse rounded-lg bg-[var(--launcher-card-bg)] border border-[var(--launcher-card-border)]"
                  />
                ))}
              </div>
            ) : null}
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

