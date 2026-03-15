import { FormField as ModuleFormField, FormView, SearchableDropdown } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RunnerIcon } from "@/modules/extensions/components/runner/nodes/shared/runner-icon";
import type { FormField as RunnerFormField } from "@/modules/extensions/components/runner/types";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { asString } from "@/modules/extensions/components/runner/utils";
import { cn } from "@/lib/utils";

import { RuntimeActionFooter } from "./runtime-action-footer";
import { readClassName, readStyle, stopFieldKeyPropagation } from "./utils";

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
        className="ext-form-field ext-form-checkbox-field rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 py-3"
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
          <Label className="ext-form-label text-[12px] font-medium text-muted-foreground">{field.title}</Label>
        }
        description={field.info}
        error={field.error}
        className="ext-form-field"
      >
        <SearchableDropdown
          value={typeof value === "string" ? value : asString(value)}
          placeholder={field.placeholder || "Select option"}
          searchPlaceholder="Filter options…"
          sections={(field.optionSections ?? [{ items: field.options }]).map((section) => ({
            title: section.title,
            items: section.items.map((option) => ({
              value: option.value,
              title: option.title,
              icon: option.icon ? <RunnerIcon icon={option.icon} className="size-4" /> : undefined,
            })),
          }))}
          className="ext-form-dropdown"
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
          <Label className="ext-form-label text-[12px] font-medium text-muted-foreground">{field.title}</Label>
        }
        description={field.info}
        error={field.error}
        className="ext-form-field"
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
          className="ext-form-input ext-form-textarea min-h-[120px] rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-[13px]"
        />
      </ModuleFormField>
    );
  }

  if (field.type === "Form.TagPicker" || field.type === "Form.FilePicker") {
    return (
      <ModuleFormField
        key={field.nodeId}
        label={
          <Label className="ext-form-label text-[12px] font-medium text-muted-foreground">{field.title}</Label>
        }
        description={field.info}
        error={field.error}
        className="ext-form-field"
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
          className="ext-form-input h-10 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-[13px]"
        />
      </ModuleFormField>
    );
  }

  const inputType = field.type === "Form.PasswordField" ? "password" : "text";

  return (
    <ModuleFormField
      key={field.nodeId}
      label={<Label className="ext-form-label text-[12px] font-medium text-muted-foreground">{field.title}</Label>}
      description={field.info}
      error={field.error}
      className="ext-form-field"
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
        className="ext-form-input h-10 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-[13px]"
      />
    </ModuleFormField>
  );
}

export function RuntimeFormView({ state }: RuntimeFormViewProps) {
  const rootNode = state.rootNode;
  if (!rootNode) {
    return null;
  }

  const className = readClassName(rootNode.props.className);
  const style = readStyle(rootNode.props.style);
  const contentClassName = readClassName(rootNode.props.contentClassName);
  const contentStyle = readStyle(rootNode.props.contentStyle);
  const maxWidthClassName = readClassName(rootNode.props.maxWidthClassName);
  const maxWidthStyle = readStyle(rootNode.props.maxWidthStyle);

  return (
    <FormView
      className={cn("ext-form-view", className)}
      style={style}
      contentClassName={cn("ext-form-content", contentClassName)}
      contentStyle={contentStyle}
      maxWidthClassName={cn("ext-form-width", maxWidthClassName)}
      maxWidthStyle={maxWidthStyle}
      footer={<RuntimeActionFooter state={state} actions={state.rootActions} />}
    >
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
              className={[
                "ext-form-description-card",
                "space-y-1.5 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-3",
                readClassName(child.props.className),
              ]
                .filter(Boolean)
                .join(" ")}
              style={readStyle(child.props.style)}
            >
              {title ? (
                <div
                  className={[
                    "text-[12px] font-medium text-muted-foreground",
                    "ext-form-description-title",
                    readClassName(child.props.titleClassName),
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {title}
                </div>
              ) : null}
              {text ? (
                <div
                  className={[
                    "text-[13px] leading-6 text-foreground",
                    "ext-form-description-text",
                    readClassName(child.props.textClassName),
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {text}
                </div>
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
              className={[
                "ext-form-link",
                "h-9 w-fit rounded-lg",
                readClassName(child.props.className),
              ]
                .filter(Boolean)
                .join(" ")}
              style={readStyle(child.props.style)}
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
    </FormView>
  );
}
