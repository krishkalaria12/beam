import type { KeyboardEvent } from "react";

import { RunnerActionBar } from "@/modules/extensions/components/runner/runner-action-bar";
import type {
  FlattenedAction,
  FormDescriptionEntry,
  FormField,
  FormValue,
} from "@/modules/extensions/components/runner/types";
import type { ExtensionToast } from "@/modules/extensions/runtime/store";

interface RunnerFormPanelProps {
  formFields: FormField[];
  descriptions: FormDescriptionEntry[];
  formValues: Record<string, FormValue>;
  rootActions: FlattenedAction[];
  toast?: ExtensionToast;
  onSetValue: (field: FormField, value: FormValue) => void;
  onToastAction: (toastId: number, actionType: "primary" | "secondary") => void;
  onToastHide: (toastId: number) => void;
  onExecuteAction: (action: FlattenedAction) => void;
  onRegisterFieldRef: (nodeId: number, element: HTMLElement | null) => void;
}

export function RunnerFormPanel({
  formFields,
  descriptions,
  formValues,
  rootActions,
  toast,
  onSetValue,
  onToastAction,
  onToastHide,
  onExecuteAction,
  onRegisterFieldRef,
}: RunnerFormPanelProps) {
  const stopFieldKeyPropagation = (event: KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const renderField = (field: FormField) => {
    const value = formValues[field.key];

    if (field.type === "Form.TextField") {
      return (
        <div key={field.nodeId} className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{field.title}</label>
          <input
            ref={(element) => onRegisterFieldRef(field.nodeId, element)}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onSetValue(field, event.target.value)}
            onKeyDownCapture={stopFieldKeyPropagation}
            onKeyDown={stopFieldKeyPropagation}
            placeholder={field.placeholder}
            readOnly={!field.hasOnChange}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      );
    }

    if (field.type === "Form.TextArea") {
      return (
        <div key={field.nodeId} className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{field.title}</label>
          <textarea
            ref={(element) => onRegisterFieldRef(field.nodeId, element)}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onSetValue(field, event.target.value)}
            onKeyDownCapture={stopFieldKeyPropagation}
            onKeyDown={stopFieldKeyPropagation}
            placeholder={field.placeholder}
            readOnly={!field.hasOnChange}
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      );
    }

    if (field.type === "Form.Dropdown") {
      return (
        <div key={field.nodeId} className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{field.title}</label>
          <select
            ref={(element) => onRegisterFieldRef(field.nodeId, element)}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onSetValue(field, event.target.value)}
            onKeyDownCapture={stopFieldKeyPropagation}
            onKeyDown={stopFieldKeyPropagation}
            disabled={!field.hasOnChange}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {field.options.map((option) => (
              <option key={`${field.nodeId}:${option.value}`} value={option.value}>
                {option.title}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === "Form.Checkbox") {
      return (
        <label key={field.nodeId} className="flex items-center gap-2 text-sm">
          <input
            ref={(element) => onRegisterFieldRef(field.nodeId, element)}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onSetValue(field, event.target.checked)}
            onKeyDownCapture={stopFieldKeyPropagation}
            onKeyDown={stopFieldKeyPropagation}
            disabled={!field.hasOnChange}
            className="size-4 rounded border-input"
          />
          <span>{field.title}</span>
        </label>
      );
    }

    return null;
  };

  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {formFields.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
            No form fields available.
          </div>
        ) : (
          formFields.map((field) => renderField(field))
        )}
        {descriptions.map((entry) => (
          <div
            key={entry.nodeId}
            className="space-y-1 rounded-md border border-border/60 bg-card px-3 py-2"
          >
            <p className="text-xs font-medium text-muted-foreground">{entry.title}</p>
            <p className="text-sm">{entry.text || "-"}</p>
          </div>
        ))}
      </div>
      <RunnerActionBar
        actions={rootActions}
        toast={toast}
        onToastAction={onToastAction}
        onToastHide={onToastHide}
        onExecuteAction={onExecuteAction}
      />
    </>
  );
}
