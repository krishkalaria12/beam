import { Download, Loader2, Search, Trash2 } from "lucide-react";

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Store Results
          </p>
          {hasActiveSearch ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border/70 bg-background/70 px-1.5 text-[10px] font-semibold text-muted-foreground">
              {results.length}
            </span>
          ) : null}
        </div>
        {isLoading ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Searching
          </span>
        ) : null}
      </div>

      {!hasActiveSearch ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Search className="size-3.5" />
            Type at least {EXTENSIONS_STORE_SEARCH_MIN_LENGTH} characters to search the Raycast
            store.
          </span>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-[94px] rounded-xl border border-border/50 bg-background/40" />
          <Skeleton className="h-[94px] rounded-xl border border-border/50 bg-background/40" />
          <Skeleton className="h-[94px] rounded-xl border border-border/50 bg-background/40" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-xs text-red-500">
          {errorMessage?.trim() || "Could not search Raycast store. Please try again."}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2.5">
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
                className="rounded-xl border border-border/70 bg-background/45 p-3 backdrop-blur-xl transition-colors hover:border-border hover:bg-background/55"
              >
                <div className="flex items-start gap-3">
                  <ExtensionIcon iconReference={iconReference} title={entry.title} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.author.handle}/{entry.name}
                    </p>
                    {entry.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/85">
                        {entry.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
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
                    variant={isInstalled ? "outline" : "default"}
                    className={cn(
                      "h-7 gap-1.5 rounded-lg text-xs",
                      isInstalled
                        ? "border-red-500/35 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400"
                        : "bg-primary/90 text-primary-foreground hover:bg-primary",
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
        <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
          No extensions found for "{normalizedSearch}".
        </div>
      )}
    </section>
  );
}
