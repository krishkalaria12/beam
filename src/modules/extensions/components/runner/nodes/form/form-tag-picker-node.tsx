import type { KeyboardEvent } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

function stopFieldKeyPropagation(event: KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

function normalizeValue(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

export function FormTagPickerNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Form.TagPicker") {
    return null;
  }

  const field = state.formFieldByNodeId.get(nodeId);
  if (!field) {
    return null;
  }

  const selectedValues = normalizeValue(state.formValues[field.key]);
  const selectedSet = new Set(selectedValues);

  return (
    <div className="space-y-2">
      <label className="text-[12px] font-medium text-muted-foreground">{field.title}</label>
      <div className="space-y-2 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] p-3">
        {field.options.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">No tags available.</p>
        ) : (
          field.options.map((option) => {
            const checked = selectedSet.has(option.value);
            return (
              <div key={`${nodeId}:${option.value}`} className="flex items-center gap-3">
                <Checkbox
                  id={`tag-${nodeId}-${option.value}`}
                  checked={checked}
                  onCheckedChange={(nextChecked) => {
                    const isChecked = Boolean(nextChecked);
                    const nextSet = new Set(selectedValues);
                    if (isChecked) {
                      nextSet.add(option.value);
                    } else {
                      nextSet.delete(option.value);
                    }
                    state.handleSetFormValue(field, [...nextSet]);
                  }}
                  onBlur={() => {
                    state.handleBlurFormField(field);
                  }}
                  onKeyDownCapture={stopFieldKeyPropagation}
                  onKeyDown={stopFieldKeyPropagation}
                  className="border-[var(--launcher-card-border)] data-[state=checked]:bg-[var(--ring)] data-[state=checked]:text-[var(--background)] data-[state=checked]:border-[var(--ring)]"
                />
                <Label htmlFor={`tag-${nodeId}-${option.value}`} className="text-[13px] font-medium cursor-pointer">
                  {option.title}
                </Label>
              </div>
            );
          })
        )}
      </div>
      {field.error ? <p className="text-[11px] text-[var(--icon-red-fg)]">{field.error}</p> : null}
      {field.info ? <p className="text-[11px] text-muted-foreground">{field.info}</p> : null}
    </div>
  );
}

