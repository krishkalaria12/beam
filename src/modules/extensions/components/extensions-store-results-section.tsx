import { Download, Loader2, Search, Trash2 } from "lucide-react";

import { CommandInlineLoading } from "@/components/command/command-loading-state";
import { ListItem } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EXTENSIONS_STORE_SEARCH_MIN_LENGTH } from "@/modules/extensions/constants";
import { ExtensionIcon } from "@/modules/extensions/components/extension-icon";
import type { ExtensionStoreListing } from "@/modules/extensions/types";

interface ExtensionsStoreResultsSectionProps {
  searchTerm: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  results: ExtensionStoreListing[];
  pendingInstallSlug: string | null;
  pendingUninstallSlug: string | null;
  installedSlugSet: Set<string>;
  onInstall: (input: { slug: string; downloadUrl: string; title: string }) => void;
  onUninstall: (input: { slug: string; title: string }) => void;
}

export function ExtensionsStoreResultsSection({
  searchTerm,
  isLoading,
  isError,
  errorMessage,
  results,
  pendingInstallSlug,
  pendingUninstallSlug,
  installedSlugSet,
  onInstall,
  onUninstall,
}: ExtensionsStoreResultsSectionProps) {
  const normalizedSearch = searchTerm.trim();
  const hasActiveSearch = normalizedSearch.length >= EXTENSIONS_STORE_SEARCH_MIN_LENGTH;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Store Results
          </h3>
          {hasActiveSearch && !isLoading ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-1.5 text-[10px] font-medium text-muted-foreground">
              {results.length}
            </span>
          ) : null}
        </div>
        {isLoading ? <CommandInlineLoading label="Searching" iconClassName="size-3" /> : null}
      </div>

      {!hasActiveSearch ? (
        <div className="rounded-xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4 text-center text-[12px] text-muted-foreground/50">
          <span className="inline-flex items-center gap-2">
            <Search className="size-3.5" />
            Type at least {EXTENSIONS_STORE_SEARCH_MIN_LENGTH} characters to search...
          </span>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-1">
          <Skeleton className="h-16 w-full rounded-xl bg-[var(--launcher-card-bg)]" />
          <Skeleton className="h-16 w-full rounded-xl bg-[var(--launcher-card-bg)]" />
          <Skeleton className="h-16 w-full rounded-xl bg-[var(--launcher-card-bg)]" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] p-3 text-xs text-[var(--icon-red-fg)]">
          {errorMessage?.trim() || "Could not search Raycast store. Please try again."}
        </div>
      ) : results.length > 0 ? (
        <div className="flex flex-col gap-1">
          {results.map((entry) => {
            const isInstalled = installedSlugSet.has(entry.name.toLowerCase());
            const isInstalling = pendingInstallSlug === entry.name;
            const isUninstalling = pendingUninstallSlug === entry.name;
            const iconReference =
              entry.icons?.light?.trim() ||
              entry.icons?.dark?.trim() ||
              entry.author.avatar?.trim() ||
              null;

            return (
              <ListItem
                key={entry.id}
                className="group"
                showAccentBar={false}
                leftSlot={
                  <div className="flex items-center justify-center p-1">
                    <ExtensionIcon iconReference={iconReference} title={entry.title} />
                  </div>
                }
                rightSlot={
                  <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (isInstalled) {
                          onUninstall({ slug: entry.name, title: entry.title });
                          return;
                        }

                        onInstall({
                          slug: entry.name,
                          downloadUrl: entry.download_url,
                          title: entry.title,
                        });
                      }}
                      disabled={isInstalling || isUninstalling}
                      variant="ghost"
                      className={cn(
                        "h-8 gap-1.5 rounded-lg px-3 text-xs font-medium",
                        isInstalled
                          ? "text-[var(--icon-red-fg)] hover:bg-[var(--icon-red-bg)] hover:text-[var(--icon-red-fg)]"
                          : "bg-primary/10 text-primary hover:bg-primary/20",
                      )}
                    >
                      {isInstalling || isUninstalling ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : isInstalled ? (
                        <Trash2 className="size-3.5" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      {isInstalled ? "Uninstall" : "Install"}
                    </Button>
                  </div>
                }
              >
                <ListItem.Title>{entry.title}</ListItem.Title>
                <ListItem.Description>
                  {entry.author.handle}/{entry.name} {entry.description ? `· ${entry.description}` : ""}
                </ListItem.Description>
              </ListItem>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-8 text-center text-[12px] text-muted-foreground/50">
          No extensions found for "{normalizedSearch}".
        </div>
      )}
    </section>
  );
}

