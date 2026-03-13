import { useMemo, useRef } from "react";

import { EmptyView, ListAccessoryRow, SectionHeader } from "@/components/module";
import { cn } from "@/lib/utils";
import { RunnerIcon } from "@/modules/extensions/components/runner/nodes/shared/runner-icon";
import type { ListEntry } from "@/modules/extensions/components/runner/types";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { asBoolean, asString } from "@/modules/extensions/components/runner/utils";

import { RuntimeActionFooter } from "./runtime-action-footer";
import { resolveColorContent, resolveContentValue, selectedActions, toInsetClass } from "./utils";

interface RuntimeGridViewProps {
  state: UseExtensionRunnerStateResult;
}

export function RuntimeGridView({ state }: RuntimeGridViewProps) {
  const rootNode = state.rootNode;
  const sections = useMemo(() => {
    const blocks: Array<{
      key: string;
      title?: string;
      columns: number;
      entries: Array<{ entry: ListEntry; index: number }>;
    }> = [];

    let current: {
      key: string;
      title?: string;
      columns: number;
      entries: Array<{ entry: ListEntry; index: number }>;
    } | null = null;

    state.currentEntries.forEach((entry, index) => {
      const key = String(entry.sectionNodeId ?? `root-${entry.gridColumns ?? 6}`);
      const columns =
        typeof entry.gridColumns === "number" &&
        Number.isFinite(entry.gridColumns) &&
        entry.gridColumns > 0
          ? Math.max(1, Math.floor(entry.gridColumns))
          : 6;

      if (!current || current.key !== key) {
        current = { key, title: entry.sectionTitle, columns, entries: [] };
        blocks.push(current);
      }

      current.entries.push({ entry, index });
    });

    return blocks;
  }, [state.currentEntries]);

  const pagination =
    rootNode?.props.pagination && typeof rootNode.props.pagination === "object"
      ? (rootNode.props.pagination as Record<string, unknown>)
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

  return (
    <>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
        onScroll={(event) => {
          if (!hasOnLoadMore || !hasMore || !rootNode) {
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
          state.dispatchNodeEvent(rootNode.id, "onLoadMore", []);
        }}
      >
        {sections.length === 0 ? (
          <EmptyView
            title="No results"
            description="This extension did not return any grid items."
          />
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.key} className="space-y-2">
                {section.title ? <SectionHeader title={section.title} className="px-0" /> : null}
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))` }}
                >
                  {section.entries.map(({ entry, index }) => {
                    const node = state.uiTree.get(entry.nodeId);
                    if (!node) {
                      return null;
                    }

                    const selected = index === state.selectedIndex;
                    const contentValue = resolveContentValue(node.props.content);
                    const colorContent = resolveColorContent(contentValue);
                    const accessory =
                      node.props.accessory && typeof node.props.accessory === "object"
                        ? (node.props.accessory as Record<string, unknown>)
                        : null;
                    const aspectRatio =
                      entry.gridAspectRatio ?? (asString(node.props.aspectRatio).trim() || "1");
                    const fit = entry.gridFit ?? (asString(node.props.fit).trim() || "fill");
                    const insetClass = toInsetClass(entry.gridInset ?? node.props.inset);

                    return (
                      <button
                        key={`grid:${entry.nodeId}`}
                        type="button"
                        onMouseEnter={() => state.setSelectedIndex(index)}
                        onClick={() => state.setSelectedIndex(index)}
                        onDoubleClick={() => state.runPrimarySelectionAction()}
                        className={cn(
                          "flex h-auto flex-col gap-2 rounded-xl border p-2 text-left transition-colors",
                          selected
                            ? "border-[var(--launcher-card-selected-border)] bg-[var(--launcher-card-selected-bg)]"
                            : "border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] hover:bg-[var(--launcher-card-hover-bg)]",
                        )}
                      >
                        <div
                          className={cn(
                            "w-full overflow-hidden rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-chip-bg)]",
                            insetClass,
                          )}
                          style={{ aspectRatio }}
                        >
                          {colorContent ? (
                            <div
                              className="h-full w-full rounded-md"
                              style={{ backgroundColor: colorContent }}
                            />
                          ) : (
                            <RunnerIcon
                              icon={contentValue}
                              className={cn(
                                "h-full w-full",
                                fit === "contain" ? "object-contain" : "object-cover",
                              )}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium text-foreground">
                            {entry.title}
                          </div>
                          {entry.subtitle ? (
                            <div className="truncate text-[11px] text-muted-foreground">
                              {entry.subtitle}
                            </div>
                          ) : null}
                        </div>
                        {accessory ? (
                          <ListAccessoryRow
                            items={[
                              {
                                key: `${entry.nodeId}:accessory`,
                                text: asString(accessory.text).trim(),
                                icon: accessory.icon ? (
                                  <RunnerIcon icon={accessory.icon} className="size-3.5" />
                                ) : undefined,
                              },
                            ]}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {showPlaceholders ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: pageSize }).map((_, index) => (
                  <div
                    key={`placeholder:${index}`}
                    className="aspect-square rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/70"
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <RuntimeActionFooter state={state} actions={selectedActions(state)} />
    </>
  );
}
