import type { KeyboardEvent } from "react";

import { Textarea } from "@/components/ui/textarea";
import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

function stopFieldKeyPropagation(event: KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

export function FormTextAreaNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Form.TextArea") {
    return null;
  }

  const field = state.formFieldByNodeId.get(nodeId);
  if (!field) {
    return null;
  }

  const value = state.formValues[field.key];

  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-muted-foreground">{field.title}</label>
      <Textarea
        ref={(element) => {
          state.registerFieldRef(nodeId, element);
        }}
        value={typeof value === "string" ? value : asString(value)}
        onChange={(event) => {
          state.handleSetFormValue(field, event.target.value);
        }}
        onKeyDownCapture={stopFieldKeyPropagation}
        onKeyDown={stopFieldKeyPropagation}
        onBlur={() => {
          state.handleBlurFormField(field);
        }}
        placeholder={field.placeholder}
        aria-invalid={Boolean(field.error)}
        className="min-h-24 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] text-[14px] font-medium tracking-[-0.01em] text-foreground outline-none ring-1 ring-[var(--launcher-card-border)] transition-all placeholder:text-muted-foreground/40 placeholder:font-normal focus:bg-[var(--launcher-card-hover-bg)] focus:ring-[var(--ring)] border-none p-3 resize-none"
      />
      {field.error ? <p className="text-[11px] text-[var(--icon-red-fg)]">{field.error}</p> : null}
      {field.info ? <p className="text-[11px] text-muted-foreground">{field.info}</p> : null}
    </div>
  );
}

