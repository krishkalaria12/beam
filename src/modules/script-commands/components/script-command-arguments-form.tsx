import { useForm } from "@tanstack/react-form";
import { AlertTriangle, Loader2, Play, Terminal } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandKeyHint } from "@/components/command/command-key-hint";
import {
  CommandPanelBackButton,
  CommandPanelHeader,
  CommandPanelTitleBlock,
} from "@/components/command/command-panel-header";
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
import type { ScriptCommandArgumentDefinition, ScriptCommandSummary } from "@/modules/script-commands/types";

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
        isMissingRequiredArgument(argument, value[argument.name]));
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
    <div className="glass-effect flex h-full w-full flex-col overflow-hidden text-foreground">
      <CommandPanelHeader>
        <CommandPanelBackButton onClick={onBack} aria-label="Back" />
        <CommandPanelTitleBlock
          title={`Run ${script.title}`}
          subtitle="Provide arguments before execution"
          className="flex-1"
        />
      </CommandPanelHeader>

      <div className="custom-scrollbar list-area min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <div className="rounded-xl border border-border/40 bg-background/10 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Script</p>
            <p className="mt-1 text-sm font-medium text-foreground">{script.title}</p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{script.scriptPath}</p>
          </div>

          <form
            id="script-command-arguments-form"
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
            onKeyDownCapture={handleSubmitShortcut}
            className="space-y-4"
          >
            {script.argumentDefinitions.map((argument) => {
              const label = resolveArgumentLabel(argument);

              return (
                <form.Field
                  key={`${script.id}:${argument.name}`}
                  name={argument.name}
                  children={(fieldApi) => (
                    <div className="rounded-xl border border-border/40 bg-background/10 p-4">
                      <Label
                        htmlFor={`script-argument-${argument.name}`}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        {label}
                        {argument.required ? <span className="ml-1 text-red-300">*</span> : null}
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
                              className="h-10"
                            >
                              <SelectValue placeholder={argument.placeholder || "Select value"} />
                            </SelectTrigger>
                            <SelectContent>
                              {argument.data.map((entry, index) => {
                                const value = entry.value ?? entry.title ?? "";
                                const title = entry.title ?? entry.value ?? value;
                                return (
                                  <SelectItem
                                    key={`${argument.name}:${index}:${value}`}
                                    value={value}
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
                            className="h-10 font-mono"
                            autoFocus={argument.index === 1}
                          />
                        )}
                      </div>
                    </div>
                  )}
                />
              );
            })}

            {(validationError || errorMessage) ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle className="size-3.5" />
                  {validationError ?? errorMessage}
                </span>
              </div>
            ) : null}
          </form>
        </div>
      </div>

      <CommandFooterBar
        className="h-[52px]"
        leftSlot={(
          <span className="inline-flex items-center gap-2">
            <Terminal className="size-3.5 text-muted-foreground/70" />
            {script.requiredArgumentCount > 0
              ? `${script.requiredArgumentCount} required argument(s)`
              : "All arguments are optional"}
          </span>
        )}
        rightSlot={(
          <>
            <CommandKeyHint keyLabel="ESC" label="Back" />
            <CommandKeyHint keyLabel="CMD/CTRL + ENTER" label="Run" />
            <Button
              onClick={() => {
                void form.handleSubmit();
              }}
              disabled={isSubmitting}
              className="h-8 gap-1.5 rounded-lg bg-primary/90 hover:bg-primary"
            >
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
              Run Script
            </Button>
          </>
        )}
      />
    </div>
  );
}
