import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Search, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { ModuleFooter, ModuleHeader, SearchInput } from "@/components/module";
import { Button } from "@/components/ui/button";
import debounce from "@/lib/debounce";
import {
  EXTENSIONS_QUERY_KEY_INSTALLED,
  EXTENSIONS_SEARCH_DEBOUNCE_MS,
  EXTENSIONS_STORE_SEARCH_MIN_LENGTH,
} from "@/modules/extensions/constants";
import { ExtensionSetupView } from "@/modules/extensions/components/extension-setup-view";
import { ExtensionsInstalledSection } from "@/modules/extensions/components/extensions-installed-section";
import { ExtensionsStoreResultsSection } from "@/modules/extensions/components/extensions-store-results-section";
import {
  buildPreferenceValues,
  mergeInstalledWithOptimisticSlugs,
  toInstalledExtensionSummary,
} from "@/modules/extensions/components/extensions-view-model";
import { invalidateDiscoveredExtensionsCache } from "@/modules/extensions/extension-command-provider";
import {
  useLoadExtensionPreferencesMutation,
  useSaveExtensionPreferencesMutation,
} from "@/modules/extensions/hooks/use-extension-preferences-mutations";
import { useInstallExtensionMutation } from "@/modules/extensions/hooks/use-install-extension-mutation";
import { useInstalledExtensionsQuery } from "@/modules/extensions/hooks/use-installed-extensions-query";
import { useStoreExtensionsSearchQuery } from "@/modules/extensions/hooks/use-store-extensions-search-query";
import { useUninstallExtensionMutation } from "@/modules/extensions/hooks/use-uninstall-extension-mutation";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { useExtensionsUiStore } from "@/modules/extensions/store/use-extensions-ui-store";
import type { InstalledExtensionSummary } from "@/modules/extensions/types";

interface ExtensionsViewProps {
  onBack: () => void;
}

export function ExtensionsView({ onBack }: ExtensionsViewProps) {
  const queryClient = useQueryClient();
  const extensionsUi = useExtensionsUiStore();
  const setupLoadRequestIdRef = useRef(0);

  const normalizedSearch = extensionsUi.search.trim();
  const debouncedNormalizedSearch = extensionsUi.debouncedSearch.trim();

  const applyDebouncedSearch = useMemo(
    () =>
      debounce((nextSearch: string) => {
        useExtensionsUiStore.getState().setDebouncedSearch(nextSearch);
        useExtensionsUiStore.getState().setSearchDebouncing(false);
      }, EXTENSIONS_SEARCH_DEBOUNCE_MS),
    [],
  );

  useEffect(() => {
    return () => {
      applyDebouncedSearch.clear();
      useExtensionsUiStore.getState().resetAll();
    };
  }, [applyDebouncedSearch]);

  const installedQuery = useInstalledExtensionsQuery();
  const storeSearchQuery = useStoreExtensionsSearchQuery(debouncedNormalizedSearch);
  const installExtensionMutation = useInstallExtensionMutation();
  const uninstallExtensionMutation = useUninstallExtensionMutation();
  const loadExtensionPreferencesMutation = useLoadExtensionPreferencesMutation();
  const saveExtensionPreferencesMutation = useSaveExtensionPreferencesMutation();

  const installedExtensions = useMemo(
    () => toInstalledExtensionSummary(installedQuery.data ?? []),
    [installedQuery.data],
  );

  const displayedInstalledExtensions = useMemo(
    () =>
      mergeInstalledWithOptimisticSlugs(installedExtensions, extensionsUi.optimisticInstalledSlugs),
    [installedExtensions, extensionsUi.optimisticInstalledSlugs],
  );

  useEffect(() => {
    if (extensionsUi.optimisticInstalledSlugs.length === 0) {
      return;
    }

    extensionsUi.pruneOptimisticInstalledSlugs(installedExtensions.map((entry) => entry.slug));
  }, [extensionsUi, installedExtensions, extensionsUi.optimisticInstalledSlugs.length]);

  const installedSlugSet = useMemo(
    () =>
      new Set([
        ...installedExtensions.map((entry) => entry.slug.toLowerCase()),
        ...extensionsUi.optimisticInstalledSlugs.map((slug) => slug.toLowerCase()),
      ]),
    [installedExtensions, extensionsUi.optimisticInstalledSlugs],
  );

  const handleRefreshInstalled = async () => {
    invalidateDiscoveredExtensionsCache();
    await queryClient.invalidateQueries({ queryKey: EXTENSIONS_QUERY_KEY_INSTALLED });
    await queryClient.refetchQueries({
      queryKey: EXTENSIONS_QUERY_KEY_INSTALLED,
      type: "active",
    });
  };

  const handleInstall = async (input: { slug: string; downloadUrl: string; title: string }) => {
    extensionsUi.setActionError(null);
    extensionsUi.setPendingInstallSlug(input.slug);

    try {
      const result = await installExtensionMutation.mutateAsync({
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

        await installExtensionMutation.mutateAsync({
          slug: input.slug,
          downloadUrl: input.downloadUrl,
          force: true,
        });
      }

      extensionsUi.addOptimisticInstalledSlug(input.slug);
      await handleRefreshInstalled();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to install extension.";
      extensionsUi.setActionError(message);
    } finally {
      extensionsUi.setPendingInstallSlug(null);
    }
  };

  const handleUninstall = async (slug: string, title: string) => {
    const shouldRemove = window.confirm(`Uninstall "${title}" from Beam?`);
    if (!shouldRemove) {
      return;
    }

    extensionsUi.setActionError(null);
    extensionsUi.setPendingUninstallSlug(slug);
    try {
      await uninstallExtensionMutation.mutateAsync(slug);
      extensionsUi.removeOptimisticInstalledSlug(slug);
      await handleRefreshInstalled();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to uninstall extension.";
      extensionsUi.setActionError(message);
    } finally {
      extensionsUi.setPendingUninstallSlug(null);
    }
  };

  const handleSearchChange = (nextValue: string) => {
    extensionsUi.setSearch(nextValue);
    const trimmedValue = nextValue.trim();

    if (trimmedValue.length < EXTENSIONS_STORE_SEARCH_MIN_LENGTH) {
      applyDebouncedSearch.clear();
      extensionsUi.setDebouncedSearch(nextValue);
      extensionsUi.setSearchDebouncing(false);
      return;
    }

    extensionsUi.setSearchDebouncing(true);
    applyDebouncedSearch(nextValue);
  };

  const handleClearSearch = () => {
    applyDebouncedSearch.clear();
    extensionsUi.setSearch("");
    extensionsUi.setDebouncedSearch("");
    extensionsUi.setSearchDebouncing(false);
  };

  const handleOpenSetup = async (entry: InstalledExtensionSummary) => {
    if (!entry.pluginName || entry.preferences.length === 0) {
      return;
    }

    setupLoadRequestIdRef.current += 1;
    const requestId = setupLoadRequestIdRef.current;

    extensionsUi.setSetupExtension(entry);
    extensionsUi.setSetupError(null);
    extensionsUi.setIsSetupLoading(true);
    extensionsUi.setSetupInitialValues(buildPreferenceValues(entry.preferences, {}));

    try {
      const savedValues = await loadExtensionPreferencesMutation.mutateAsync(entry.pluginName);
      if (requestId !== setupLoadRequestIdRef.current) {
        return;
      }
      extensionsUi.setSetupInitialValues(buildPreferenceValues(entry.preferences, savedValues));
    } catch (error) {
      if (requestId !== setupLoadRequestIdRef.current) {
        return;
      }
      const message =
        error instanceof Error ? error.message : "Failed to load extension preferences.";
      extensionsUi.setSetupError(message);
    } finally {
      if (requestId === setupLoadRequestIdRef.current) {
        extensionsUi.setIsSetupLoading(false);
      }
    }
  };

  const resetSetupState = useCallback(() => {
    setupLoadRequestIdRef.current += 1;
    extensionsUi.resetSetupState();
  }, [extensionsUi]);

  const handleCloseSetup = useCallback(() => {
    if (extensionsUi.isSetupSaving) {
      return;
    }
    resetSetupState();
  }, [extensionsUi.isSetupSaving, resetSetupState]);

  const handleBack = useCallback(() => {
    if (extensionsUi.setupExtension) {
      handleCloseSetup();
      return;
    }

    onBack();
  }, [extensionsUi.setupExtension, handleCloseSetup, onBack]);

  useLauncherPanelBackHandler("extensions", handleBack);

  const handleSaveSetup = async (values: Record<string, unknown>) => {
    if (!extensionsUi.setupExtension?.pluginName) {
      return;
    }

    extensionsUi.setSetupError(null);
    extensionsUi.setIsSetupSaving(true);
    try {
      await saveExtensionPreferencesMutation.mutateAsync({
        pluginName: extensionsUi.setupExtension.pluginName,
        values,
      });
      toast.success(`Saved setup for ${extensionsUi.setupExtension.title}.`);
      resetSetupState();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save extension preferences.";
      extensionsUi.setSetupError(message);
    } finally {
      extensionsUi.setIsSetupSaving(false);
    }
  };

  const shouldShowStoreLoadingState =
    normalizedSearch.length >= EXTENSIONS_STORE_SEARCH_MIN_LENGTH &&
    (extensionsUi.isSearchDebouncing || storeSearchQuery.isFetching);

  if (extensionsUi.setupExtension) {
    return (
      <ExtensionSetupView
        extensionTitle={extensionsUi.setupExtension.title}
        pluginName={extensionsUi.setupExtension.pluginName ?? ""}
        fields={extensionsUi.setupExtension.preferences}
        initialValues={extensionsUi.setupInitialValues}
        isLoading={extensionsUi.isSetupLoading}
        isSaving={extensionsUi.isSetupSaving}
        error={extensionsUi.setupError}
        onBack={handleBack}
        onSave={handleSaveSetup}
      />
    );
  }

  return (
    <div className="glass-effect flex h-full w-full flex-col overflow-hidden text-foreground">
      <ModuleHeader
        onBack={handleBack}
        title="Extensions"
        badge={
          <ModuleHeader.Badge className="inline-flex items-center gap-1 border border-[var(--icon-purple-bg)] bg-[var(--icon-purple-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--icon-purple-fg)]">
            <Sparkles className="size-3" />
            {displayedInstalledExtensions.length}
          </ModuleHeader.Badge>
        }
      />

      <div className="flex-none border-b border-[var(--ui-divider)] p-3">
        <SearchInput
          value={extensionsUi.search}
          onChange={handleSearchChange}
          placeholder="Search extensions..."
          leftIcon={<Search />}
          rightSlot={
            shouldShowStoreLoadingState ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            ) : extensionsUi.search.length > 0 ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearSearch}
                className="size-6 rounded-full p-0 text-muted-foreground hover:bg-[var(--launcher-card-bg)] hover:text-foreground"
              >
                <X className="size-3" />
              </Button>
            ) : null
          }
        />
      </div>

      <div className="relative custom-scrollbar list-area min-h-0 flex-1 overflow-y-auto p-3">
        {extensionsUi.actionError ? (
          <div className="mb-4 rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] p-3 text-xs text-[var(--icon-red-fg)]">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              {extensionsUi.actionError}
            </span>
          </div>
        ) : null}

        <div className="space-y-6">
          <ExtensionsInstalledSection
            entries={displayedInstalledExtensions}
            isFetching={installedQuery.isFetching}
            isError={installedQuery.isError}
            pendingUninstallSlug={extensionsUi.pendingUninstallSlug}
            setupExtensionId={null}
            isSetupLoading={extensionsUi.isSetupLoading}
            isSetupSaving={extensionsUi.isSetupSaving}
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
            isError={
              normalizedSearch.length >= EXTENSIONS_STORE_SEARCH_MIN_LENGTH &&
              !extensionsUi.isSearchDebouncing &&
              storeSearchQuery.isError
            }
            errorMessage={
              storeSearchQuery.error instanceof Error ? storeSearchQuery.error.message : undefined
            }
            results={storeSearchQuery.data ?? []}
            pendingInstallSlug={extensionsUi.pendingInstallSlug}
            pendingUninstallSlug={extensionsUi.pendingUninstallSlug}
            installedSlugSet={installedSlugSet}
            onInstall={(input) => {
              void handleInstall(input);
            }}
            onUninstall={(input) => {
              void handleUninstall(input.slug, input.title);
            }}
          />
        </div>
      </div>

      <ModuleFooter
        leftSlot={<span>{displayedInstalledExtensions.length} installed extensions</span>}
        shortcuts={[{ keys: ["Esc"], label: "Back" }]}
      />
    </div>
  );
}

