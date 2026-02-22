import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import debounce from "@/lib/debounce";
import { getDiscoveredPlugins } from "@/modules/extensions/api/get-discovered-plugins";
import { installExtension } from "@/modules/extensions/api/install-extension";
import { searchStoreExtensions } from "@/modules/extensions/api/search-store-extensions";
import { uninstallExtension } from "@/modules/extensions/api/uninstall-extension";
import { ExtensionPreferencesDialog } from "@/modules/extensions/components/extension-preferences-dialog";
import { ExtensionsInstalledSection } from "@/modules/extensions/components/extensions-installed-section";
import { ExtensionsStoreResultsSection } from "@/modules/extensions/components/extensions-store-results-section";
import {
  buildPreferenceValues,
  mergeInstalledWithOptimisticSlugs,
  toInstalledExtensionSummary,
  type InstalledExtensionSummary,
} from "@/modules/extensions/components/extensions-view-model";
import { invalidateDiscoveredExtensionsCache } from "@/modules/extensions/extension-command-provider";
import { extensionSidecarService } from "@/modules/extensions/sidecar-service";

interface ExtensionsViewProps {
  onBack: () => void;
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

  const displayedInstalledExtensions = useMemo(
    () => mergeInstalledWithOptimisticSlugs(installedExtensions, optimisticInstalledSlugs),
    [installedExtensions, optimisticInstalledSlugs],
  );

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
        previous.filter((entry) => entry.toLowerCase() !== slug.toLowerCase()),
      );
      await handleRefreshInstalled();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to uninstall extension.";
      setActionError(message);
    } finally {
      setPendingUninstallSlug(null);
    }
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
      const message =
        error instanceof Error ? error.message : "Failed to load extension preferences.";
      setSetupError(message);
    } finally {
      if (requestId === setupLoadRequestIdRef.current) {
        setIsSetupLoading(false);
      }
    }
  };

  const resetSetupState = () => {
    setupLoadRequestIdRef.current += 1;
    setSetupExtension(null);
    setSetupValues({});
    setSetupError(null);
    setIsSetupLoading(false);
  };

  const handleCloseSetup = () => {
    if (isSetupSaving) {
      return;
    }
    resetSetupState();
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
      const message =
        error instanceof Error ? error.message : "Failed to save extension preferences.";
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

        <ExtensionsInstalledSection
          entries={displayedInstalledExtensions}
          isFetching={installedQuery.isFetching}
          isError={installedQuery.isError}
          pendingUninstallSlug={pendingUninstallSlug}
          setupExtensionId={setupExtension?.id ?? null}
          isSetupLoading={isSetupLoading}
          isSetupSaving={isSetupSaving}
          onOpenSetup={(entry) => {
            void handleOpenSetup(entry);
          }}
          onUninstall={(entry) => {
            void handleUninstall(entry.slug, entry.title);
          }}
        />

        <ExtensionsStoreResultsSection
          searchTerm={normalizedSearch}
          isLoading={shouldShowStoreLoadingState}
          results={storeSearchQuery.data ?? []}
          pendingInstallSlug={pendingInstallSlug}
          pendingUninstallSlug={pendingUninstallSlug}
          installedSlugSet={installedSlugSet}
          onInstall={(input) => {
            void handleInstall(input);
          }}
          onUninstall={(input) => {
            void handleUninstall(input.slug, input.title);
          }}
        />
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
