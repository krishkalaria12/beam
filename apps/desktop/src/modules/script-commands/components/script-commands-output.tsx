import { AlertTriangle, CheckCircle2, Loader2, Terminal } from "lucide-react";

import type { ScriptExecutionResult, ScriptCommandSummary } from "@/modules/script-commands/types";

interface ScriptCommandsOutputProps {
  selectedScript: ScriptCommandSummary | null;
  executionResult: ScriptExecutionResult | null;
  runErrorMessage: string | null;
  isRunning: boolean;
}

export function ScriptCommandsOutput({
  selectedScript,
  executionResult,
  runErrorMessage,
  isRunning,
}: ScriptCommandsOutputProps) {
  if (!selectedScript) {
    return (
      <div className="scripts-output-empty flex h-full flex-col items-center justify-center gap-3 p-6">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--launcher-card-hover-bg)]">
          <Terminal className="size-6 text-muted-foreground" />
        </div>
        <p className="text-launcher-md text-muted-foreground">
          Select a script to see details and output
        </p>
      </div>
    );
  }

  return (
    <div className="scripts-output-enter custom-scrollbar h-full overflow-y-auto p-4">
      {/* Script info card */}
      <div className="rounded-xl bg-[var(--launcher-card-hover-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]">
        <p className="text-launcher-lg font-medium text-foreground tracking-[-0.01em]">
          {selectedScript.title}
        </p>
        <p className="mt-1.5 truncate font-mono text-launcher-xs text-muted-foreground">
          {selectedScript.scriptPath}
        </p>
        {selectedScript.argumentDefinitions.length > 0 && (
          <p className="mt-2 text-launcher-sm text-[var(--icon-orange-fg)]">
            Arguments: {selectedScript.argumentDefinitions.length}
            {selectedScript.requiredArgumentCount > 0
              ? ` (${selectedScript.requiredArgumentCount} required)`
              : " (all optional)"}
          </p>
        )}
      </div>

      {/* Running indicator */}
      {isRunning && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-[var(--ring)]/10 px-4 py-3 ring-1 ring-[var(--ring)]/20">
          <Loader2 className="size-4 animate-spin text-[var(--ring)]" />
          <span className="text-launcher-sm font-medium text-[var(--ring)]">Running script...</span>
        </div>
      )}

      {/* Error message */}
      {runErrorMessage && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-[var(--icon-red-bg)] px-4 py-3 ring-1 ring-[var(--icon-red-bg)]">
          <AlertTriangle className="size-4 text-[var(--icon-red-fg)]" />
          <span className="text-launcher-sm text-[var(--icon-red-fg)]">{runErrorMessage}</span>
        </div>
      )}

      {/* Execution result */}
      {executionResult ? (
        <div className="mt-4 space-y-4">
          {/* Exit status */}
          <div className="flex items-center gap-2">
            {executionResult.exitCode === 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--icon-green-bg)] px-2.5 py-1.5 text-launcher-sm font-medium text-[var(--icon-green-fg)]">
                <CheckCircle2 className="size-3.5" />
                Exit {executionResult.exitCode}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--icon-red-bg)] px-2.5 py-1.5 text-launcher-sm font-medium text-[var(--icon-red-fg)]">
                <AlertTriangle className="size-3.5" />
                Exit {executionResult.exitCode}
              </span>
            )}
            <span className="text-launcher-sm text-muted-foreground">{executionResult.message}</span>
          </div>

          {/* Stdout section */}
          <section>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Stdout
              </h3>
              <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
            </div>
            <pre className="max-h-44 overflow-auto rounded-xl bg-[var(--launcher-card-hover-bg)] p-3 font-mono text-launcher-xs leading-relaxed text-muted-foreground ring-1 ring-[var(--launcher-card-border)]">
              {executionResult.stdout || "(empty)"}
            </pre>
          </section>

          {/* Stderr section */}
          <section>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Stderr
              </h3>
              <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
            </div>
            <pre className="max-h-44 overflow-auto rounded-xl bg-[var(--launcher-card-hover-bg)] p-3 font-mono text-launcher-xs leading-relaxed text-muted-foreground ring-1 ring-[var(--launcher-card-border)]">
              {executionResult.stderr || "(empty)"}
            </pre>
          </section>
        </div>
      ) : (
        <div className="mt-4 flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)]">
          <Terminal className="size-5 text-muted-foreground" />
          <span className="text-launcher-sm text-muted-foreground">Run the script to see output</span>
        </div>
      )}
    </div>
  );
}
