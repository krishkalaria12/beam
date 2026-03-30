import { type CSSProperties } from "react";
import { openExternalUrl } from "@/lib/open-external-url";
import { cn } from "@/lib/utils";

import { SearchableDropdown } from "@/components/module";
import { Button } from "@/components/ui/button";
import {
  getDropdownItems,
  getDropdownSections,
} from "@/modules/extensions/components/runner/nodes/shared/dropdown-utils";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { asBoolean, asString } from "@/modules/extensions/components/runner/utils";
import { RunnerIcon } from "@/modules/extensions/components/runner/nodes/shared/runner-icon";

interface RuntimeDropdownAccessoryProps {
  nodeId: number;
  state: UseExtensionRunnerStateResult;
}

interface RuntimeDropdownAccessoryNodeProps {
  node: UseExtensionRunnerStateResult["uiTree"] extends Map<number, infer T> ? T : never;
  state: UseExtensionRunnerStateResult;
}

function RuntimeDropdownAccessoryNode({ node, state }: RuntimeDropdownAccessoryNodeProps) {
  const dropdownSections = getDropdownSections(node, state.uiTree);
  const dropdownItems = getDropdownItems(node, state.uiTree);
  const dropdownItemByValue = new Map(dropdownItems.map((item) => [item.value, item]));
  const resolvedValue =
    asString(node.props.value).trim() ||
    asString(node.props.defaultValue).trim() ||
    dropdownItems[0]?.value;

  const placeholder = asString(node.props.placeholder, "Select option");
  const displayTitle =
    (resolvedValue ? dropdownItemByValue.get(resolvedValue)?.title : undefined) || placeholder;
  const className = asString(node.props.className).trim() || undefined;
  const style =
    node.props.style && typeof node.props.style === "object" && !Array.isArray(node.props.style)
      ? (node.props.style as CSSProperties)
      : undefined;
  const triggerClassName = asString(node.props.triggerClassName).trim() || undefined;
  const panelClassName = asString(node.props.panelClassName).trim() || undefined;

  return (
    <SearchableDropdown
      compact
      className={cn("ext-dropdown-accessory w-[180px] max-w-full", className)}
      style={style}
      value={resolvedValue}
      placeholder={displayTitle}
      searchPlaceholder="Filter options…"
      panelAlign="end"
      matchTriggerWidth={false}
      sections={dropdownSections.map((section) => ({
        title: section.title,
        items: section.items.map((item) => ({
          value: item.value,
          title: item.title,
          icon: item.icon ? <RunnerIcon icon={item.icon} className="size-4" /> : undefined,
        })),
      }))}
      onValueChange={(nextValue) => {
        const item = dropdownItemByValue.get(nextValue);
        if (!item) {
          return;
        }

        if (asBoolean(node.props.onChange)) {
          state.dispatchNodeEvent(node.id, "onChange", [nextValue]);
        }

        const itemNode = state.uiTree.get(item.nodeId);
        if (itemNode && asBoolean(itemNode.props.onSelect)) {
          state.dispatchNodeEvent(item.nodeId, "onSelect", [nextValue]);
        }
      }}
      triggerClassName={cn("ext-dropdown-trigger w-full max-w-full", triggerClassName)}
      panelClassName={cn("ext-dropdown-panel w-[260px] max-w-[calc(100vw-1rem)]", panelClassName)}
    />
  );
}

export function RuntimeDropdownAccessory({ nodeId, state }: RuntimeDropdownAccessoryProps) {
  const node = state.uiTree.get(nodeId);
  if (!node) {
    return null;
  }

  if (node.type === "Form.LinkAccessory") {
    const text = asString(node.props.text).trim() || "Open";
    const target = asString(node.props.target).trim();
    if (!target) {
      return null;
    }

    return (
      <Button
        type="button"
        variant="outline"
        className={cn(
          "ext-form-link-accessory h-8 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-launcher-xs",
          asString(node.props.className).trim() || undefined,
        )}
        style={
          node.props.style &&
          typeof node.props.style === "object" &&
          !Array.isArray(node.props.style)
            ? (node.props.style as CSSProperties)
            : undefined
        }
        onClick={() => {
          void openExternalUrl(target);
        }}
      >
        {text}
      </Button>
    );
  }

  const isDropdownType =
    node.type === "List.Dropdown" || node.type === "Grid.Dropdown" || node.type === "Form.Dropdown";
  if (!isDropdownType) {
    return null;
  }

  return <RuntimeDropdownAccessoryNode node={node} state={state} />;
}
