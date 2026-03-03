import { FileCode2, Terminal } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ScriptCommandSummary } from "@/modules/script-commands/types";

interface ScriptCommandsListProps {
  scripts: readonly ScriptCommandSummary[];
  selectedScriptId: string | null;
  isLoading: boolean;
  onSelect: (scriptId: string) => void;
  onRun: (scriptId: string) => void;
}

export function ScriptCommandsList({
  scripts,
  selectedScriptId,
  isLoading,
  onSelect,
  onRun,
}: ScriptCommandsListProps) {
  if (isLoading) {
    return (
      <div className="scripts-loading flex h-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-foreground/40">
          <div className="size-8 animate-spin rounded-full border-2 border-[var(--launcher-card-border)] border-t-white/40" />
          <span className="text-[12px]">Loading scripts...</span>
        </div>
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className="scripts-empty flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--launcher-card-hover-bg)]">
          <Terminal className="size-5 text-foreground/30" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-foreground/50">No scripts found</p>
          <p className="mt-1 text-[12px] text-foreground/30">Add scripts to your commands folder</p>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar flex h-full flex-col overflow-y-auto p-2">
      {scripts.map((script, index) => {
        const isSelected = script.id === selectedScriptId;

        return (
          <button
            key={script.id}
            type="button"
            className={cn(
              "scripts-list-item group relative mb-1 rounded-xl px-3 py-2.5 text-left transition-all duration-200",
              isSelected
                ? "bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]"
                : "bg-transparent hover:bg-[var(--launcher-card-hover-bg)]",
            )}
            style={{ animationDelay: `${index * 30}ms` }}
            onClick={() => onSelect(script.id)}
            onDoubleClick={() => onRun(script.id)}
          >
            {/* Left accent bar */}
            <div
              className={cn(
                "absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--ring)] transition-all duration-200",
                isSelected && "h-[60%]",
              )}
            />

            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15">
                <Terminal className="size-3.5 text-emerald-400/80" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block truncate text-[13px] font-medium text-foreground/90 tracking-[-0.01em]">
                  {script.title}
                </span>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-foreground/40">
                  <FileCode2 className="size-3" />
                  <span className="truncate">{script.scriptName}</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="mt-2 flex items-center gap-1.5 pl-10">
              {script.argumentDefinitions.length > 0 && (
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400/90">
                  {script.argumentDefinitions.length} args
                </span>
              )}
              {script.hasShebang && (
                <span className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-400/90">
                  shebang
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
