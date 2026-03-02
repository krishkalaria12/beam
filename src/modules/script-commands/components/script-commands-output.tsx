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
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.03]">
          <Terminal className="size-6 text-white/20" />
        </div>
        <p className="text-[13px] text-white/40">Select a script to see details and output</p>
      </div>
    );
  }

  return (
    <div className="scripts-output-enter custom-scrollbar h-full overflow-y-auto p-4">
      {/* Script info card */}
      <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
        <p className="text-[14px] font-medium text-white/90 tracking-[-0.01em]">
          {selectedScript.title}
        </p>
        <p className="mt-1.5 truncate font-mono text-[11px] text-white/40">
          {selectedScript.scriptPath}
        </p>
        {selectedScript.argumentDefinitions.length > 0 && (
          <p className="mt-2 text-[12px] text-amber-400/80">
            Arguments: {selectedScript.argumentDefinitions.length}
            {selectedScript.requiredArgumentCount > 0
              ? ` (${selectedScript.requiredArgumentCount} required)`
              : " (all optional)"}
          </p>
        )}
      </div>

      {/* Running indicator */}
      {isRunning && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-[var(--solid-accent,#4ea2ff)]/10 px-4 py-3 ring-1 ring-[var(--solid-accent,#4ea2ff)]/20">
          <Loader2 className="size-4 animate-spin text-[var(--solid-accent,#4ea2ff)]" />
          <span className="text-[12px] font-medium text-[var(--solid-accent,#4ea2ff)]">
            Running script...
          </span>
        </div>
      )}

      {/* Error message */}
      {runErrorMessage && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-red-500/10 px-4 py-3 ring-1 ring-red-500/20">
          <AlertTriangle className="size-4 text-red-400" />
          <span className="text-[12px] text-red-300">{runErrorMessage}</span>
        </div>
      )}

      {/* Execution result */}
      {executionResult ? (
        <div className="mt-4 space-y-4">
          {/* Exit status */}
          <div className="flex items-center gap-2">
            {executionResult.exitCode === 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[12px] font-medium text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Exit {executionResult.exitCode}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-[12px] font-medium text-red-400">
                <AlertTriangle className="size-3.5" />
                Exit {executionResult.exitCode}
              </span>
            )}
            <span className="text-[12px] text-white/50">{executionResult.message}</span>
          </div>

          {/* Stdout section */}
          <section>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
                Stdout
              </h3>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <pre className="max-h-44 overflow-auto rounded-xl bg-white/[0.03] p-3 font-mono text-[11px] leading-relaxed text-white/80 ring-1 ring-white/[0.06]">
              {executionResult.stdout || "(empty)"}
            </pre>
          </section>

          {/* Stderr section */}
          <section>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
                Stderr
              </h3>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <pre className="max-h-44 overflow-auto rounded-xl bg-white/[0.03] p-3 font-mono text-[11px] leading-relaxed text-white/80 ring-1 ring-white/[0.06]">
              {executionResult.stderr || "(empty)"}
            </pre>
          </section>
        </div>
      ) : (
        <div className="mt-4 flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02]">
          <Terminal className="size-5 text-white/20" />
          <span className="text-[12px] text-white/40">Run the script to see output</span>
        </div>
      )}
    </div>
  );
}
