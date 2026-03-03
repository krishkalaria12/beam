import { useForm } from "@tanstack/react-form";
import {
  AlertTriangle,
  ChevronLeft,
  FileCode2,
  FolderOpen,
  Loader2,
  Save,
  Terminal,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { z } from "zod";

import { Kbd } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { openScriptCommandsDirectory } from "@/modules/script-commands/api/open-script-commands-directory";
import { useScriptCommandsDirectoryQuery } from "@/modules/script-commands/hooks/use-script-commands-directory-query";
import type { CreateScriptCommandRequest } from "@/modules/script-commands/types";
import { toast } from "sonner";

const createScriptFormSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1, "File name is required.")
    .refine(
      (value) => !value.includes("/") && !value.includes("\\"),
      "File name cannot contain path separators.",
    ),
  content: z.string().trim().min(1, "Script content is required."),
  overwrite: z.boolean(),
  makeExecutable: z.boolean(),
});

const DEFAULT_SCRIPT_CONTENT = `#!/usr/bin/env bash

# Optional argument metadata (Beam reads Raycast-style argument definitions):
# @raycast.argument1 {"type":"text","placeholder":"Name","required":true}
# @raycast.argument2 {"type":"dropdown","placeholder":"Environment","required":false,"data":[{"title":"Dev","value":"dev"},{"title":"Prod","value":"prod"}]}

echo "Hello from Beam script command"
`;

interface ScriptCommandCreateFormProps {
  onBack: () => void;
  onSubmit: (request: CreateScriptCommandRequest) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

function stopFieldKeyPropagation(event: KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

function readFieldError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "Invalid value.";
}

export function ScriptCommandCreateForm({
  onBack,
  onSubmit,
  isSubmitting,
  errorMessage,
}: ScriptCommandCreateFormProps) {
  const directoryQuery = useScriptCommandsDirectoryQuery();

  const form = useForm({
    defaultValues: {
      fileName: "",
      content: DEFAULT_SCRIPT_CONTENT,
      overwrite: false,
      makeExecutable: true,
    },
    validators: {
      onChange: createScriptFormSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        ...value,
        fileName: value.fileName.trim(),
        content: value.content,
      });
    },
  });

  const handleOpenFolder = async () => {
    try {
      await openScriptCommandsDirectory();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open script folder.";
      toast.error(message);
    }
  };

  const handleSubmitShortcut = (event: KeyboardEvent<HTMLFormElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      void form.handleSubmit();
    }
  };

  return (
    <div className="scripts-create-enter flex h-full w-full flex-col overflow-hidden text-foreground">
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
          <FileCode2 className="size-5 text-[var(--icon-green-fg)]" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-semibold tracking-[-0.02em] text-foreground">
            Create Script Command
          </h1>
          <p className="text-[12px] text-muted-foreground tracking-[-0.01em]">
            Add a new script to your Beam commands folder
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="scripts-content-enter custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <form
          id="script-command-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
          onKeyDownCapture={handleSubmitShortcut}
          className="mx-auto flex w-full max-w-3xl flex-col gap-4"
        >
          {/* Scripts folder section */}
          <section className="rounded-xl bg-[var(--launcher-card-hover-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Scripts Folder
                </p>
                {directoryQuery.isLoading ? (
                  <p className="mt-1.5 inline-flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Resolving script commands directory...
                  </p>
                ) : directoryQuery.error ? (
                  <p className="mt-1.5 text-[12px] text-[var(--icon-red-fg)]">
                    Unable to load scripts directory.
                  </p>
                ) : (
                  <p className="mt-1.5 break-all font-mono text-[12px] text-muted-foreground">
                    {directoryQuery.data}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleOpenFolder()}
                className="flex h-9 items-center gap-2 rounded-lg bg-[var(--launcher-card-hover-bg)] px-3 text-[12px] font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
              >
                <FolderOpen className="size-3.5" />
                Open Folder
              </Button>
            </div>
          </section>

          {/* File name section */}
          <section className="rounded-xl bg-[var(--launcher-card-hover-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
            <form.Field
              name="fileName"
              children={(field) => (
                <div className="space-y-2">
                  <Label
                    htmlFor="script-file-name"
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    File Name
                  </Label>
                  <Input
                    id="script-file-name"
                    type="text"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onKeyDownCapture={stopFieldKeyPropagation}
                    onKeyDown={stopFieldKeyPropagation}
                    placeholder="example.sh"
                    className={cn(
                      "h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] px-4 font-mono text-[13px] text-foreground placeholder:text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 focus:outline-none focus:ring-[var(--ring)]",
                      field.state.meta.errors.length > 0 && "ring-[var(--icon-red-bg)]",
                    )}
                    autoFocus
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-[11px] text-[var(--icon-red-fg)]">
                      {readFieldError(field.state.meta.errors[0])}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Use a file name only, for example `deploy.sh` or `cleanup.py`.
                    </p>
                  )}
                </div>
              )}
            />
          </section>

          {/* Script content section */}
          <section className="rounded-xl bg-[var(--launcher-card-hover-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
            <form.Field
              name="content"
              children={(field) => (
                <div className="space-y-2">
                  <Label
                    htmlFor="script-content"
                    className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    <FileCode2 className="size-3.5" />
                    Script Content
                  </Label>
                  <Textarea
                    id="script-content"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onKeyDownCapture={stopFieldKeyPropagation}
                    onKeyDown={stopFieldKeyPropagation}
                    className={cn(
                      "min-h-[260px] w-full resize-y rounded-xl bg-[var(--launcher-card-hover-bg)] p-4 font-mono text-[12px] leading-relaxed text-foreground placeholder:text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 focus:outline-none focus:ring-[var(--ring)]",
                      field.state.meta.errors.length > 0 && "ring-[var(--icon-red-bg)]",
                    )}
                    placeholder="#!/usr/bin/env bash"
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-[11px] text-[var(--icon-red-fg)]">
                      {readFieldError(field.state.meta.errors[0])}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Add a shebang for portable execution and keep scripts self-contained.
                    </p>
                  )}
                </div>
              )}
            />
          </section>

          {/* Options grid */}
          <section className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="makeExecutable"
              children={(field) => (
                <div className="rounded-xl bg-[var(--launcher-card-hover-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="script-make-executable"
                      checked={Boolean(field.state.value)}
                      onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
                      onKeyDown={stopFieldKeyPropagation}
                      className="border-[var(--launcher-card-border)] data-[state=checked]:bg-[var(--ring)] data-[state=checked]:border-[var(--ring)]"
                    />
                    <Label
                      htmlFor="script-make-executable"
                      className="text-[13px] font-medium text-muted-foreground"
                    >
                      Mark file as executable
                    </Label>
                  </div>
                  <p className="mt-2 pl-7 text-[11px] text-muted-foreground">
                    Recommended for shell scripts that should run directly.
                  </p>
                </div>
              )}
            />

            <form.Field
              name="overwrite"
              children={(field) => (
                <div className="rounded-xl bg-[var(--launcher-card-hover-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="script-overwrite"
                      checked={Boolean(field.state.value)}
                      onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
                      onKeyDown={stopFieldKeyPropagation}
                      className="border-[var(--launcher-card-border)] data-[state=checked]:bg-[var(--ring)] data-[state=checked]:border-[var(--ring)]"
                    />
                    <Label
                      htmlFor="script-overwrite"
                      className="text-[13px] font-medium text-muted-foreground"
                    >
                      Overwrite if file exists
                    </Label>
                  </div>
                  <p className="mt-2 pl-7 text-[11px] text-muted-foreground">
                    Keep this off if you want Beam to block duplicate file names.
                  </p>
                </div>
              )}
            />
          </section>

          {/* Error message */}
          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-xl bg-[var(--icon-red-bg)] px-4 py-3 ring-1 ring-[var(--icon-red-bg)]">
              <AlertTriangle className="size-4 text-[var(--icon-red-fg)]" />
              <span className="text-[12px] text-[var(--icon-red-fg)]">{errorMessage}</span>
            </div>
          )}
        </form>
      </div>

      {/* Footer */}
      <footer className="scripts-footer-enter flex h-12 shrink-0 items-center justify-between border-t border-[var(--launcher-card-border)] px-4">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Terminal className="size-3.5" />
          <span>Script file will be created in your commands directory.</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Kbd className="rounded px-1.5 py-0.5 text-[10px]">
              Esc
            </Kbd>
            <span>Back</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Kbd className="rounded px-1.5 py-0.5 text-[10px]">
              ⌘↵
            </Kbd>
            <span>Create</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void form.handleSubmit()}
            disabled={isSubmitting}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--ring)]/20 px-3.5 text-[12px] font-medium text-[var(--ring)] transition-all duration-200 hover:bg-[var(--ring)]/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Create Script
          </Button>
        </div>
      </footer>
    </div>
  );
}
