import { AlertTriangle, Loader2, Settings2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ExtensionIcon } from "@/modules/extensions/components/extension-icon";
import type { InstalledExtensionSummary } from "@/modules/extensions/types";

interface ExtensionsInstalledSectionProps {
  entries: InstalledExtensionSummary[];
  isFetching: boolean;
  isError: boolean;
  pendingUninstallSlug: string | null;
  setupExtensionId: string | null;
  isSetupLoading: boolean;
  isSetupSaving: boolean;
  onOpenSetup: (entry: InstalledExtensionSummary) => void;
  onUninstall: (entry: InstalledExtensionSummary) => void;
}

export function ExtensionsInstalledSection({
  entries,
  isFetching,
  isError,
  pendingUninstallSlug,
  setupExtensionId,
  isSetupLoading,
  isSetupSaving,
  onOpenSetup,
  onUninstall,
}: ExtensionsInstalledSectionProps) {
  const shouldShowLoadingSkeleton = entries.length === 0 && isFetching && !isError;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Installed
          </p>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border/70 bg-background/70 px-1.5 text-[10px] font-semibold text-muted-foreground">
            {entries.length}
          </span>
        </div>
        {isFetching ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Syncing
          </span>
        ) : null}
      </div>

      {isError ? (
        <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-xs text-red-500">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="size-3.5" />
            Failed to load installed extensions.
          </span>
        </div>
      ) : shouldShowLoadingSkeleton ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-xl border border-border/50 bg-background/40" />
          <Skeleton className="h-20 rounded-xl border border-border/50 bg-background/40" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-3 text-xs text-muted-foreground backdrop-blur">
          No extensions installed.
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-border/70 bg-background/45 p-3 backdrop-blur-xl transition-colors hover:border-border hover:bg-background/55"
            >
              <div className="flex items-start gap-3">
                <ExtensionIcon iconReference={entry.icon} title={entry.title} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{entry.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.owner}/{entry.slug}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md border border-border/70 bg-background/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {entry.commandCount > 0
                        ? `${entry.commandCount} command${entry.commandCount > 1 ? "s" : ""}`
                        : "Syncing"}
                    </span>
                  </div>
                  {entry.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/85">
                      {entry.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                {entry.pluginName && entry.preferences.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenSetup(entry);
                    }}
                    disabled={
                      pendingUninstallSlug === entry.slug ||
                      (setupExtensionId === entry.id && (isSetupLoading || isSetupSaving))
                    }
                    className="h-7 gap-1.5 rounded-lg border-border/70 bg-background/60 text-xs"
                  >
                    {setupExtensionId === entry.id && isSetupLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Settings2 className="size-3.5" />
                    )}
                    Setup
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onUninstall(entry);
                  }}
                  disabled={pendingUninstallSlug === entry.slug}
                  className={cn(
                    "h-7 gap-1.5 rounded-lg border-red-500/35 bg-red-500/10 text-xs text-red-500 hover:bg-red-500/20 hover:text-red-400",
                    pendingUninstallSlug === entry.slug && "opacity-80",
                  )}
                >
                  {pendingUninstallSlug === entry.slug ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  Uninstall
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
