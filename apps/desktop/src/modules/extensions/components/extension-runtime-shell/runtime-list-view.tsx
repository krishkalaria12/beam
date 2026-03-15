import { useMemo } from "react";

import {
  EmptyView,
  GenericListView,
  ListAccessoryRow,
  ListItem,
  SectionHeader,
} from "@/components/module";
import { cn } from "@/lib/utils";
import { RunnerIcon } from "@/modules/extensions/components/runner/nodes/shared/runner-icon";
import type { ListEntry } from "@/modules/extensions/components/runner/types";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { asBoolean, asString } from "@/modules/extensions/components/runner/utils";

import { RuntimeActionFooter } from "./runtime-action-footer";
import { RuntimeDetailView } from "./runtime-detail-view";
import {
  type AccessoryDescriptor,
  getEmptyViewIconClassName,
  isAnimatedEmptyViewIcon,
  readAccessory,
  readClassName,
  readStyle,
  selectedActions,
} from "./utils";

interface RuntimeListViewProps {
  state: UseExtensionRunnerStateResult;
}

export function RuntimeListView({ state }: RuntimeListViewProps) {
  const rootNode = state.rootNode;
  const rows = useMemo(() => {
    const output: Array<{
      type: "section" | "item";
      title?: string;
      entry?: ListEntry;
      index?: number;
    }> = [];
    let previousSectionTitle: string | undefined;

    state.currentEntries.forEach((entry, index) => {
      const sectionTitle = entry.sectionTitle?.trim() || undefined;
      if (sectionTitle && sectionTitle !== previousSectionTitle) {
        output.push({ type: "section", title: sectionTitle });
        previousSectionTitle = sectionTitle;
      }
      output.push({ type: "item", entry, index });
    });

    return output;
  }, [state.currentEntries]);

  const showDetail = Boolean(
    asBoolean(rootNode?.props.isShowingDetail) && state.selectedEntry?.detailNodeId,
  );
  const detailNodeId = state.selectedEntry?.detailNodeId;
  const listClassName = readClassName(rootNode?.props.className);
  const listStyle = readStyle(rootNode?.props.style);
  const listPaneClassName = readClassName(rootNode?.props.listPaneClassName);
  const listPaneStyle = readStyle(rootNode?.props.listPaneStyle);
  const detailPaneClassName = readClassName(rootNode?.props.detailPaneClassName);
  const detailPaneStyle = readStyle(rootNode?.props.detailPaneStyle);
  const contentClassName = readClassName(rootNode?.props.contentClassName);
  const contentStyle = readStyle(rootNode?.props.contentStyle);
  const emptyViewNode = rootNode?.children
    .map((childId) => state.uiTree.get(childId))
    .find((child): child is NonNullable<typeof child> => child?.type === "List.EmptyView");
  const emptyView =
    emptyViewNode?.type === "List.EmptyView" ? (
      <EmptyView
        title={asString(emptyViewNode.props.title).trim() || "No results"}
        description={asString(emptyViewNode.props.description).trim() || undefined}
        icon={
          emptyViewNode.props.icon ? (
            <RunnerIcon
              icon={emptyViewNode.props.icon}
              className={getEmptyViewIconClassName(emptyViewNode.props.icon)}
            />
          ) : undefined
        }
        className={readClassName(emptyViewNode.props.className)}
        style={readStyle(emptyViewNode.props.style)}
        contentClassName={cn(
          isAnimatedEmptyViewIcon(emptyViewNode.props.icon) ? "max-w-md" : undefined,
          readClassName(emptyViewNode.props.contentClassName),
        )}
        contentStyle={readStyle(emptyViewNode.props.contentStyle)}
        descriptionClassName={readClassName(emptyViewNode.props.descriptionClassName)}
        titleClassName={cn(
          isAnimatedEmptyViewIcon(emptyViewNode.props.icon) ? "text-[14px]" : undefined,
          readClassName(emptyViewNode.props.titleClassName),
        )}
      />
    ) : (
      <EmptyView
        className="ext-empty-view"
        title="No results"
        description="This extension did not return any rows for the current query."
      />
    );

  return (
    <GenericListView
      detailVisible={showDetail}
      detailRatio="53%"
      className={cn("ext-list-view", listClassName)}
      style={listStyle}
      bodyClassName={cn("ext-list-body", contentClassName)}
      bodyStyle={contentStyle}
      listPaneClassName={cn("ext-list-pane overflow-y-auto p-2", listPaneClassName)}
      listPaneStyle={listPaneStyle}
      detailPaneClassName={cn(
        "ext-detail-pane overflow-y-auto bg-[var(--launcher-card-bg)]",
        detailPaneClassName,
      )}
      detailPaneStyle={detailPaneStyle}
      list={
        rows.length === 0 ? (
          emptyView
        ) : (
          <div className="ext-list-items space-y-1">
            {rows.map((row, rowIndex) => {
              if (row.type === "section") {
                return (
                  <SectionHeader
                    key={`section:${row.title}:${rowIndex}`}
                    title={row.title}
                    className="ext-section-header pt-2"
                  />
                );
              }

              const entry = row.entry!;
              const node = state.uiTree.get(entry.nodeId);
              if (!node) {
                return null;
              }

              const icon = node.props.icon;
              const accessories = Array.isArray(node.props.accessories)
                ? node.props.accessories
                    .map((accessory, accessoryIndex) =>
                      readAccessory(accessory, node.id, accessoryIndex),
                    )
                    .filter((value): value is AccessoryDescriptor => value !== null)
                : [];

              const itemClassName = readClassName(node.props.className);
              const itemStyle = readStyle(node.props.style);
              const titleClassName = readClassName(node.props.titleClassName);
              const descriptionClassName = readClassName(node.props.descriptionClassName);

              return (
                <ListItem
                  key={`item:${entry.nodeId}`}
                  selected={row.index === state.selectedIndex}
                  onSelect={() => state.setSelectedIndex(row.index!)}
                  onMouseEnter={() => state.setSelectedIndex(row.index!)}
                  onDoubleClick={() => state.runPrimarySelectionAction()}
                  showAccentBar
                  leftSlot={
                    icon ? <RunnerIcon icon={icon} className="size-5" /> : <span className="size-5" />
                  }
                  rightSlot={
                    accessories.length > 0 ? (
                      <ListAccessoryRow
                        items={accessories.map((accessory) => ({
                          key: accessory.key,
                          text: accessory.text ?? "",
                          accentColor: accessory.color,
                          icon: accessory.icon ? (
                            <RunnerIcon icon={accessory.icon} className="size-3.5" />
                          ) : undefined,
                          tooltip: accessory.tooltip,
                        }))}
                        className="ext-list-accessories"
                      />
                    ) : null
                  }
                  className={cn("ext-list-item", itemClassName)}
                  style={itemStyle}
                >
                  <ListItem.Title className={cn("ext-list-item-title", titleClassName)}>
                    {entry.title}
                  </ListItem.Title>
                  {entry.subtitle ? (
                    <ListItem.Description
                      className={cn("ext-list-item-description", descriptionClassName)}
                    >
                      {entry.subtitle}
                    </ListItem.Description>
                  ) : null}
                </ListItem>
              );
            })}
          </div>
        )
      }
      detail={
        detailNodeId ? (
          <RuntimeDetailView state={state} nodeId={detailNodeId} nested />
        ) : (
          <EmptyView className="ext-empty-view" title="Nothing selected" />
        )
      }
      footer={<RuntimeActionFooter state={state} actions={selectedActions(state)} />}
    />
  );
}
