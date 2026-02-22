import { Loader2, Settings2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InstalledExtensionSummary } from "@/modules/extensions/components/extensions-view-model";

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
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Installed
        </p>
        {isFetching ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
      </div>

      {isError ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600">
          Failed to load installed extensions.
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          No extensions installed.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card p-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{entry.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.owner}/{entry.slug} -{" "}
                  {entry.commandCount > 0
                    ? `${entry.commandCount} command${entry.commandCount > 1 ? "s" : ""}`
                    : "Syncing..."}
                </p>
                {entry.description ? (
                  <p className="truncate text-xs text-muted-foreground/80">{entry.description}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
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
                    className="gap-1.5"
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
                  className={cn("gap-1.5", pendingUninstallSlug === entry.slug && "opacity-80")}
                >
                  {pendingUninstallSlug === entry.slug ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
