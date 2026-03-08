import { AlertTriangle, Loader2, Settings2, Trash2 } from "lucide-react";

import { CommandInlineLoading } from "@/components/command/command-loading-state";
import { ListItem } from "@/components/module";
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
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
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
        <div className="flex flex-col gap-1">
          <Skeleton className="h-16 w-full rounded-xl bg-[var(--launcher-card-bg)]" />
          <Skeleton className="h-16 w-full rounded-xl bg-[var(--launcher-card-bg)]" />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((entry) => (
            <ListItem
              key={entry.id}
              className="group"
              showAccentBar={false}
              leftSlot={
                <div className="flex items-center justify-center p-1">
                  <ExtensionIcon iconReference={entry.icon} title={entry.title} />
                </div>
              }
              rightSlot={
                <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
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
                      className="h-8 gap-1.5 rounded-lg bg-[var(--launcher-card-bg)] px-2.5 text-xs text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-foreground transition-all duration-200"
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
                      "h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[var(--icon-red-fg)] hover:bg-[var(--icon-red-bg)] hover:text-[var(--icon-red-fg)]",
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
              }
            >
              <ListItem.Title>{entry.title}</ListItem.Title>
              <ListItem.Description>
                {entry.owner}/{entry.slug} {entry.description ? `· ${entry.description}` : ""}
              </ListItem.Description>
            </ListItem>
          ))}
        </div>
      )}
    </section>
  );
}

