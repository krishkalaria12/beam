import { Loader2, Terminal, TimerReset } from "lucide-react";
import { useCallback } from "react";

import { cn } from "@/lib/utils";
import type { ShellExecutionEntry } from "@/modules/shell/types";

interface ShellCommandPanelProps {
  shellSymbol: string;
  currentCommand: string;
  history: readonly ShellExecutionEntry[];
}

function StatusChip({ entry }: { entry: ShellExecutionEntry }) {
  if (entry.status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
        <Loader2 className="size-3 animate-spin" />
        Running
      </span>
    );
  }

  if (entry.result) {
    const toneClass = entry.result.success ? "text-emerald-300" : "text-amber-300";

    return (
      <span className={cn("inline-flex items-center gap-1.5 text-[11px]", toneClass)}>
        <TimerReset className="size-3" />
        {entry.result.timedOut ? "Timed out" : `Exit ${entry.result.exitCode ?? "signal"}`}
      </span>
    );
  }

  return <span className="inline-flex items-center text-[11px] text-rose-300">Failed</span>;
}

function OutputBlock({
  value,
  emptyLabel,
  toneClassName,
}: {
  value: string;
  emptyLabel?: string;
  toneClassName?: string;
}) {
  if (!value.trim()) {
    if (!emptyLabel) {
      return null;
    }

    return <p className="text-[12px] text-zinc-500">{emptyLabel}</p>;
  }

  return (
    <pre
      className={cn(
        "overflow-x-auto whitespace-pre-wrap break-words border-l border-[var(--launcher-card-border)] pl-3 font-mono text-[12px] leading-5 text-zinc-100",
        toneClassName,
      )}
    >
      {value}
    </pre>
  );
}

export function ShellCommandPanel({
  shellSymbol,
  currentCommand,
  history,
}: ShellCommandPanelProps) {
  const scrollAnchorRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      node.scrollIntoView({ block: "end" });
    }
  }, []);

  return (
    <div className="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden bg-[rgba(9,9,11,0.98)] font-mono">
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {history.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-10 items-center justify-center rounded-md bg-white/5">
              <Terminal className="size-4 text-zinc-400" />
            </div>
            <div className="space-y-1">
              <p className="text-[13px] text-zinc-100">Inline shell mode</p>
              <p className="text-[12px] leading-5 text-zinc-500">
                Type a command after <span className="text-zinc-300">{shellSymbol}</span> and press
                Enter.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {history.map((entry) => (
              <section key={entry.id} className="space-y-2">
                <div className="flex items-start gap-3 text-[12px] leading-5">
                  <span className="shrink-0 pt-px text-emerald-300">{shellSymbol}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <span className="break-all text-zinc-100">{entry.command}</span>
                      <StatusChip entry={entry} />
                    </div>
                    {entry.result ? (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {entry.result.shellProgram} • {entry.result.durationMs} ms
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="ml-[1.35rem] space-y-2">
                  {entry.errorMessage ? (
                    <OutputBlock value={entry.errorMessage} toneClassName="text-rose-200" />
                  ) : null}
                  {entry.result ? (
                    <>
                      <OutputBlock
                        value={entry.result.stdout}
                        emptyLabel={
                          entry.result.stderr.trim().length === 0
                            ? "Command completed with no output."
                            : undefined
                        }
                      />
                      <OutputBlock value={entry.result.stderr} toneClassName="text-rose-200" />
                    </>
                  ) : null}
                </div>
              </section>
            ))}
            <div ref={scrollAnchorRef} data-command={currentCommand} />
          </div>
        )}
      </div>
    </div>
  );
}
