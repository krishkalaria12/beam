import type { KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";
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

export function FormFilePickerNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Form.FilePicker") {
    return null;
  }

  const field = state.formFieldByNodeId.get(nodeId);
  if (!field) {
    return null;
  }

  const selectedFiles = normalizeValue(state.formValues[field.key]);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{field.title}</label>
      <Input
        ref={(element) => {
          state.registerFieldRef(nodeId, element);
        }}
        type="file"
        multiple
        onChange={(event) => {
          const nextFiles = Array.from(event.target.files ?? []).map((file) => file.name);
          state.handleSetFormValue(field, nextFiles);
        }}
        onBlur={() => {
          state.handleBlurFormField(field);
        }}
        onKeyDownCapture={stopFieldKeyPropagation}
        onKeyDown={stopFieldKeyPropagation}
        aria-invalid={Boolean(field.error)}
        className="h-9"
      />
      {selectedFiles.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedFiles.map((fileName) => (
            <span
              key={`${nodeId}:${fileName}`}
              className="rounded-sm border border-border/70 bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {fileName}
            </span>
          ))}
        </div>
      ) : null}
      {field.error ? <p className="text-[11px] text-destructive">{field.error}</p> : null}
      {field.info ? <p className="text-[11px] text-muted-foreground">{field.info}</p> : null}
    </div>
  );
}
