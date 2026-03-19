import { Loader2, Save } from "lucide-react";
import type { KeyboardEvent } from "react";

import { FormField, SearchableDropdown } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ExtensionPreferenceField } from "@/modules/extensions/types";

function stopFieldKeyPropagation(event: KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
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

interface PreferenceEditorProps {
  fields: ExtensionPreferenceField[];
  values: Record<string, unknown>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  validationError: string | null;
  onChange: (key: string, value: unknown) => void;
  onSave: () => Promise<void>;
}

export function PreferenceEditor({
  fields,
  values,
  isLoading,
  isSaving,
  error,
  validationError,
  onChange,
  onSave,
}: PreferenceEditorProps) {
  const renderField = (field: ExtensionPreferenceField) => {
    const label = field.required ? `${field.title} *` : field.title;
    const value = values[field.name];

    if (field.type === "dropdown") {
      return (
        <FormField
          key={field.name}
          label={<Label className="text-launcher-sm font-medium text-muted-foreground">{label}</Label>}
          description={field.description}
        >
          <SearchableDropdown
            value={toInputValue(value)}
            placeholder={field.title}
            sections={[
              {
                items: field.options.map((option) => ({
                  value: option.value,
                  title: option.title,
                })),
              },
            ]}
            onValueChange={(nextValue) => onChange(field.name, nextValue)}
          />
        </FormField>
      );
    }

    if (field.type === "checkbox") {
      return (
        <div
          key={field.name}
          className="space-y-2 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 py-3"
        >
          <div className="flex items-center gap-3">
            <Checkbox
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(field.name, Boolean(checked))}
            />
            <Label className="text-launcher-md font-medium text-foreground">{label}</Label>
          </div>
          {field.description ? (
            <p className="text-launcher-xs text-muted-foreground">{field.description}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <FormField
          key={field.name}
          label={<Label className="text-launcher-sm font-medium text-muted-foreground">{label}</Label>}
          description={field.description}
        >
          <Textarea
            value={toInputValue(value)}
            onChange={(event) => onChange(field.name, event.target.value)}
            onKeyDownCapture={stopFieldKeyPropagation}
            onKeyDown={stopFieldKeyPropagation}
            className="min-h-[110px] rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-launcher-md"
          />
        </FormField>
      );
    }

    return (
      <FormField
        key={field.name}
        label={<Label className="text-launcher-sm font-medium text-muted-foreground">{label}</Label>}
        description={field.description}
      >
        <Input
          type={field.type === "password" ? "password" : "text"}
          value={toInputValue(value)}
          onChange={(event) => onChange(field.name, event.target.value)}
          onKeyDownCapture={stopFieldKeyPropagation}
          onKeyDown={stopFieldKeyPropagation}
          className="h-10 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-launcher-md"
        />
      </FormField>
    );
  };

  return (
    <section className="space-y-3 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-launcher-md font-medium text-foreground">Preferences</h3>
          <p className="text-launcher-sm text-muted-foreground">Extension-level configuration.</p>
        </div>
        <Button
          size="sm"
          onClick={() => void onSave()}
          disabled={isLoading || isSaving || fields.length === 0}
        >
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </Button>
      </div>

      {error || validationError ? (
        <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-3 py-2 text-launcher-sm text-[var(--icon-red-fg)]">
          {validationError || error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-launcher-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading preferences…
        </div>
      ) : fields.length === 0 ? (
        <div className="text-launcher-sm text-muted-foreground">
          No preferences declared by this extension.
        </div>
      ) : (
        <div className="space-y-3">{fields.map(renderField)}</div>
      )}
    </section>
  );
}
