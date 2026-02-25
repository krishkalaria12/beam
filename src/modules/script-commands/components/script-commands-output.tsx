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
      <div className="flex h-full items-center justify-center p-6 text-xs text-muted-foreground">
        Select a script to see details and run output.
      </div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-4">
      <div className="mb-3 rounded-md border border-border/50 bg-background/20 p-3">
        <p className="text-sm font-medium text-foreground">{selectedScript.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{selectedScript.scriptPath}</p>
      </div>

      {isRunning ? (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          <Loader2 className="size-3.5 animate-spin" />
          Running script...
        </div>
      ) : null}

      {runErrorMessage ? (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertTriangle className="size-3.5" />
          {runErrorMessage}
        </div>
      ) : null}

      {executionResult ? (
        <>
          <div className="mb-3 flex items-center gap-2 text-xs">
            {executionResult.exitCode === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                <CheckCircle2 className="size-3.5" />
                Exit {executionResult.exitCode}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-300">
                <AlertTriangle className="size-3.5" />
                Exit {executionResult.exitCode}
              </span>
            )}
            <span className="text-muted-foreground">{executionResult.message}</span>
          </div>

          <section className="mb-3">
            <h3 className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              Stdout
            </h3>
            <pre className="max-h-44 overflow-auto rounded-md border border-border/50 bg-background/40 p-2.5 font-mono text-[11px] text-foreground">
              {executionResult.stdout || "(empty)"}
            </pre>
          </section>

          <section>
            <h3 className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              Stderr
            </h3>
            <pre className="max-h-44 overflow-auto rounded-md border border-border/50 bg-background/40 p-2.5 font-mono text-[11px] text-foreground">
              {executionResult.stderr || "(empty)"}
            </pre>
          </section>
        </>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border/60 bg-background/20 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Terminal className="size-3.5" />
            Run the selected script to see output.
          </div>
        </div>
      )}
    </div>
  );
}
