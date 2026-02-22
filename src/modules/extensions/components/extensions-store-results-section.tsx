import { Download, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExtensionStoreListing } from "@/modules/extensions/types";

interface ExtensionsStoreResultsSectionProps {
  searchTerm: string;
  isLoading: boolean;
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
  results,
  pendingInstallSlug,
  pendingUninstallSlug,
  installedSlugSet,
  onInstall,
  onUninstall,
}: ExtensionsStoreResultsSectionProps) {
  if (searchTerm.length <= 1) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Store Results
        </p>
        {isLoading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
      </div>

      {isLoading ? (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" />
            Searching extensions...
          </span>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2">
          {results.map((entry) => {
            const isInstalled = installedSlugSet.has(entry.name.toLowerCase());
            const isInstalling = pendingInstallSlug === entry.name;
            const isUninstalling = pendingUninstallSlug === entry.name;

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{entry.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.author.handle}/{entry.name}
                  </p>
                  {entry.description ? (
                    <p className="truncate text-xs text-muted-foreground/80">{entry.description}</p>
                  ) : null}
                </div>

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
                    "gap-1.5",
                    isInstalled && "border-red-500/40 text-red-600 hover:bg-red-500/10",
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
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          No store extensions found.
        </div>
      )}
    </section>
  );
}
