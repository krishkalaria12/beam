import { Download, Loader2, Search, Trash2 } from "lucide-react";

import { CommandInlineLoading } from "@/components/command/command-loading-state";
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
          <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
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
        <div className="rounded-lg border border-dashed border-border/40 bg-background/20 p-4 text-center text-xs text-muted-foreground/50">
          <span className="inline-flex items-center gap-2">
            <Search className="size-3.5" />
            Type at least {EXTENSIONS_STORE_SEARCH_MIN_LENGTH} characters to search...
          </span>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 rounded-xl bg-background/20" />
          <Skeleton className="h-24 rounded-xl bg-background/20" />
          <Skeleton className="h-24 rounded-xl bg-background/20" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
          {errorMessage?.trim() || "Could not search Raycast store. Please try again."}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
              <div
                key={entry.id}
                className="group relative flex flex-col rounded-xl border border-border/30 bg-background/20 p-3 transition-all hover:border-border/50 hover:bg-background/30"
              >
                <div className="flex items-start gap-3">
                  <ExtensionIcon iconReference={iconReference} title={entry.title} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{entry.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.author.handle}/{entry.name}
                    </p>
                    {entry.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/70">
                        {entry.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
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
                      "h-7 gap-1.5 rounded-md px-3 text-xs font-medium",
                      isInstalled
                        ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
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
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/40 bg-background/20 p-8 text-center text-xs text-muted-foreground/50">
          No extensions found for "{normalizedSearch}".
        </div>
      )}
    </section>
  );
}
