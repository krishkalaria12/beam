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

  if (entries.length === 0 && !shouldShowLoadingSkeleton && !isError) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
          Installed
        </h3>
        {isFetching ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Syncing
          </span>
        ) : null}
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="size-3.5" />
            Failed to load installed extensions.
          </span>
        </div>
      ) : shouldShowLoadingSkeleton ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-xl bg-white/5" />
          <Skeleton className="h-20 rounded-xl bg-white/5" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group relative flex flex-col justify-between rounded-xl border border-white/5 bg-white/5 p-3 transition-all hover:bg-white/10 hover:border-white/10"
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
                    className="h-7 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground"
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
                    "h-7 gap-1.5 rounded-md px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300",
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
