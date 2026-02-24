import { Terminal } from "lucide-react";

interface HyprWhsprOutputCardProps {
  isRecordStatusLoading: boolean;
  recordStatusOutput: string;
  lastActionOutput: string;
  errorMessage: string | null;
}

export function HyprWhsprOutputCard({
  isRecordStatusLoading,
  recordStatusOutput,
  lastActionOutput,
  errorMessage,
}: HyprWhsprOutputCardProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border/40 bg-background/40 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Terminal className="size-4 text-muted-foreground/60" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Terminal Output
        </p>
      </div>
      
      <div className="space-y-4 text-xs">
        {isRecordStatusLoading ? (
          <p className="text-muted-foreground/60 animate-pulse">Checking recorder status...</p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Status Stream
            </p>
            <div className="rounded-lg bg-muted/10 p-3 font-mono text-muted-foreground/90 border border-border/20 whitespace-pre-wrap">
              {recordStatusOutput.trim() || "No status output."}
            </div>
          </div>
        )}

        {lastActionOutput && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Action Result
            </p>
            <div className="rounded-lg bg-muted/10 p-3 font-mono text-foreground/80 border border-border/20 whitespace-pre-wrap">
              {lastActionOutput}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-destructive/50">
              Error
            </p>
            <div className="rounded-lg bg-destructive/5 p-3 font-mono text-destructive/90 border border-destructive/20 whitespace-pre-wrap">
              {errorMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
