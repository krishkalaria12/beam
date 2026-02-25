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
      <div className="p-4 text-xs text-muted-foreground">
        Loading scripts...
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        No scripts found in your script commands folder.
      </div>
    );
  }

  return (
    <div className="custom-scrollbar flex h-full flex-col overflow-y-auto p-2">
      {scripts.map((script) => {
        const isSelected = script.id === selectedScriptId;

        return (
          <button
            key={script.id}
            type="button"
            className={cn(
              "group mb-1 rounded-md border px-2.5 py-2 text-left transition-colors",
              isSelected
                ? "border-primary/40 bg-primary/10"
                : "border-transparent bg-transparent hover:border-border/50 hover:bg-background/30",
            )}
            onClick={() => {
              onSelect(script.id);
            }}
            onDoubleClick={() => {
              onRun(script.id);
            }}
          >
            <div className="flex items-center gap-2">
              <Terminal className="size-3.5 text-muted-foreground/80" />
              <span className="truncate text-sm font-medium text-foreground">{script.title}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <FileCode2 className="size-3" />
              <span className="truncate">{script.scriptName}</span>
              {script.hasShebang ? (
                <span className="rounded-sm border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-300">
                  shebang
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
