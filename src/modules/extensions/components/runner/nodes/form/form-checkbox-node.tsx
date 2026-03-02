import type { KeyboardEvent } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

function stopFieldKeyPropagation(event: KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

export function FormCheckboxNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Form.Checkbox") {
    return null;
  }

  const field = state.formFieldByNodeId.get(nodeId);
  if (!field) {
    return null;
  }

  const value = state.formValues[field.key];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background/40 px-3 py-2">
        <Checkbox
          ref={(element) => {
            state.registerFieldRef(nodeId, element);
          }}
          checked={Boolean(value)}
          onCheckedChange={(checked) => {
            state.handleSetFormValue(field, Boolean(checked));
          }}
          onBlur={() => {
            state.handleBlurFormField(field);
          }}
          onKeyDownCapture={stopFieldKeyPropagation}
          onKeyDown={stopFieldKeyPropagation}
        />
        <Label className="text-sm">{field.title}</Label>
      </div>
      {field.error ? <p className="text-[11px] text-destructive">{field.error}</p> : null}
      {field.info ? <p className="text-[11px] text-muted-foreground">{field.info}</p> : null}
    </div>
  );
}
