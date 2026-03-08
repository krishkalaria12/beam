import { useForm } from "@tanstack/react-form";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { useEffect, useState, type KeyboardEvent } from "react";

import { ModuleFooter, ModuleHeader } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ExtensionPreferenceField } from "@/modules/extensions/types";

interface ExtensionSetupViewProps {
  extensionTitle: string;
  pluginName: string;
  fields: ExtensionPreferenceField[];
  initialValues: Record<string, unknown>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  onBack: () => void;
  onSave: (values: Record<string, unknown>) => Promise<void>;
}

function toInputValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return "";
  }
  return String(value);
}

function stopFieldKeyPropagation(event: KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

function isMissingRequiredField(field: ExtensionPreferenceField, value: unknown): boolean {
  if (!field.required) {
    return false;
  }

  if (field.type === "checkbox") {
    return value !== true;
  }

  return toInputValue(value).trim().length === 0;
}

export function ExtensionSetupView({
  extensionTitle,
  pluginName,
  fields,
  initialValues,
  isLoading,
  isSaving,
  error,
  onBack,
  onSave,
}: ExtensionSetupViewProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      const missingRequiredField = fields.find((field) =>
        isMissingRequiredField(field, value[field.name]),
      );
      if (missingRequiredField) {
        setValidationError(`"${missingRequiredField.title}" is required.`);
        return;
      }

      setValidationError(null);
      await onSave(value);
    },
  });

  useEffect(() => {
    form.reset(initialValues);
    setValidationError(null);
  }, [form, initialValues, pluginName]);

  const canSave = !isSaving && !isLoading && fields.length > 0;

  const renderField = (field: ExtensionPreferenceField) => {
    const label = field.required ? `${field.title} *` : field.title;

    if (field.type === "dropdown") {
      return (
        <form.Field
          key={field.name}
          name={field.name}
          children={(fieldApi) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name} className="text-xs font-medium text-muted-foreground">
                {label}
              </Label>
              <Select
                value={toInputValue(fieldApi.state.value)}
                onValueChange={(nextValue) => {
                  setValidationError(null);
                  fieldApi.handleChange(nextValue ?? "");
                }}
              >
                <SelectTrigger
                  id={field.name}
                  className="h-10 rounded-xl bg-[var(--launcher-card-hover-bg)] text-[14px] font-medium tracking-[-0.01em] text-foreground outline-none ring-1 ring-[var(--launcher-card-border)] transition-all placeholder:text-muted-foreground/40 placeholder:font-normal focus:bg-[var(--launcher-card-hover-bg)] focus:ring-[var(--ring)] border-none"
                  onKeyDown={stopFieldKeyPropagation}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--popover)] shadow-xl">
                  {field.options.map((option) => (
                    <SelectItem key={`${field.name}:${option.value}`} value={option.value}>
                      {option.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.description ? (
                <p className="text-[10px] text-muted-foreground/70">{field.description}</p>
              ) : null}
            </div>
          )}
        />
      );
    }

    if (field.type === "checkbox") {
      return (
        <form.Field
          key={field.name}
          name={field.name}
          children={(fieldApi) => (
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] px-3 py-3 transition-colors">
                <Checkbox
                  id={field.name}
                  checked={Boolean(fieldApi.state.value)}
                  onCheckedChange={(checked) => {
                    setValidationError(null);
                    fieldApi.handleChange(Boolean(checked));
                  }}
                  onKeyDown={stopFieldKeyPropagation}
                  className="border-[var(--launcher-card-border)] data-[state=checked]:bg-[var(--ring)] data-[state=checked]:text-[var(--background)] data-[state=checked]:border-[var(--ring)]"
                />
                <Label
                  htmlFor={field.name}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {label}
                </Label>
              </div>
              {field.description ? (
                <p className="px-1 text-[10px] text-muted-foreground/70">{field.description}</p>
              ) : null}
            </div>
          )}
        />
      );
    }

    if (field.type === "textarea") {
      return (
        <form.Field
          key={field.name}
          name={field.name}
          children={(fieldApi) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name} className="text-xs font-medium text-muted-foreground">
                {label}
              </Label>
              <Textarea
                id={field.name}
                value={toInputValue(fieldApi.state.value)}
                onChange={(event) => {
                  setValidationError(null);
                  fieldApi.handleChange(event.target.value);
                }}
                onKeyDownCapture={stopFieldKeyPropagation}
                onKeyDown={stopFieldKeyPropagation}
                className="min-h-[100px] rounded-xl bg-[var(--launcher-card-hover-bg)] text-[14px] font-medium tracking-[-0.01em] text-foreground outline-none ring-1 ring-[var(--launcher-card-border)] transition-all placeholder:text-muted-foreground/40 placeholder:font-normal focus:bg-[var(--launcher-card-hover-bg)] focus:ring-[var(--ring)] border-none p-3 resize-none"
              />
              {field.description ? (
                <p className="text-[10px] text-muted-foreground/70">{field.description}</p>
              ) : null}
            </div>
          )}
        />
      );
    }

    return (
      <form.Field
        key={field.name}
        name={field.name}
        children={(fieldApi) => (
          <div className="space-y-1.5">
            <Label htmlFor={field.name} className="text-xs font-medium text-muted-foreground">
              {label}
            </Label>
            <Input
              id={field.name}
              type={field.type === "password" ? "password" : "text"}
              value={toInputValue(fieldApi.state.value)}
              onChange={(event) => {
                setValidationError(null);
                fieldApi.handleChange(event.target.value);
              }}
              onKeyDownCapture={stopFieldKeyPropagation}
              onKeyDown={stopFieldKeyPropagation}
              className="h-10 rounded-xl bg-[var(--launcher-card-hover-bg)] text-[14px] font-medium tracking-[-0.01em] text-foreground outline-none ring-1 ring-[var(--launcher-card-border)] transition-all placeholder:text-muted-foreground/40 placeholder:font-normal focus:bg-[var(--launcher-card-hover-bg)] focus:ring-[var(--ring)] border-none"
            />
            {field.description ? (
              <p className="text-[10px] text-muted-foreground/70">{field.description}</p>
            ) : null}
          </div>
        )}
      />
    );
  };

  return (
    <div className="glass-effect flex h-full w-full flex-col overflow-hidden text-foreground">
      <ModuleHeader
        onBack={onBack}
        title="Extension Setup"
        subtitle={extensionTitle}
      />

      <div className="relative custom-scrollbar list-area min-h-0 flex-1 overflow-y-auto p-4">
        {error || validationError ? (
          <div className="mb-4 rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] p-3 text-xs text-[var(--icon-red-fg)]">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              {error ?? validationError}
            </span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4 text-[12px] text-muted-foreground m-2">
            <Loader2 className="size-3.5 animate-spin" />
            Loading extension preferences...
          </div>
        ) : fields.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4 text-[12px] text-muted-foreground m-2">
            This extension does not expose configurable preferences.
          </div>
        ) : (
          <form
            id="extension-setup-form"
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
            className="space-y-5"
          >
            {fields.map((field) => renderField(field))}
          </form>
        )}
      </div>

      <ModuleFooter
        leftSlot={<span>Preferences are saved locally.</span>}
        shortcuts={[{ keys: ["Esc"], label: "Back" }]}
        actions={
          <Button
            onClick={() => {
              void form.handleSubmit();
            }}
            disabled={!canSave}
            className="h-8 gap-1.5 rounded-lg bg-primary/90 hover:bg-primary"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save Setup
          </Button>
        }
      />
    </div>
  );
}

