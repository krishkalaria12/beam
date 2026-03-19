import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HotkeyCapabilities } from "@/modules/settings/api/hotkeys";

import type { KeybindStatus } from "../types";

interface KeybindsHeaderProps {
  capabilities: HotkeyCapabilities | null;
  isLoading: boolean;
  status: KeybindStatus;
  onRefresh: () => void;
}

export function KeybindsHeader({
  capabilities,
  isLoading,
  status,
  onRefresh,
}: KeybindsHeaderProps) {
  return (
    <div className="border-b border-[var(--launcher-card-border)] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-launcher-xs uppercase tracking-[0.16em] text-muted-foreground">
            Keybind Registry
          </div>
          <div className="mt-1 text-launcher-md text-foreground">
            {capabilities
              ? `${capabilities.backend} · ${capabilities.sessionType} · ${capabilities.compositor}`
              : "Loading backend capabilities..."}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-8 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-launcher-xs"
        >
          {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
      </div>
      {status.text ? (
        <div
          className={cn(
            "mt-3 rounded-lg border px-3 py-2 text-launcher-sm",
            status.tone === "error"
              ? "border-red-500/20 bg-red-500/10 text-red-200"
              : status.tone === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                : "border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-muted-foreground",
          )}
        >
          {status.text}
        </div>
      ) : null}
    </div>
  );
}
