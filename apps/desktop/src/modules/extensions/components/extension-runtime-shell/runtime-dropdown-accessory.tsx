import { type CSSProperties, useRef, useState } from "react";
import { cn } from "@/lib/utils";

import { SearchableDropdown } from "@/components/module";
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

export function RuntimeDropdownAccessory({ nodeId, state }: RuntimeDropdownAccessoryProps) {
  const node = state.uiTree.get(nodeId);
  if (!node) {
    return null;
  }

  const isDropdownType =
    node.type === "List.Dropdown" || node.type === "Grid.Dropdown" || node.type === "Form.Dropdown";
  if (!isDropdownType) {
    return null;
  }

  const dropdownSections = getDropdownSections(node, state.uiTree);
  const dropdownItems = getDropdownItems(node, state.uiTree);
  const dropdownItemByValue = new Map(dropdownItems.map((item) => [item.value, item]));
  const resolvedValue =
    asString(node.props.value).trim() ||
    asString(node.props.defaultValue).trim() ||
    dropdownItems[0]?.value;
  const [internalValue, setInternalValue] = useState<string | undefined>(resolvedValue);
  const pendingValueRef = useRef<string | null>(null);

  if (pendingValueRef.current !== null && resolvedValue === pendingValueRef.current) {
    pendingValueRef.current = null;
  }

  if (
    (pendingValueRef.current === null || internalValue !== pendingValueRef.current) &&
    resolvedValue !== internalValue
  ) {
    setInternalValue(resolvedValue);
  }

  const placeholder = asString(node.props.placeholder, "Select option");
  const displayTitle =
    (internalValue ? dropdownItemByValue.get(internalValue)?.title : undefined) || placeholder;
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
      value={internalValue}
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

        pendingValueRef.current = nextValue;
        setInternalValue(nextValue);
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
