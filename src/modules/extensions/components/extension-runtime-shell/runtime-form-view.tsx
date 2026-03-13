import { FormField as ModuleFormField, SearchableDropdown } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormField as RunnerFormField } from "@/modules/extensions/components/runner/types";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { asString } from "@/modules/extensions/components/runner/utils";

import { RuntimeActionFooter } from "./runtime-action-footer";
import { stopFieldKeyPropagation } from "./utils";

interface RuntimeFormViewProps {
  state: UseExtensionRunnerStateResult;
}

function renderFormField(state: UseExtensionRunnerStateResult, field: RunnerFormField) {
  const node = state.uiTree.get(field.nodeId);
  if (!node) {
    return null;
  }

  const value = state.formValues[field.key];

  if (field.type === "Form.Checkbox") {
    return (
      <ModuleFormField
        key={field.nodeId}
        description={field.info}
        error={field.error}
        className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 py-3"
      >
        <div className="flex items-center gap-3">
          <Checkbox
            ref={(element) => {
              state.registerFieldRef(field.nodeId, element);
            }}
            checked={Boolean(value)}
            onCheckedChange={(checked) => {
              state.handleSetFormValue(field, Boolean(checked));
            }}
            onBlur={() => {
              state.handleBlurFormField(field);
            }}
          />
          <Label className="text-[13px] font-medium text-foreground">{field.title}</Label>
        </div>
      </ModuleFormField>
    );
  }

  if (field.type === "Form.Dropdown") {
    return (
      <ModuleFormField
        key={field.nodeId}
        label={
          <Label className="text-[12px] font-medium text-muted-foreground">{field.title}</Label>
        }
        description={field.info}
        error={field.error}
      >
        <SearchableDropdown
          value={typeof value === "string" ? value : asString(value)}
          placeholder={field.placeholder || "Select option"}
          searchPlaceholder="Filter options…"
          sections={[
            {
              items: field.options.map((option) => ({
                value: option.value,
                title: option.title,
              })),
            },
          ]}
          onValueChange={(nextValue) => {
            state.handleSetFormValue(field, nextValue);
            state.handleBlurFormField(field);
          }}
        />
      </ModuleFormField>
    );
  }

  if (field.type === "Form.TextArea") {
    return (
      <ModuleFormField
        key={field.nodeId}
        label={
          <Label className="text-[12px] font-medium text-muted-foreground">{field.title}</Label>
        }
        description={field.info}
        error={field.error}
      >
        <Textarea
          ref={(element) => {
            state.registerFieldRef(field.nodeId, element);
          }}
          value={typeof value === "string" ? value : asString(value)}
          placeholder={field.placeholder}
          onChange={(event) => {
            state.handleSetFormValue(field, event.target.value);
          }}
          onKeyDownCapture={stopFieldKeyPropagation}
          onKeyDown={stopFieldKeyPropagation}
          onBlur={() => {
            state.handleBlurFormField(field);
          }}
          className="min-h-[120px] rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-[13px]"
        />
      </ModuleFormField>
    );
  }

  if (field.type === "Form.TagPicker" || field.type === "Form.FilePicker") {
    return (
      <ModuleFormField
        key={field.nodeId}
        label={
          <Label className="text-[12px] font-medium text-muted-foreground">{field.title}</Label>
        }
        description={field.info}
        error={field.error}
      >
        <Input
          ref={(element) => {
            state.registerFieldRef(field.nodeId, element);
          }}
          value={Array.isArray(value) ? value.join(", ") : asString(value)}
          placeholder={field.placeholder}
          onChange={(event) => {
            const nextValues = event.target.value
              .split(",")
              .map((part) => part.trim())
              .filter((part) => part.length > 0);
            state.handleSetFormValue(field, nextValues);
          }}
          onKeyDownCapture={stopFieldKeyPropagation}
          onKeyDown={stopFieldKeyPropagation}
          onBlur={() => {
            state.handleBlurFormField(field);
          }}
          className="h-10 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-[13px]"
        />
      </ModuleFormField>
    );
  }

  const inputType = field.type === "Form.PasswordField" ? "password" : "text";

  return (
    <ModuleFormField
      key={field.nodeId}
      label={<Label className="text-[12px] font-medium text-muted-foreground">{field.title}</Label>}
      description={field.info}
      error={field.error}
    >
      <Input
        ref={(element) => {
          state.registerFieldRef(field.nodeId, element);
        }}
        type={inputType}
        value={typeof value === "string" ? value : asString(value)}
        placeholder={field.placeholder}
        onChange={(event) => {
          state.handleSetFormValue(field, event.target.value);
        }}
        onKeyDownCapture={stopFieldKeyPropagation}
        onKeyDown={stopFieldKeyPropagation}
        onBlur={() => {
          state.handleBlurFormField(field);
        }}
        className="h-10 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-[13px]"
      />
    </ModuleFormField>
  );
}

export function RuntimeFormView({ state }: RuntimeFormViewProps) {
  const rootNode = state.rootNode;
  if (!rootNode) {
    return null;
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-2xl space-y-4">
          {rootNode.children.map((childId) => {
            const child = state.uiTree.get(childId);
            if (!child) {
              return null;
            }

            if (child.type === "Form.Description") {
              const title = asString(child.props.title).trim();
              const text = asString(child.props.text).trim();
              return (
                <div
                  key={child.id}
                  className="space-y-1.5 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-3"
                >
                  {title ? (
                    <div className="text-[12px] font-medium text-muted-foreground">{title}</div>
                  ) : null}
                  {text ? (
                    <div className="text-[13px] leading-6 text-foreground">{text}</div>
                  ) : null}
                </div>
              );
            }

            if (child.type === "Form.LinkAccessory") {
              const text = asString(child.props.text).trim() || "Open";
              const target = asString(child.props.target).trim();
              if (!target) {
                return null;
              }

              return (
                <Button
                  key={child.id}
                  type="button"
                  variant="outline"
                  className="h-9 w-fit rounded-lg"
                  onClick={() => {
                    window.open(target, "_blank", "noopener,noreferrer");
                  }}
                >
                  {text}
                </Button>
              );
            }

            const field = state.formFieldByNodeId.get(child.id);
            return field ? renderFormField(state, field) : null;
          })}
        </div>
      </div>

      <RuntimeActionFooter state={state} actions={state.rootActions} />
    </>
  );
}
