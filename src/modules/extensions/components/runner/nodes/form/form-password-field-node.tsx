import type { KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";
import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

function stopFieldKeyPropagation(event: KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

export function FormPasswordFieldNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Form.PasswordField") {
    return null;
  }

  const field = state.formFieldByNodeId.get(nodeId);
  if (!field) {
    return null;
  }

  const value = state.formValues[field.key];

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{field.title}</label>
      <Input
        ref={(element) => {
          state.registerFieldRef(nodeId, element);
        }}
        type="password"
        value={typeof value === "string" ? value : asString(value)}
        onChange={(event) => {
          state.handleSetFormValue(field, event.target.value);
        }}
        onKeyDownCapture={stopFieldKeyPropagation}
        onKeyDown={stopFieldKeyPropagation}
        placeholder={field.placeholder}
        readOnly={!field.hasOnChange}
        className="h-9"
      />
    </div>
  );
}
