import { Search } from "lucide-react";

export function LauncherFooter() {
  return (
    <div className="flex h-9 items-center justify-between border-t border-border/40 px-4 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
      <div className="flex items-center gap-2">
        <Search className="size-3" />
        <span>Beam</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <kbd className="rounded border border-border/60 bg-muted/30 px-1 py-0.5 font-mono text-[9px] text-foreground/70">
            ENTER
          </kbd>
          <span>Open</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="rounded border border-border/60 bg-muted/30 px-1 py-0.5 font-mono text-[9px] text-foreground/70">
            ESC
          </kbd>
          <span>Back</span>
        </div>
      </div>
    </div>
  );
}
