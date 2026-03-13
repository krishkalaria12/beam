import { useMemo } from "react";

import {
  EmptyView,
  ListAccessoryRow,
  ListItem,
  SectionHeader,
  SplitView,
} from "@/components/module";
import { RunnerIcon } from "@/modules/extensions/components/runner/nodes/shared/runner-icon";
import type { ListEntry } from "@/modules/extensions/components/runner/types";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { asBoolean } from "@/modules/extensions/components/runner/utils";

import { RuntimeActionFooter } from "./runtime-action-footer";
import { RuntimeDetailView } from "./runtime-detail-view";
import { type AccessoryDescriptor, readAccessory, selectedActions } from "./utils";

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

  return (
    <>
      <SplitView
        detailVisible={showDetail}
        detailRatio="53%"
        primaryClassName="overflow-y-auto p-2"
        detailClassName="overflow-y-auto bg-[var(--launcher-card-bg)]"
        primary={
          rows.length === 0 ? (
            <EmptyView
              title="No results"
              description="This extension did not return any rows for the current query."
            />
          ) : (
            <div className="space-y-1">
              {rows.map((row, rowIndex) => {
                if (row.type === "section") {
                  return (
                    <SectionHeader
                      key={`section:${row.title}:${rowIndex}`}
                      title={row.title}
                      className="pt-2"
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

                return (
                  <ListItem
                    key={`item:${entry.nodeId}`}
                    selected={row.index === state.selectedIndex}
                    onSelect={() => state.setSelectedIndex(row.index!)}
                    onMouseEnter={() => state.setSelectedIndex(row.index!)}
                    onDoubleClick={() => state.runPrimarySelectionAction()}
                    showAccentBar
                    leftSlot={
                      icon ? (
                        <RunnerIcon icon={icon} className="size-5" />
                      ) : (
                        <span className="size-5" />
                      )
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
                        />
                      ) : null
                    }
                  >
                    <ListItem.Title>{entry.title}</ListItem.Title>
                    {entry.subtitle ? (
                      <ListItem.Description>{entry.subtitle}</ListItem.Description>
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
            <EmptyView title="Nothing selected" />
          )
        }
      />

      <RuntimeActionFooter state={state} actions={selectedActions(state)} />
    </>
  );
}
