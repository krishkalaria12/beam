import { AlertTriangle, Loader2, Settings2, Trash2 } from "lucide-react";

import { CommandInlineLoading } from "@/components/command/command-loading-state";
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

  if (entries.length === 0 && !shouldShowLoadingSkeleton && !isError) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
          Installed
        </h3>
        {isFetching ? <CommandInlineLoading label="Syncing" iconClassName="size-3" /> : null}
      </div>

      {isError ? (
        <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] p-3 text-xs text-[var(--icon-red-fg)]">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="size-3.5" />
            Failed to load installed extensions.
          </span>
        </div>
      ) : shouldShowLoadingSkeleton ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-xl bg-background/20" />
          <Skeleton className="h-20 rounded-xl bg-background/20" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group relative flex flex-col justify-between rounded-xl border border-border/30 bg-background/20 p-3 transition-all hover:border-border/50 hover:bg-background/30"
            >
              <div className="flex items-start gap-3">
                <ExtensionIcon iconReference={entry.icon} title={entry.title} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{entry.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.owner}/{entry.slug}
                      </p>
                    </div>
                  </div>
                  {entry.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/70">
                      {entry.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                {entry.pluginName && entry.preferences.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onOpenSetup(entry);
                    }}
                    disabled={
                      pendingUninstallSlug === entry.slug ||
                      (setupExtensionId === entry.id && (isSetupLoading || isSetupSaving))
                    }
                    className="h-7 gap-1.5 rounded-md border border-border/40 bg-background/20 px-2 text-xs text-muted-foreground hover:bg-background/30 hover:text-foreground"
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
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onUninstall(entry);
                  }}
                  disabled={pendingUninstallSlug === entry.slug}
                  className={cn(
                    "h-7 gap-1.5 rounded-md px-2 text-xs text-[var(--icon-red-fg)] hover:bg-[var(--icon-red-bg)] hover:text-[var(--icon-red-fg)]",
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
