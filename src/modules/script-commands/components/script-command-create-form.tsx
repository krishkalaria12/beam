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

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
    <div className="scripts-create-enter flex h-full w-full flex-col overflow-hidden text-white">
      {/* Header */}
      <header className="scripts-header-enter flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] px-4">
        <button
          type="button"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-lg bg-white/[0.03] text-white/40 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/70"
          aria-label="Back"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
          <FileCode2 className="size-5 text-emerald-400" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-semibold tracking-[-0.02em] text-white/90">
            Create Script Command
          </h1>
          <p className="text-[12px] text-white/40 tracking-[-0.01em]">
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
          <section className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
                  Scripts Folder
                </p>
                {directoryQuery.isLoading ? (
                  <p className="mt-1.5 inline-flex items-center gap-2 text-[12px] text-white/50">
                    <Loader2 className="size-3.5 animate-spin" />
                    Resolving script commands directory...
                  </p>
                ) : directoryQuery.error ? (
                  <p className="mt-1.5 text-[12px] text-red-400">
                    Unable to load scripts directory.
                  </p>
                ) : (
                  <p className="mt-1.5 break-all font-mono text-[12px] text-white/70">
                    {directoryQuery.data}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleOpenFolder()}
                className="flex h-9 items-center gap-2 rounded-lg bg-white/[0.04] px-3 text-[12px] font-medium text-white/70 ring-1 ring-white/[0.06] transition-all duration-200 hover:bg-white/[0.06] hover:text-white/90"
              >
                <FolderOpen className="size-3.5" />
                Open Folder
              </button>
            </div>
          </section>

          {/* File name section */}
          <section className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
            <form.Field
              name="fileName"
              children={(field) => (
                <div className="space-y-2">
                  <Label
                    htmlFor="script-file-name"
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45"
                  >
                    File Name
                  </Label>
                  <input
                    id="script-file-name"
                    type="text"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onKeyDownCapture={stopFieldKeyPropagation}
                    onKeyDown={stopFieldKeyPropagation}
                    placeholder="example.sh"
                    className={cn(
                      "h-10 w-full rounded-xl bg-white/[0.04] px-4 font-mono text-[13px] text-white/90 placeholder:text-white/30 ring-1 ring-white/[0.06] transition-all duration-200 focus:outline-none focus:ring-[var(--solid-accent,#4ea2ff)]",
                      field.state.meta.errors.length > 0 && "ring-red-500/50",
                    )}
                    autoFocus
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-[11px] text-red-400">
                      {readFieldError(field.state.meta.errors[0])}
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/40">
                      Use a file name only, for example `deploy.sh` or `cleanup.py`.
                    </p>
                  )}
                </div>
              )}
            />
          </section>

          {/* Script content section */}
          <section className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
            <form.Field
              name="content"
              children={(field) => (
                <div className="space-y-2">
                  <Label
                    htmlFor="script-content"
                    className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45"
                  >
                    <FileCode2 className="size-3.5" />
                    Script Content
                  </Label>
                  <textarea
                    id="script-content"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onKeyDownCapture={stopFieldKeyPropagation}
                    onKeyDown={stopFieldKeyPropagation}
                    className={cn(
                      "min-h-[260px] w-full resize-y rounded-xl bg-white/[0.04] p-4 font-mono text-[12px] leading-relaxed text-white/90 placeholder:text-white/30 ring-1 ring-white/[0.06] transition-all duration-200 focus:outline-none focus:ring-[var(--solid-accent,#4ea2ff)]",
                      field.state.meta.errors.length > 0 && "ring-red-500/50",
                    )}
                    placeholder="#!/usr/bin/env bash"
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-[11px] text-red-400">
                      {readFieldError(field.state.meta.errors[0])}
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/40">
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
                <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="script-make-executable"
                      checked={Boolean(field.state.value)}
                      onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
                      onKeyDown={stopFieldKeyPropagation}
                      className="border-white/20 data-[state=checked]:bg-[var(--solid-accent,#4ea2ff)] data-[state=checked]:border-[var(--solid-accent,#4ea2ff)]"
                    />
                    <Label
                      htmlFor="script-make-executable"
                      className="text-[13px] font-medium text-white/80"
                    >
                      Mark file as executable
                    </Label>
                  </div>
                  <p className="mt-2 pl-7 text-[11px] text-white/40">
                    Recommended for shell scripts that should run directly.
                  </p>
                </div>
              )}
            />

            <form.Field
              name="overwrite"
              children={(field) => (
                <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="script-overwrite"
                      checked={Boolean(field.state.value)}
                      onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
                      onKeyDown={stopFieldKeyPropagation}
                      className="border-white/20 data-[state=checked]:bg-[var(--solid-accent,#4ea2ff)] data-[state=checked]:border-[var(--solid-accent,#4ea2ff)]"
                    />
                    <Label
                      htmlFor="script-overwrite"
                      className="text-[13px] font-medium text-white/80"
                    >
                      Overwrite if file exists
                    </Label>
                  </div>
                  <p className="mt-2 pl-7 text-[11px] text-white/40">
                    Keep this off if you want Beam to block duplicate file names.
                  </p>
                </div>
              )}
            />
          </section>

          {/* Error message */}
          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 px-4 py-3 ring-1 ring-red-500/20">
              <AlertTriangle className="size-4 text-red-400" />
              <span className="text-[12px] text-red-300">{errorMessage}</span>
            </div>
          )}
        </form>
      </div>

      {/* Footer */}
      <footer className="scripts-footer-enter flex h-12 shrink-0 items-center justify-between border-t border-white/[0.06] px-4">
        <div className="flex items-center gap-2 text-[12px] text-white/40">
          <Terminal className="size-3.5" />
          <span>Script file will be created in your commands directory.</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-white/30">
            <kbd className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
            <span>Back</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/30">
            <kbd className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px]">⌘↵</kbd>
            <span>Create</span>
          </div>
          <button
            type="button"
            onClick={() => void form.handleSubmit()}
            disabled={isSubmitting}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--solid-accent,#4ea2ff)]/20 px-3.5 text-[12px] font-medium text-[var(--solid-accent,#4ea2ff)] transition-all duration-200 hover:bg-[var(--solid-accent,#4ea2ff)]/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Create Script
          </button>
        </div>
      </footer>
    </div>
  );
}
