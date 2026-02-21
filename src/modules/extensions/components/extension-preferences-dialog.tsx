import { type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export type ExtensionPreferenceFieldType =
  | "textfield"
  | "password"
  | "dropdown"
  | "checkbox"
  | "textarea";

export interface ExtensionPreferenceOption {
  title: string;
  value: string;
}

export interface ExtensionPreferenceField {
  name: string;
  type: ExtensionPreferenceFieldType;
  title: string;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
  options: ExtensionPreferenceOption[];
}

interface ExtensionPreferencesDialogProps {
  open: boolean;
  extensionTitle: string;
  pluginName: string;
  fields: ExtensionPreferenceField[];
  values: Record<string, unknown>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onValueChange: (name: string, value: unknown) => void;
  onSave: () => void;
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

export function ExtensionPreferencesDialog({
  open,
  extensionTitle,
  pluginName,
  fields,
  values,
  isLoading,
  isSaving,
  error,
  onOpenChange,
  onValueChange,
  onSave,
}: ExtensionPreferencesDialogProps) {
  const renderField = (field: ExtensionPreferenceField) => {
    const value = values[field.name];
    const label = field.required ? `${field.title} *` : field.title;

    if (field.type === "dropdown") {
      return (
        <div key={field.name} className="space-y-1.5">
          <Label htmlFor={field.name}>{label}</Label>
          <Select
            value={toInputValue(value)}
            onValueChange={(nextValue) => {
              onValueChange(field.name, nextValue ?? "");
            }}
          >
            <SelectTrigger
              id={field.name}
              className="h-8 w-full"
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
      );
    }

    if (field.type === "checkbox") {
      return (
        <div key={field.name} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.name}
              checked={Boolean(value)}
              onCheckedChange={(checked) => onValueChange(field.name, Boolean(checked))}
              onKeyDown={stopFieldKeyPropagation}
            />
            <Label htmlFor={field.name}>{label}</Label>
          </div>
          {field.description ? (
            <p className="text-[11px] text-muted-foreground">{field.description}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.name} className="space-y-1.5">
          <Label htmlFor={field.name}>{label}</Label>
          <Textarea
            id={field.name}
            value={toInputValue(value)}
            onChange={(event) => onValueChange(field.name, event.target.value)}
            onKeyDown={stopFieldKeyPropagation}
          />
          {field.description ? (
            <p className="text-[11px] text-muted-foreground">{field.description}</p>
          ) : null}
        </div>
      );
    }

    return (
      <div key={field.name} className="space-y-1.5">
        <Label htmlFor={field.name}>{label}</Label>
        <Input
          id={field.name}
          type={field.type === "password" ? "password" : "text"}
          value={toInputValue(value)}
          onChange={(event) => onValueChange(field.name, event.target.value)}
          onKeyDown={stopFieldKeyPropagation}
          className="h-8"
        />
        {field.description ? (
          <p className="text-[11px] text-muted-foreground">{field.description}</p>
        ) : null}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0" showCloseButton>
        <DialogHeader className="border-b border-border/50 px-4 py-3">
          <DialogTitle>Extension Setup</DialogTitle>
          <DialogDescription>
            {extensionTitle} ({pluginName})
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 max-h-[52vh] space-y-3 overflow-y-auto px-4 py-3">
          {error ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-600">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading preferences...
            </div>
          ) : fields.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              This extension does not expose configurable preferences.
            </div>
          ) : (
            fields.map((field) => renderField(field))
          )}
        </div>

        <DialogFooter className="border-t border-border/50 px-4 py-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="h-8"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isLoading || isSaving || fields.length === 0}
            className="h-8 gap-1.5"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
