import { useForm } from "@tanstack/react-form";
import { AlertTriangle, FileCode2, FolderOpen, Loader2, Save, Terminal } from "lucide-react";
import type { KeyboardEvent } from "react";
import { z } from "zod";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandKeyHint } from "@/components/command/command-key-hint";
import {
  CommandPanelBackButton,
  CommandPanelHeader,
  CommandPanelTitleBlock,
} from "@/components/command/command-panel-header";
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
  fileName: z.string().trim().min(1, "File name is required.").refine(
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
    <div className="glass-effect flex h-full w-full flex-col overflow-hidden text-foreground">
      <CommandPanelHeader>
        <CommandPanelBackButton onClick={onBack} aria-label="Back" />
        <CommandPanelTitleBlock
          title="Create Script Command"
          subtitle="Add a new script to your Beam commands folder"
          className="flex-1"
        />
      </CommandPanelHeader>

      <div className="custom-scrollbar list-area min-h-0 flex-1 overflow-y-auto p-4">
        <form
          id="script-command-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
          onKeyDownCapture={handleSubmitShortcut}
          className="mx-auto flex w-full max-w-3xl flex-col gap-4"
        >
          <section className="rounded-xl border border-border/40 bg-background/15 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Scripts Folder</p>
                {directoryQuery.isLoading ? (
                  <p className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Resolving script commands directory...
                  </p>
                ) : directoryQuery.error ? (
                  <p className="mt-1 text-xs text-red-300">Unable to load scripts directory.</p>
                ) : (
                  <p className="mt-1 break-all font-mono text-xs text-foreground/90">{directoryQuery.data}</p>
                )}
              </div>

              <Button type="button" size="sm" variant="outline" onClick={() => void handleOpenFolder()}>
                <FolderOpen className="size-3.5" />
                Open Folder
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-border/40 bg-background/10 p-4">
            <form.Field
              name="fileName"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="script-file-name" className="text-xs font-medium text-muted-foreground">
                    File Name
                  </Label>
                  <Input
                    id="script-file-name"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onKeyDownCapture={stopFieldKeyPropagation}
                    onKeyDown={stopFieldKeyPropagation}
                    placeholder="example.sh"
                    className={cn("h-10 font-mono", field.state.meta.errors.length > 0 && "border-red-500")}
                    autoFocus
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-red-300">{readFieldError(field.state.meta.errors[0])}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground/80">
                      Use a file name only, for example `deploy.sh` or `cleanup.py`.
                    </p>
                  )}
                </div>
              )}
            />
          </section>

          <section className="rounded-xl border border-border/40 bg-background/10 p-4">
            <form.Field
              name="content"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="script-content" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
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
                      "min-h-[260px] resize-y font-mono text-xs leading-relaxed",
                      field.state.meta.errors.length > 0 && "border-red-500",
                    )}
                    placeholder="#!/usr/bin/env bash"
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <p className="text-xs text-red-300">{readFieldError(field.state.meta.errors[0])}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground/80">
                      Add a shebang for portable execution and keep scripts self-contained.
                    </p>
                  )}
                </div>
              )}
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="makeExecutable"
              children={(field) => (
                <div className="rounded-xl border border-border/40 bg-background/10 p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="script-make-executable"
                      checked={Boolean(field.state.value)}
                      onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
                      onKeyDown={stopFieldKeyPropagation}
                    />
                    <Label htmlFor="script-make-executable" className="text-sm font-medium">
                      Mark file as executable
                    </Label>
                  </div>
                  <p className="mt-2 pl-7 text-xs text-muted-foreground/80">
                    Recommended for shell scripts that should run directly.
                  </p>
                </div>
              )}
            />

            <form.Field
              name="overwrite"
              children={(field) => (
                <div className="rounded-xl border border-border/40 bg-background/10 p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="script-overwrite"
                      checked={Boolean(field.state.value)}
                      onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
                      onKeyDown={stopFieldKeyPropagation}
                    />
                    <Label htmlFor="script-overwrite" className="text-sm font-medium">
                      Overwrite if file exists
                    </Label>
                  </div>
                  <p className="mt-2 pl-7 text-xs text-muted-foreground/80">
                    Keep this off if you want Beam to block duplicate file names.
                  </p>
                </div>
              )}
            />
          </section>

          {errorMessage ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="size-3.5" />
                {errorMessage}
              </span>
            </div>
          ) : null}
        </form>
      </div>

      <CommandFooterBar
        className="h-[52px]"
        leftSlot={(
          <span className="inline-flex items-center gap-2">
            <Terminal className="size-3.5 text-muted-foreground/70" />
            Script file will be created in your commands directory.
          </span>
        )}
        rightSlot={(
          <>
            <CommandKeyHint keyLabel="ESC" label="Back" />
            <CommandKeyHint keyLabel="CMD/CTRL + ENTER" label="Create" />
            <Button
              onClick={() => {
                void form.handleSubmit();
              }}
              disabled={isSubmitting}
              className="h-8 gap-1.5 rounded-lg bg-primary/90 hover:bg-primary"
            >
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Create Script
            </Button>
          </>
        )}
      />
    </div>
  );
}
