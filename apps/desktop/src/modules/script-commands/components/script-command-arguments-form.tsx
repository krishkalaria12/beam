import { useForm } from "@tanstack/react-form";
import { AlertTriangle, ChevronLeft, Loader2, Play, Terminal } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";

import { ModuleFooter } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ScriptCommandArgumentDefinition,
  ScriptCommandSummary,
} from "@/modules/script-commands/types";

interface ScriptCommandArgumentsFormProps {
  script: ScriptCommandSummary;
  initialValues?: Record<string, string>;
  isSubmitting: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void>;
}

function stopFieldKeyPropagation(event: KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

function resolveArgumentLabel(argument: ScriptCommandArgumentDefinition): string {
  if (argument.title && argument.title.trim().length > 0) {
    return argument.title.trim();
  }
  if (argument.placeholder && argument.placeholder.trim().length > 0) {
    return argument.placeholder.trim();
  }
  return argument.name;
}

function normalizeInitialValues(
  script: ScriptCommandSummary,
  initialValues: Record<string, string> | undefined,
): Record<string, string> {
  const output: Record<string, string> = {};
  for (const argument of script.argumentDefinitions) {
    output[argument.name] = initialValues?.[argument.name] ?? "";
  }
  return output;
}

function isMissingRequiredArgument(
  argument: ScriptCommandArgumentDefinition,
  value: string | undefined,
): boolean {
  if (!argument.required) {
    return false;
  }
  return !value || value.trim().length === 0;
}

export function ScriptCommandArgumentsForm({
  script,
  initialValues,
  isSubmitting,
  errorMessage,
  onBack,
  onSubmit,
}: ScriptCommandArgumentsFormProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const defaultValues = useMemo(
    () => normalizeInitialValues(script, initialValues),
    [initialValues, script],
  );

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const missingRequired = script.argumentDefinitions.find((argument) =>
        isMissingRequiredArgument(argument, value[argument.name]),
      );
      if (missingRequired) {
        setValidationError(`"${resolveArgumentLabel(missingRequired)}" is required.`);
        return;
      }

      setValidationError(null);
      await onSubmit(value);
    },
  });

  const handleSubmitShortcut = (event: KeyboardEvent<HTMLFormElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      void form.handleSubmit();
    }
  };

  return (
    <div className="scripts-args-enter flex h-full w-full flex-col overflow-hidden text-foreground">
      {/* Header */}
      <header className="scripts-header-enter flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)] text-muted-foreground transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--launcher-card-bg)]">
          <Play className="size-5 text-[var(--icon-orange-fg)]" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-launcher-lg font-semibold tracking-[-0.02em] text-foreground">
            Run {script.title}
          </h1>
          <p className="text-launcher-sm text-muted-foreground tracking-[-0.01em]">
            Provide arguments before execution
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="scripts-content-enter custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          {/* Script info */}
          <div className="rounded-xl bg-[var(--launcher-card-hover-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
            <p className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Script
            </p>
            <p className="mt-1.5 text-launcher-lg font-medium text-foreground">{script.title}</p>
            <p className="mt-1 break-all font-mono text-launcher-xs text-muted-foreground">
              {script.scriptPath}
            </p>
          </div>

          {/* Arguments form */}
          <form
            id="script-command-arguments-form"
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
            onKeyDownCapture={handleSubmitShortcut}
            className="space-y-4"
          >
            {script.argumentDefinitions.map((argument, index) => {
              const label = resolveArgumentLabel(argument);

              return (
                <form.Field
                  key={`${script.id}:${argument.name}`}
                  name={argument.name}
                  children={(fieldApi) => (
                    <div
                      className="scripts-arg-field rounded-xl bg-[var(--launcher-card-hover-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <Label
                        htmlFor={`script-argument-${argument.name}`}
                        className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                      >
                        {label}
                        {argument.required && (
                          <span className="ml-1 text-[var(--icon-red-fg)]">*</span>
                        )}
                      </Label>

                      <div className="mt-2">
                        {argument.type === "dropdown" ? (
                          <Select
                            value={fieldApi.state.value ?? ""}
                            onValueChange={(nextValue) => {
                              setValidationError(null);
                              fieldApi.handleChange(nextValue ?? "");
                            }}
                          >
                            <SelectTrigger
                              id={`script-argument-${argument.name}`}
                              onKeyDown={stopFieldKeyPropagation}
                              className="h-10 rounded-xl border-0 bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)] text-launcher-md text-muted-foreground focus:ring-[var(--ring)]"
                            >
                              <SelectValue placeholder={argument.placeholder || "Select value"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-[var(--launcher-card-border)] bg-[var(--popover)]">
                              {argument.data.map((entry, idx) => {
                                const value = entry.value ?? entry.title ?? "";
                                const title = entry.title ?? entry.value ?? value;
                                return (
                                  <SelectItem
                                    key={`${argument.name}:${idx}:${value}`}
                                    value={value}
                                    className="text-launcher-sm text-muted-foreground focus:bg-[var(--launcher-card-hover-bg)] focus:text-foreground"
                                  >
                                    {title}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id={`script-argument-${argument.name}`}
                            type={argument.type === "password" ? "password" : "text"}
                            value={fieldApi.state.value ?? ""}
                            onChange={(event) => {
                              setValidationError(null);
                              fieldApi.handleChange(event.target.value);
                            }}
                            onKeyDown={stopFieldKeyPropagation}
                            onKeyDownCapture={stopFieldKeyPropagation}
                            placeholder={argument.placeholder || argument.name}
                            className="h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] px-4 font-mono text-launcher-md text-foreground placeholder:text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 focus:outline-none focus:ring-[var(--ring)]"
                            autoFocus={argument.index === 1}
                          />
                        )}
                      </div>
                    </div>
                  )}
                />
              );
            })}

            {/* Error message */}
            {(validationError || errorMessage) && (
              <div className="flex items-center gap-2.5 rounded-xl bg-[var(--icon-red-bg)] px-4 py-3 ring-1 ring-[var(--icon-red-bg)]">
                <AlertTriangle className="size-4 text-[var(--icon-red-fg)]" />
                <span className="text-launcher-sm text-[var(--icon-red-fg)]">
                  {validationError ?? errorMessage}
                </span>
              </div>
            )}
          </form>
        </div>
      </div>

      <ModuleFooter
        className="scripts-footer-enter border-[var(--launcher-card-border)]"
        leftSlot={
          <>
            <Terminal className="size-3.5" />
            <span>
              {script.requiredArgumentCount > 0
                ? `${script.requiredArgumentCount} required argument(s)`
                : "All arguments are optional"}
            </span>
          </>
        }
        shortcuts={[
          { keys: ["Esc"], label: "Back" },
          { keys: ["⌘↵"], label: "Run" },
        ]}
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void form.handleSubmit()}
            disabled={isSubmitting}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--ring)]/20 px-3.5 text-launcher-sm font-medium text-[var(--ring)] transition-all duration-200 hover:bg-[var(--ring)]/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Run Script
          </Button>
        }
      />
    </div>
  );
}
