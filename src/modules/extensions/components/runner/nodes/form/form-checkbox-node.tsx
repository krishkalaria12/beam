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
      <div className="flex items-center gap-3 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] px-3 py-3 transition-colors">
        <Checkbox
          ref={(element) => {
            state.registerFieldRef(nodeId, element);
          }}
          id={`checkbox-${nodeId}`}
          checked={Boolean(value)}
          onCheckedChange={(checked) => {
            state.handleSetFormValue(field, Boolean(checked));
          }}
          onBlur={() => {
            state.handleBlurFormField(field);
          }}
          onKeyDownCapture={stopFieldKeyPropagation}
          onKeyDown={stopFieldKeyPropagation}
          className="border-[var(--launcher-card-border)] data-[state=checked]:bg-[var(--ring)] data-[state=checked]:text-[var(--background)] data-[state=checked]:border-[var(--ring)]"
        />
        <Label htmlFor={`checkbox-${nodeId}`} className="text-[13px] font-medium leading-none cursor-pointer">
          {field.title}
        </Label>
      </div>
      {field.error ? <p className="text-[11px] text-[var(--icon-red-fg)]">{field.error}</p> : null}
      {field.info ? <p className="text-[11px] text-muted-foreground">{field.info}</p> : null}
    </div>
  );
}

