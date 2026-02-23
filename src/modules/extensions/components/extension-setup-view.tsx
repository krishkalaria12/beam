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

  // ... (keep existing form logic) ...

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      // ... (keep existing submit logic) ...
    },
  });

  // ... (keep existing effects) ...

  const renderField = (field: ExtensionPreferenceField) => {
    const label = field.required ? `${field.title} *` : field.title;

    if (field.type === "dropdown") {
      return (
        <form.Field
          key={field.name}
          name={field.name}
          children={(fieldApi) => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name} className="text-xs font-medium text-muted-foreground">{label}</Label>
              <Select
                value={toInputValue(fieldApi.state.value)}
                onValueChange={(nextValue) => {
                  setValidationError(null);
                  fieldApi.handleChange(nextValue ?? "");
                }}
              >
                <SelectTrigger
                  id={field.name}
                  className="h-9 rounded-lg border-white/10 bg-white/5 text-sm focus:ring-primary/50"
                  onKeyDown={stopFieldKeyPropagation}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-background/95 backdrop-blur-xl">
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
              <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 transition-colors hover:bg-white/10">
                <Checkbox
                  id={field.name}
                  checked={Boolean(fieldApi.state.value)}
                  onCheckedChange={(checked) => {
                    setValidationError(null);
                    fieldApi.handleChange(Boolean(checked));
                  }}
                  onKeyDown={stopFieldKeyPropagation}
                  className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                <Label htmlFor={field.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
              <Label htmlFor={field.name} className="text-xs font-medium text-muted-foreground">{label}</Label>
              <Textarea
                id={field.name}
                value={toInputValue(fieldApi.state.value)}
                onChange={(event) => {
                  setValidationError(null);
                  fieldApi.handleChange(event.target.value);
                }}
                onKeyDownCapture={stopFieldKeyPropagation}
                onKeyDown={stopFieldKeyPropagation}
                className="min-h-[100px] rounded-lg border-white/10 bg-white/5 text-sm focus:ring-primary/50"
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
            <Label htmlFor={field.name} className="text-xs font-medium text-muted-foreground">{label}</Label>
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
              className="h-9 rounded-lg border-white/10 bg-white/5 text-sm focus:ring-primary/50"
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
      <div className="relative z-10 flex shrink-0 items-center gap-3 border-b border-border/10 bg-background/20 px-4 py-3 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="size-8 rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">Extension Setup</p>
          <p className="truncate text-xs text-muted-foreground">
            {extensionTitle}
          </p>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
        {error || validationError ? (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              {error ?? validationError}
            </span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading extension preferences...
          </div>
        ) : fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-xs text-muted-foreground">
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

      <div className="relative flex items-center justify-between gap-3 border-t border-border/10 bg-background/20 p-4 backdrop-blur-md">
        <div className="text-[10px] text-muted-foreground/70">
          Preferences are saved locally.
        </div>
        <Button
          onClick={() => {
            void form.handleSubmit();
          }}
          disabled={!canSave}
          className="h-8 gap-1.5 rounded-lg bg-primary/90 hover:bg-primary"
        >
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save Setup
        </Button>
      </div>
    </div>
  );
}
