import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getDiscoveredPlugins } from "@/modules/extensions/api/get-discovered-plugins";
import { installExtension } from "@/modules/extensions/api/install-extension";
import { searchStoreExtensions } from "@/modules/extensions/api/search-store-extensions";
import { uninstallExtension } from "@/modules/extensions/api/uninstall-extension";
import { invalidateDiscoveredExtensionsCache } from "@/modules/extensions/extension-command-provider";
import type { PluginInfo } from "@/modules/extensions/types";

interface ExtensionsViewProps {
  onBack: () => void;
}

interface InstalledExtensionSummary {
  id: string;
  slug: string;
  title: string;
  owner: string;
  description: string;
  commandCount: number;
}

function getPluginOwner(plugin: PluginInfo): string {
  if (plugin.owner && plugin.owner.trim().length > 0) {
    return plugin.owner.trim();
  }
  if (typeof plugin.author === "string") {
    return plugin.author.trim();
  }
  if (plugin.author && typeof plugin.author === "object" && "name" in plugin.author) {
    return plugin.author.name.trim();
  }
  return "extension";
}

function toInstalledExtensionSummary(plugins: PluginInfo[]): InstalledExtensionSummary[] {
  const grouped = new Map<string, InstalledExtensionSummary>();

  for (const plugin of plugins) {
    const owner = getPluginOwner(plugin);
    const slug = plugin.pluginName.trim();
    if (!slug) {
      continue;
    }

    const key = `${owner.toLowerCase()}::${slug.toLowerCase()}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.commandCount += 1;
      continue;
    }

    grouped.set(key, {
      id: key,
      slug,
      owner: owner || "extension",
      title: plugin.pluginTitle.trim() || plugin.title.trim() || slug,
      description: (plugin.description ?? "").trim(),
      commandCount: 1,
    });
  }

  return [...grouped.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export function ExtensionsView({ onBack }: ExtensionsViewProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pendingInstallSlug, setPendingInstallSlug] = useState<string | null>(null);
  const [pendingUninstallSlug, setPendingUninstallSlug] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const normalizedSearch = search.trim();

  const installedQuery = useQuery({
    queryKey: ["extensions", "installed"],
    queryFn: getDiscoveredPlugins,
  });

  const storeSearchQuery = useQuery({
    queryKey: ["extensions", "store", normalizedSearch],
    queryFn: () => searchStoreExtensions(normalizedSearch, 12),
    enabled: normalizedSearch.length > 1,
    staleTime: 20_000,
  });

  const installedExtensions = useMemo(
    () => toInstalledExtensionSummary(installedQuery.data ?? []),
    [installedQuery.data],
  );

  const installedSlugSet = useMemo(
    () => new Set(installedExtensions.map((entry) => entry.slug.toLowerCase())),
    [installedExtensions],
  );

  const handleRefreshInstalled = async () => {
    invalidateDiscoveredExtensionsCache();
    await queryClient.invalidateQueries({ queryKey: ["extensions", "installed"] });
  };

  const handleInstall = async (input: { slug: string; downloadUrl: string; title: string }) => {
    setActionError(null);
    setPendingInstallSlug(input.slug);

    try {
      const result = await installExtension({
        slug: input.slug,
        downloadUrl: input.downloadUrl,
        force: false,
      });

      if (result.status === "requiresConfirmation") {
        const reasons = result.violations
          .slice(0, 4)
          .map((entry) => `- ${entry.commandName}: ${entry.reason}`)
          .join("\n");
        const shouldForceInstall = window.confirm(
          `Potential compatibility risks were found for "${input.title}".\n\n${reasons}\n\nInstall anyway?`,
        );
        if (!shouldForceInstall) {
          return;
        }

        await installExtension({
          slug: input.slug,
          downloadUrl: input.downloadUrl,
          force: true,
        });
      }

      await handleRefreshInstalled();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to install extension.";
      setActionError(message);
    } finally {
      setPendingInstallSlug(null);
    }
  };

  const handleUninstall = async (slug: string, title: string) => {
    const shouldRemove = window.confirm(`Uninstall "${title}" from Beam?`);
    if (!shouldRemove) {
      return;
    }

    setActionError(null);
    setPendingUninstallSlug(slug);
    try {
      await uninstallExtension(slug);
      await handleRefreshInstalled();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to uninstall extension.";
      setActionError(message);
    } finally {
      setPendingUninstallSlug(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border/40 p-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Extensions</p>
          <p className="truncate text-xs text-muted-foreground">
            Search, install, and uninstall Raycast-compatible extensions
          </p>
        </div>
      </div>

      <div className="border-b border-border/40 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search store extensions..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {actionError ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-600">
            {actionError}
          </div>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Installed
            </p>
            {installedQuery.isFetching ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          {installedExtensions.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              No extensions installed.
            </div>
          ) : (
            <div className="space-y-2">
              {installedExtensions.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{entry.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.owner}/{entry.slug} - {entry.commandCount} command
                      {entry.commandCount > 1 ? "s" : ""}
                    </p>
                    {entry.description ? (
                      <p className="truncate text-xs text-muted-foreground/80">{entry.description}</p>
                    ) : null}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleUninstall(entry.slug, entry.title);
                    }}
                    disabled={pendingUninstallSlug === entry.slug}
                    className={cn(
                      "gap-1.5",
                      pendingUninstallSlug === entry.slug && "opacity-80",
                    )}
                  >
                    {pendingUninstallSlug === entry.slug ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {normalizedSearch.length > 1 ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Store Results
              </p>
              {storeSearchQuery.isFetching ? (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              ) : null}
            </div>

            {storeSearchQuery.data && storeSearchQuery.data.length > 0 ? (
              <div className="space-y-2">
                {storeSearchQuery.data.map((entry) => {
                  const isInstalled = installedSlugSet.has(entry.name.toLowerCase());
                  const isInstalling = pendingInstallSlug === entry.name;

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
                          <p className="truncate text-xs text-muted-foreground/80">
                            {entry.description}
                          </p>
                        ) : null}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          void handleInstall({
                            slug: entry.name,
                            downloadUrl: entry.download_url,
                            title: entry.title,
                          });
                        }}
                        disabled={isInstalled || isInstalling}
                        className="gap-1.5"
                      >
                        {isInstalling ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Download className="size-3.5" />
                        )}
                        {isInstalled ? "Installed" : "Install"}
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
        ) : null}
      </div>
    </div>
  );
}
