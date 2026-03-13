import { useState } from "react";

import { SearchableDropdown } from "@/components/module";
import { getDropdownItems } from "@/modules/extensions/components/runner/nodes/shared/dropdown-utils";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { asBoolean, asString } from "@/modules/extensions/components/runner/utils";

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

  const dropdownItems = getDropdownItems(node, state.uiTree);
  const dropdownItemByValue = new Map(dropdownItems.map((item) => [item.value, item]));
  const [internalValue, setInternalValue] = useState<string | undefined>(
    asString(node.props.value).trim() ||
      asString(node.props.defaultValue).trim() ||
      dropdownItems[0]?.value,
  );

  const placeholder = asString(node.props.placeholder, "Select option");
  const displayTitle =
    (internalValue ? dropdownItemByValue.get(internalValue)?.title : undefined) || placeholder;

  return (
    <SearchableDropdown
      compact
      value={internalValue}
      placeholder={displayTitle}
      searchPlaceholder="Filter options…"
      sections={[
        {
          items: dropdownItems.map((item) => ({
            value: item.value,
            title: item.title,
          })),
        },
      ]}
      onValueChange={(nextValue) => {
        const item = dropdownItemByValue.get(nextValue);
        if (!item) {
          return;
        }

        setInternalValue(nextValue);
        if (asBoolean(node.props.onChange)) {
          state.dispatchNodeEvent(node.id, "onChange", [nextValue]);
        }

        const itemNode = state.uiTree.get(item.nodeId);
        if (itemNode && asBoolean(itemNode.props.onSelect)) {
          state.dispatchNodeEvent(item.nodeId, "onSelect", [nextValue]);
        }
      }}
      triggerClassName="min-w-[180px] max-w-[260px]"
      panelClassName="w-[260px]"
    />
  );
}
