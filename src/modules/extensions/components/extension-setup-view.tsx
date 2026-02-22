import { useForm } from "@tanstack/react-form";
import { AlertTriangle, ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect, useState, type KeyboardEvent } from "react";

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

  const canSave = !isLoading && !isSaving && fields.length > 0;

  const renderField = (field: ExtensionPreferenceField) => {
    const label = field.required ? `${field.title} *` : field.title;

    if (field.type === "dropdown") {
      return (
        <form.Field
          key={field.name}
          name={field.name}
          children={(fieldApi) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name}>{label}</Label>
              <Select
                value={toInputValue(fieldApi.state.value)}
                onValueChange={(nextValue) => {
                  setValidationError(null);
                  fieldApi.handleChange(nextValue ?? "");
                }}
              >
                <SelectTrigger
                  id={field.name}
                  className="h-9 rounded-xl border-border/70 bg-background/50"
                  onKeyDown={stopFieldKeyPropagation}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={`${field.name}:${option.value}`} value={option.value}>
                      {option.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.description ? (
                <p className="text-[11px] text-muted-foreground">{field.description}</p>
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
              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/35 px-3 py-2">
                <Checkbox
                  id={field.name}
                  checked={Boolean(fieldApi.state.value)}
                  onCheckedChange={(checked) => {
                    setValidationError(null);
                    fieldApi.handleChange(Boolean(checked));
                  }}
                  onKeyDown={stopFieldKeyPropagation}
                />
                <Label htmlFor={field.name} className="text-sm">
                  {label}
                </Label>
              </div>
              {field.description ? (
                <p className="text-[11px] text-muted-foreground">{field.description}</p>
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
              <Label htmlFor={field.name}>{label}</Label>
              <Textarea
                id={field.name}
                value={toInputValue(fieldApi.state.value)}
                onChange={(event) => {
                  setValidationError(null);
                  fieldApi.handleChange(event.target.value);
                }}
                onKeyDownCapture={stopFieldKeyPropagation}
                onKeyDown={stopFieldKeyPropagation}
                className="min-h-28 rounded-xl border-border/70 bg-background/50"
              />
              {field.description ? (
                <p className="text-[11px] text-muted-foreground">{field.description}</p>
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
            <Label htmlFor={field.name}>{label}</Label>
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
              className="h-9 rounded-xl border-border/70 bg-background/50"
            />
            {field.description ? (
              <p className="text-[11px] text-muted-foreground">{field.description}</p>
            ) : null}
          </div>
        )}
      />
    );
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background/95 text-foreground backdrop-blur-3xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(86,164,255,0.12),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(126,255,214,0.08),transparent_48%)]" />

      <div className="relative border-b border-border/40 bg-background/55 px-3 py-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="size-8 rounded-full border border-border/60 bg-background/55"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight">Extension Setup</p>
            <p className="truncate text-xs text-muted-foreground">
              {extensionTitle} ({pluginName})
            </p>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto p-3">
        {error || validationError ? (
          <div className="mb-3 rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-xs text-red-500">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              {error ?? validationError}
            </span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/35 p-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading extension preferences...
          </div>
        ) : fields.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-background/35 p-3 text-xs text-muted-foreground">
            This extension does not expose configurable preferences.
          </div>
        ) : (
          <form
            id="extension-setup-form"
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
            className="space-y-4"
          >
            {fields.map((field) => renderField(field))}
          </form>
        )}
      </div>

      <div className="relative flex items-center justify-between gap-3 border-t border-border/40 bg-background/55 p-3 backdrop-blur-xl">
        <div className="text-xs text-muted-foreground">
          Preferences are saved for this extension instance.
        </div>
        <Button
          onClick={() => {
            void form.handleSubmit();
          }}
          disabled={!canSave}
          className="h-8 gap-1.5 rounded-lg"
        >
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save Setup
        </Button>
      </div>
    </div>
  );
}
