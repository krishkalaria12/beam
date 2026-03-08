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
      <label className="text-[12px] font-medium text-muted-foreground">{field.title}</label>
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
        className="h-11 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] text-[14px] font-medium tracking-[-0.01em] text-foreground outline-none ring-1 ring-[var(--launcher-card-border)] transition-all focus:bg-[var(--launcher-card-hover-bg)] focus:ring-[var(--ring)] border-none file:mr-4 file:h-full file:rounded-l-xl file:border-0 file:border-r file:border-[var(--launcher-card-border)] file:bg-[var(--launcher-card-bg)] file:px-4 file:text-sm file:font-medium file:text-foreground hover:file:bg-[var(--launcher-card-hover-bg)]"
      />
      {selectedFiles.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedFiles.map((fileName) => (
            <span
              key={`${nodeId}:${fileName}`}
              className="rounded-md border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {fileName}
            </span>
          ))}
        </div>
      ) : null}
      {field.error ? <p className="text-[11px] text-[var(--icon-red-fg)]">{field.error}</p> : null}
      {field.info ? <p className="text-[11px] text-muted-foreground">{field.info}</p> : null}
    </div>
  );
}

