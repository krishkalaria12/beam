import { useMemo, useRef } from "react";

import { EmptyView, GenericGridView, ListAccessoryRow, SectionHeader } from "@/components/module";
import { cn } from "@/lib/utils";
import { RunnerIcon } from "@/modules/extensions/components/runner/nodes/shared/runner-icon";
import type { ListEntry } from "@/modules/extensions/components/runner/types";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { asBoolean, asString } from "@/modules/extensions/components/runner/utils";

import { RuntimeActionFooter } from "./runtime-action-footer";
import {
  getEmptyViewIconClassName,
  isAnimatedEmptyViewIcon,
  readClassName,
  readStyle,
  resolveColorContent,
  resolveContentValue,
  selectedActions,
  toInsetClass,
} from "./utils";

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
  const emptyViewNode = rootNode?.children
    .map((childId) => state.uiTree.get(childId))
    .find((child): child is NonNullable<typeof child> => child?.type === "Grid.EmptyView");
  const className = readClassName(rootNode?.props.className);
  const style = readStyle(rootNode?.props.style);
  const contentClassName = readClassName(rootNode?.props.contentClassName);
  const contentStyle = readStyle(rootNode?.props.contentStyle);

  return (
    <GenericGridView
      className={cn("ext-grid-view", className)}
      style={style}
      contentClassName={cn("ext-grid-content", contentClassName)}
      contentStyle={contentStyle}
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
      footer={<RuntimeActionFooter state={state} actions={selectedActions(state)} />}
    >
        {sections.length === 0 ? (
          <EmptyView
            title={emptyViewNode ? asString(emptyViewNode.props.title).trim() || "No results" : "No results"}
            description={
              emptyViewNode
                ? asString(emptyViewNode.props.description).trim() || undefined
                : "This extension did not return any grid items."
            }
            icon={
              emptyViewNode?.props.icon ? (
                <RunnerIcon
                  icon={emptyViewNode.props.icon}
                  className={getEmptyViewIconClassName(emptyViewNode.props.icon)}
                />
              ) : undefined
            }
            className={cn("ext-empty-view", readClassName(emptyViewNode?.props.className))}
            style={readStyle(emptyViewNode?.props.style)}
            contentClassName={cn(
              isAnimatedEmptyViewIcon(emptyViewNode?.props.icon) ? "max-w-md" : undefined,
              readClassName(emptyViewNode?.props.contentClassName),
            )}
            contentStyle={readStyle(emptyViewNode?.props.contentStyle)}
            titleClassName={cn(
              isAnimatedEmptyViewIcon(emptyViewNode?.props.icon) ? "text-[14px]" : undefined,
              readClassName(emptyViewNode?.props.titleClassName),
            )}
            descriptionClassName={readClassName(emptyViewNode?.props.descriptionClassName)}
          />
        ) : (
          <div className="ext-grid-sections space-y-4">
            {sections.map((section) => (
              <div key={section.key} className="ext-grid-section space-y-2">
                {section.title ? (
                  <SectionHeader title={section.title} className="ext-section-header px-0" />
                ) : null}
                <div
                  className="ext-grid-matrix grid gap-2"
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
                    const itemClassName = readClassName(node.props.className);
                    const itemStyle = readStyle(node.props.style);
                    const titleClassName = readClassName(node.props.titleClassName);
                    const subtitleClassName = readClassName(node.props.subtitleClassName);
                    const aspectRatio =
                      entry.gridAspectRatio ?? (asString(node.props.aspectRatio).trim() || "1");
                    const fit = entry.gridFit ?? (asString(node.props.fit).trim() || "fill");
                    const insetClass = toInsetClass(entry.gridInset ?? node.props.inset);

                    return (
                      <button
                        key={`grid:${entry.nodeId}`}
                        type="button"
                        data-selected={selected}
                        onMouseEnter={() => state.setSelectedIndex(index)}
                        onClick={() => state.setSelectedIndex(index)}
                        onDoubleClick={() => state.runPrimarySelectionAction()}
                        className={cn(
                          "ext-grid-item",
                          "flex h-auto flex-col gap-2 rounded-xl border p-2 text-left transition-colors",
                          selected
                            ? "border-[var(--launcher-card-selected-border)] bg-[var(--launcher-card-selected-bg)]"
                            : "border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] hover:bg-[var(--launcher-card-hover-bg)]",
                          itemClassName,
                        )}
                        style={itemStyle}
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
                          <div
                            className={cn(
                              "ext-grid-item-title truncate text-[13px] font-medium text-foreground",
                              titleClassName,
                            )}
                          >
                            {entry.title}
                          </div>
                          {entry.subtitle ? (
                            <div
                              className={cn(
                                "ext-grid-item-subtitle truncate text-[11px] text-muted-foreground",
                                subtitleClassName,
                              )}
                            >
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
                            className="ext-grid-accessories"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {showPlaceholders ? (
              <div className="ext-grid-placeholders grid grid-cols-3 gap-2">
                {Array.from({ length: pageSize }).map((_, index) => (
                  <div
                    key={`placeholder:${index}`}
                    className="ext-grid-placeholder aspect-square rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/70"
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
    </GenericGridView>
  );
}
