import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, Search, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import debounce from "@/lib/debounce";
import { cn } from "@/lib/utils";
import { getDiscoveredPlugins } from "@/modules/extensions/api/get-discovered-plugins";
import { installExtension } from "@/modules/extensions/api/install-extension";
import { searchStoreExtensions } from "@/modules/extensions/api/search-store-extensions";
import { uninstallExtension } from "@/modules/extensions/api/uninstall-extension";
import {
  type ExtensionPreferenceField,
  ExtensionPreferencesDialog,
} from "@/modules/extensions/components/extension-preferences-dialog";
import { invalidateDiscoveredExtensionsCache } from "@/modules/extensions/extension-command-provider";
import { extensionSidecarService } from "@/modules/extensions/sidecar-service";
import type { PluginInfo, Preference } from "@/modules/extensions/types";

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
  pluginName: string | null;
  preferences: ExtensionPreferenceField[];
}

interface GroupedInstalledExtension {
  id: string;
  slug: string;
  title: string;
  owner: string;
  description: string;
  commandCount: number;
  pluginName: string | null;
  preferenceMap: Map<string, ExtensionPreferenceField>;
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
  const normalizePreferenceType = (
    input: string | null | undefined,
  ): ExtensionPreferenceField["type"] => {
    const value = (input ?? "").trim().toLowerCase();
    if (value === "password") {
      return "password";
    }
    if (value === "dropdown") {
      return "dropdown";
    }
    if (value === "checkbox") {
      return "checkbox";
    }
    if (value === "textarea") {
      return "textarea";
    }
    return "textfield";
  };

  const normalizePreference = (preference: Preference): ExtensionPreferenceField | null => {
    const name = preference.name.trim();
    if (!name) {
      return null;
    }

    const titleFromPreference =
      (typeof preference.title === "string" ? preference.title : null) ??
      (typeof preference.label === "string" ? preference.label : null);
    const title = titleFromPreference?.trim() || name;
    const description = preference.description?.trim() || undefined;

    const options = (preference.data ?? [])
      .filter((entry) => entry.value.trim().length > 0)
      .map((entry) => ({
        title: entry.title.trim() || entry.value.trim(),
        value: entry.value.trim(),
      }));

    const normalizedType = normalizePreferenceType(preference.type);
    const hasDefault =
      preference.default !== undefined &&
      preference.default !== null &&
      !(typeof preference.default === "string" && preference.default.length === 0);

    return {
      name,
      type: normalizedType,
      title,
      description,
      required: Boolean(preference.required),
      defaultValue: hasDefault ? preference.default : undefined,
      options,
    };
  };

  const collectPreferences = (plugin: PluginInfo): ExtensionPreferenceField[] => {
    const rawPreferences = [...(plugin.preferences ?? []), ...(plugin.commandPreferences ?? [])];
    const unique = new Map<string, ExtensionPreferenceField>();

    for (const preference of rawPreferences) {
      const normalized = normalizePreference(preference);
      if (!normalized) {
        continue;
      }

      const key = normalized.name.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, normalized);
        continue;
      }

      const existing = unique.get(key);
      if (!existing) {
        unique.set(key, normalized);
        continue;
      }

      if (!existing.description && normalized.description) {
        existing.description = normalized.description;
      }
      if (
        existing.defaultValue === undefined &&
        normalized.defaultValue !== undefined
      ) {
        existing.defaultValue = normalized.defaultValue;
      }
      if (existing.options.length === 0 && normalized.options.length > 0) {
        existing.options = normalized.options;
      }
      if (existing.type === "textfield" && normalized.type !== "textfield") {
        existing.type = normalized.type;
      }
      existing.required = existing.required || normalized.required;
    }

    return [...unique.values()].sort((a, b) => a.title.localeCompare(b.title));
  };

  const applyPreferences = (group: GroupedInstalledExtension, preferences: ExtensionPreferenceField[]) => {
    for (const preference of preferences) {
      const key = preference.name.toLowerCase();
      const existing = group.preferenceMap.get(key);
      if (!existing) {
        group.preferenceMap.set(key, { ...preference });
        continue;
      }

      if (!existing.description && preference.description) {
        existing.description = preference.description;
      }
      if (existing.defaultValue === undefined && preference.defaultValue !== undefined) {
        existing.defaultValue = preference.defaultValue;
      }
      if (existing.options.length === 0 && preference.options.length > 0) {
        existing.options = preference.options;
      }
      if (existing.type === "textfield" && preference.type !== "textfield") {
        existing.type = preference.type;
      }
      existing.required = existing.required || preference.required;
    }
  };

  const toInstalledSlug = (plugin: PluginInfo): string => {
    const pluginPath = plugin.pluginPath.trim();
    if (pluginPath.length > 0) {
      const parts = pluginPath.split(/[\\/]/).filter(Boolean);
      if (parts.length >= 2) {
        return parts[parts.length - 2];
      }
    }
    return plugin.pluginName.trim();
  };

  const grouped = new Map<string, GroupedInstalledExtension>();

  for (const plugin of plugins) {
    const owner = getPluginOwner(plugin);
    const slug = toInstalledSlug(plugin);
    if (!slug) {
      continue;
    }

    const key = `${owner.toLowerCase()}::${slug.toLowerCase()}`;
    const existing = grouped.get(key);
    const pluginName = plugin.pluginName.trim() || null;
    const preferences = collectPreferences(plugin);
    if (existing) {
      existing.commandCount += 1;
      if (!existing.pluginName && pluginName) {
        existing.pluginName = pluginName;
      }
      applyPreferences(existing, preferences);
      continue;
    }

    grouped.set(key, {
      id: key,
      slug,
      owner: owner || "extension",
      title: plugin.pluginTitle.trim() || plugin.title.trim() || slug,
      description: (plugin.description ?? "").trim(),
      commandCount: 1,
      pluginName,
      preferenceMap: new Map(preferences.map((preference) => [preference.name.toLowerCase(), preference])),
    });
  }

  return [...grouped.values()]
    .map((group) => ({
      id: group.id,
      slug: group.slug,
      owner: group.owner,
      title: group.title,
      description: group.description,
      commandCount: group.commandCount,
      pluginName: group.pluginName,
      preferences: [...group.preferenceMap.values()].sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function toSlugLabel(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ExtensionsView({ onBack }: ExtensionsViewProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearchDebouncing, setIsSearchDebouncing] = useState(false);
  const [pendingInstallSlug, setPendingInstallSlug] = useState<string | null>(null);
  const [pendingUninstallSlug, setPendingUninstallSlug] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [optimisticInstalledSlugs, setOptimisticInstalledSlugs] = useState<string[]>([]);
  const [setupExtension, setSetupExtension] = useState<InstalledExtensionSummary | null>(null);
  const [setupValues, setSetupValues] = useState<Record<string, unknown>>({});
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSetupLoading, setIsSetupLoading] = useState(false);
  const [isSetupSaving, setIsSetupSaving] = useState(false);
  const setupLoadRequestIdRef = useRef(0);

  const normalizedSearch = search.trim();
  const debouncedNormalizedSearch = debouncedSearch.trim();

  const applyDebouncedSearch = useMemo(
    () =>
      debounce((nextSearch: string) => {
        setDebouncedSearch(nextSearch);
        setIsSearchDebouncing(false);
      }, 220),
    [],
  );

  useEffect(() => {
    return () => {
      applyDebouncedSearch.clear();
    };
  }, [applyDebouncedSearch]);

  const installedQuery = useQuery({
    queryKey: ["extensions", "installed"],
    queryFn: getDiscoveredPlugins,
  });

  const storeSearchQuery = useQuery({
    queryKey: ["extensions", "store", debouncedNormalizedSearch],
    queryFn: () => searchStoreExtensions(debouncedNormalizedSearch, 12),
    enabled: debouncedNormalizedSearch.length > 1,
    staleTime: 20_000,
  });

  const installedExtensions = useMemo(
    () => toInstalledExtensionSummary(installedQuery.data ?? []),
    [installedQuery.data],
  );

  const displayedInstalledExtensions = useMemo(() => {
    const summaries = [...installedExtensions];
    const existingSlugs = new Set(summaries.map((entry) => entry.slug.toLowerCase()));

    for (const optimisticSlug of optimisticInstalledSlugs) {
      const slug = optimisticSlug.trim();
      if (!slug || existingSlugs.has(slug.toLowerCase())) {
        continue;
      }

      summaries.push({
        id: `optimistic::${slug.toLowerCase()}`,
        slug,
        owner: "extension",
        title: toSlugLabel(slug),
        description: "",
        commandCount: 0,
        pluginName: null,
        preferences: [],
      });
    }

    return summaries.sort((a, b) => a.title.localeCompare(b.title));
  }, [installedExtensions, optimisticInstalledSlugs]);

  const installedSlugSet = useMemo(
    () =>
      new Set([
        ...installedExtensions.map((entry) => entry.slug.toLowerCase()),
        ...optimisticInstalledSlugs.map((slug) => slug.toLowerCase()),
      ]),
    [installedExtensions, optimisticInstalledSlugs],
  );

  const handleRefreshInstalled = async () => {
    invalidateDiscoveredExtensionsCache();
    await queryClient.invalidateQueries({ queryKey: ["extensions", "installed"] });
    await queryClient.refetchQueries({
      queryKey: ["extensions", "installed"],
      type: "active",
    });
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

      setOptimisticInstalledSlugs((previous) => {
        if (previous.some((slug) => slug.toLowerCase() === input.slug.toLowerCase())) {
          return previous;
        }
        return [...previous, input.slug];
      });
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
      setOptimisticInstalledSlugs((previous) =>
        previous.filter((entry) => entry.toLowerCase() !== slug.toLowerCase())
      );
      await handleRefreshInstalled();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to uninstall extension.";
      setActionError(message);
    } finally {
      setPendingUninstallSlug(null);
    }
  };

  const buildPreferenceValues = (
    definitions: ExtensionPreferenceField[],
    incomingValues: Record<string, unknown>,
  ): Record<string, unknown> => {
    const nextValues: Record<string, unknown> = {};
    for (const definition of definitions) {
      if (Object.prototype.hasOwnProperty.call(incomingValues, definition.name)) {
        nextValues[definition.name] = incomingValues[definition.name];
        continue;
      }

      if (definition.defaultValue !== undefined) {
        nextValues[definition.name] = definition.defaultValue;
        continue;
      }

      if (definition.type === "checkbox") {
        nextValues[definition.name] = false;
        continue;
      }

      if (definition.type === "dropdown") {
        nextValues[definition.name] = definition.options[0]?.value ?? "";
        continue;
      }

      nextValues[definition.name] = "";
    }

    return nextValues;
  };

  const handleOpenSetup = async (entry: InstalledExtensionSummary) => {
    if (!entry.pluginName || entry.preferences.length === 0) {
      return;
    }

    setupLoadRequestIdRef.current += 1;
    const requestId = setupLoadRequestIdRef.current;

    setSetupExtension(entry);
    setSetupError(null);
    setIsSetupLoading(true);
    setSetupValues(buildPreferenceValues(entry.preferences, {}));

    try {
      const savedValues = await extensionSidecarService.getPreferences(entry.pluginName);
      if (requestId !== setupLoadRequestIdRef.current) {
        return;
      }
      setSetupValues(buildPreferenceValues(entry.preferences, savedValues));
    } catch (error) {
      if (requestId !== setupLoadRequestIdRef.current) {
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to load extension preferences.";
      setSetupError(message);
    } finally {
      if (requestId === setupLoadRequestIdRef.current) {
        setIsSetupLoading(false);
      }
    }
  };

  const handleCloseSetup = () => {
    if (isSetupSaving) {
      return;
    }

    setSetupExtension(null);
    setSetupValues({});
    setSetupError(null);
    setIsSetupLoading(false);
  };

  const resetSetupState = () => {
    setupLoadRequestIdRef.current += 1;
    setSetupExtension(null);
    setSetupValues({});
    setSetupError(null);
    setIsSetupLoading(false);
  };

  const handleSaveSetup = async () => {
    if (!setupExtension?.pluginName) {
      return;
    }

    setSetupError(null);
    setIsSetupSaving(true);
    try {
      await extensionSidecarService.setPreferences(setupExtension.pluginName, setupValues);
      toast.success(`Saved setup for ${setupExtension.title}.`);
      resetSetupState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save extension preferences.";
      setSetupError(message);
    } finally {
      setIsSetupSaving(false);
    }
  };

  const shouldShowStoreLoadingState = isSearchDebouncing || storeSearchQuery.isFetching;

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
            onChange={(event) => {
              const nextValue = event.target.value;
              setSearch(nextValue);
              setIsSearchDebouncing(true);
              applyDebouncedSearch(nextValue);
            }}
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

          {installedQuery.isError ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600">
              Failed to load installed extensions.
            </div>
          ) : displayedInstalledExtensions.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              No extensions installed.
            </div>
          ) : (
            <div className="space-y-2">
              {displayedInstalledExtensions.map((entry) => (
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
                          void handleOpenSetup(entry);
                        }}
                        disabled={
                          pendingUninstallSlug === entry.slug ||
                          (setupExtension?.id === entry.id && (isSetupLoading || isSetupSaving))
                        }
                        className={cn("gap-1.5")}
                      >
                        {setupExtension?.id === entry.id && isSetupLoading ? (
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
              {shouldShowStoreLoadingState ? (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              ) : null}
            </div>

            {shouldShowStoreLoadingState ? (
              <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  Searching extensions...
                </span>
              </div>
            ) : storeSearchQuery.data && storeSearchQuery.data.length > 0 ? (
              <div className="space-y-2">
                {storeSearchQuery.data.map((entry) => {
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
                          <p className="truncate text-xs text-muted-foreground/80">
                            {entry.description}
                          </p>
                        ) : null}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          if (isInstalled) {
                            void handleUninstall(entry.name, entry.title);
                            return;
                          }

                          void handleInstall({
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
        ) : null}
      </div>

      <ExtensionPreferencesDialog
        open={setupExtension !== null}
        extensionTitle={setupExtension?.title ?? ""}
        pluginName={setupExtension?.pluginName ?? ""}
        fields={setupExtension?.preferences ?? []}
        values={setupValues}
        isLoading={isSetupLoading}
        isSaving={isSetupSaving}
        error={setupError}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseSetup();
          }
        }}
        onValueChange={(name, value) => {
          setSetupValues((previous) => ({ ...previous, [name]: value }));
        }}
        onSave={() => {
          void handleSaveSetup();
        }}
      />
    </div>
  );
}
