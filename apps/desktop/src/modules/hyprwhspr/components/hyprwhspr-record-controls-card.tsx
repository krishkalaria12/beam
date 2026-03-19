import { Activity, Loader2, Mic, MicOff, RefreshCw, Square, X } from "lucide-react";

import { Kbd } from "@/components/module";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { HyprWhsprRecordAction } from "../api/execute-hyprwhspr-record";

interface HyprWhsprRecordControlsCardProps {
  isRecording: boolean;
  runningAction: HyprWhsprRecordAction | null;
  isRecordStatusFetching: boolean;
  onToggle: () => void;
  onStop: () => void;
  onCancel: () => void;
  onRefresh: () => void;
}

export function HyprWhsprRecordControlsCard({
  isRecording,
  runningAction,
  isRecordStatusFetching,
  onToggle,
  onStop,
  onCancel,
  onRefresh,
}: HyprWhsprRecordControlsCardProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/5 p-4 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-lg border",
            isRecording
              ? "border-[var(--icon-green-bg)] bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)]"
              : "border-border/40 bg-background/50 text-muted-foreground",
          )}
        >
          {isRecording ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-launcher-sm font-medium text-foreground">
            {isRecording ? "Recording in progress" : "Ready to dictate"}
          </p>
          <p className="text-launcher-xs text-muted-foreground">
            Hold{" "}
            <Kbd className="rounded px-1 py-0.5 text-launcher-2xs font-medium border border-border/40">
              Space
            </Kbd>{" "}
            to speak, release to stop.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onToggle}
          disabled={runningAction !== null}
          className="w-full justify-center gap-2 text-launcher-xs"
        >
          {runningAction === "toggle" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Activity className="size-3.5" />
          )}
          Toggle
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onStop}
          disabled={runningAction !== null}
          className="w-full justify-center gap-2 text-launcher-xs"
        >
          {runningAction === "stop" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Square className="size-3.5" />
          )}
          Stop
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={runningAction !== null}
          className="w-full justify-center gap-2 text-launcher-xs"
        >
          {runningAction === "cancel" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
          Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRecordStatusFetching}
          className="w-full justify-center gap-2 text-launcher-xs"
        >
          {isRecordStatusFetching ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Refresh
        </Button>
      </div>
    </div>
  );
}
