import { useEffect, useMemo, useRef, useState } from "react";

import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RunnerNodeRenderer } from "@/modules/extensions/components/runner/nodes/node-renderer";
import { getDropdownItems } from "@/modules/extensions/components/runner/nodes/shared/dropdown-utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";
import { asBoolean, asString } from "@/modules/extensions/components/runner/utils";

function isDropdownType(type: string): boolean {
  return type === "List.Dropdown" || type === "Grid.Dropdown" || type === "Form.Dropdown";
}

export function AccessoryDropdownNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || !isDropdownType(node.type)) {
    return null;
  }

  const isFormDropdown = node.type === "Form.Dropdown";
  const formField = isFormDropdown ? state.formFieldByNodeId.get(nodeId) : undefined;

  const dropdownItems = useMemo(() => getDropdownItems(node, state.uiTree), [node, state.uiTree]);
  const dropdownItemByValue = useMemo(
    () => new Map(dropdownItems.map((item) => [item.value, item])),
    [dropdownItems],
  );

  const [internalValue, setInternalValue] = useState<string | undefined>(undefined);
  const initializedRef = useRef(false);

  const controlledValueFromProps =
    node.props.value !== undefined ? asString(node.props.value).trim() : undefined;
  const defaultValueFromProps =
    node.props.defaultValue !== undefined ? asString(node.props.defaultValue).trim() : undefined;
  const firstItemValue = dropdownItems[0]?.value;

  const selectedFormValue =
    isFormDropdown && formField
      ? asString(state.formValues[formField.key], "").trim() || undefined
      : undefined;

  const isControlled = !isFormDropdown && controlledValueFromProps !== undefined;

  const selectedValue = isFormDropdown
    ? selectedFormValue
    : isControlled
      ? controlledValueFromProps
      : internalValue;

  useEffect(() => {
    if (isFormDropdown) {
      return;
    }

    const initialValue = defaultValueFromProps || controlledValueFromProps || firstItemValue;

    if (!initializedRef.current) {
      initializedRef.current = true;
      if (!isControlled) {
        setInternalValue(initialValue);
      }

      if (!controlledValueFromProps && !defaultValueFromProps && firstItemValue) {
        if (asBoolean(node.props.onChange)) {
          state.dispatchNodeEvent(node.id, "onChange", [firstItemValue]);
        }
      }
      return;
    }

    if (isControlled) {
      setInternalValue(controlledValueFromProps);
    }
  }, [
    controlledValueFromProps,
    defaultValueFromProps,
    firstItemValue,
    isControlled,
    isFormDropdown,
    node.id,
    state,
  ]);

  const handleSelect = (itemNodeId: number, nextValue: string) => {
    if (isFormDropdown && formField) {
      state.handleSetFormValue(formField, nextValue);
    } else {
      if (!isControlled) {
        setInternalValue(nextValue);
      }
      if (asBoolean(node.props.onChange)) {
        state.dispatchNodeEvent(node.id, "onChange", [nextValue]);
      }
    }

    const itemNode = state.uiTree.get(itemNodeId);
    if (itemNode && asBoolean(itemNode.props.onSelect)) {
      state.dispatchNodeEvent(itemNodeId, "onSelect", [nextValue]);
    }
  };

  const placeholder = asString(node.props.placeholder, "Select option");
  const displayTitle =
    (selectedValue ? dropdownItemByValue.get(selectedValue)?.title : undefined) || placeholder;

  return (
    <Select
      value={selectedValue}
      onValueChange={(nextValue) => {
        if (typeof nextValue !== "string") {
          return;
        }
        const item = dropdownItemByValue.get(nextValue);
        if (!item) {
          return;
        }
        handleSelect(item.nodeId, nextValue);
      }}
    >
      <div className={isFormDropdown ? "space-y-1.5" : undefined}>
        <SelectTrigger
          className={
            isFormDropdown
              ? "h-9 w-full rounded-md border-border/70 bg-background/60 text-xs"
              : "h-8 min-w-[180px] max-w-[260px] rounded-md border-border/70 bg-background/60 text-xs"
          }
          aria-invalid={Boolean(isFormDropdown && formField?.error)}
          onBlur={() => {
            if (isFormDropdown && formField) {
              state.handleBlurFormField(formField);
            }
          }}
        >
          <SelectValue>{displayTitle}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {node.children.map((childId) => (
            <RunnerNodeRenderer key={childId} nodeId={childId} state={state} />
          ))}
        </SelectContent>
        {isFormDropdown && formField?.error ? (
          <p className="text-[11px] text-destructive">{formField.error}</p>
        ) : null}
        {isFormDropdown && formField?.info ? (
          <p className="text-[11px] text-muted-foreground">{formField.info}</p>
        ) : null}
      </div>
    </Select>
  );
}
