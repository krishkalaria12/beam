import type { KeyboardEvent } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

function stopFieldKeyPropagation(event: KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

export function FormDropdownNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Form.Dropdown") {
    return null;
  }

  const field = state.formFieldByNodeId.get(nodeId);
  if (!field) {
    return null;
  }

  const selectedValue = asString(state.formValues[field.key], field.options[0]?.value ?? "");

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{field.title}</Label>
      <Select
        value={selectedValue}
        onValueChange={(nextValue) => {
          state.handleSetFormValue(field, nextValue ?? "");
        }}
        disabled={!field.hasOnChange}
      >
        <SelectTrigger
          ref={(element) => {
            state.registerFieldRef(nodeId, element);
          }}
          className="h-9"
          onKeyDownCapture={stopFieldKeyPropagation}
          onKeyDown={stopFieldKeyPropagation}
        >
          <SelectValue placeholder={field.placeholder || "Select option"} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((option) => (
            <SelectItem key={`${nodeId}:${option.value}`} value={option.value}>
              {option.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
