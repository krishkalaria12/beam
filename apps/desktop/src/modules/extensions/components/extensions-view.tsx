import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";
import { useCallback, useMemo, useReducer } from "react";
import { toast } from "sonner";

import { GenericListView, SearchBar } from "@/components/module";
import { Button } from "@/components/ui/button";
import debounce from "@/lib/debounce";
import { ExtensionsDetailPane } from "@/modules/extensions/components/extensions-view/extensions-detail-pane";
import { ExtensionsSidebar } from "@/modules/extensions/components/extensions-view/extensions-sidebar";
import {
  buildPreferenceValues,
  mergeInstalledWithOptimisticSlugs,
  toInstalledExtensionSummary,
} from "@/modules/extensions/components/extensions-view-model";
import {
  EXTENSIONS_QUERY_KEY_INSTALLED,
  EXTENSIONS_QUERY_KEY_STORE_UPDATES,
  EXTENSIONS_SEARCH_DEBOUNCE_MS,
  EXTENSIONS_STORE_SEARCH_MIN_LENGTH,
} from "@/modules/extensions/constants";
import { invalidateDiscoveredExtensionsCache } from "@/modules/extensions/extension-command-provider";
import { extensionManagerService } from "@/modules/extensions/extension-manager-service";
import { useInstallExtensionMutation } from "@/modules/extensions/hooks/use-install-extension-mutation";
import { useInstalledExtensionsQuery } from "@/modules/extensions/hooks/use-installed-extensions-query";
import { useStoreExtensionPackageQuery } from "@/modules/extensions/hooks/use-store-extension-package-query";
import { useStoreExtensionUpdatesQuery } from "@/modules/extensions/hooks/use-store-extension-updates-query";
import { useStoreExtensionsSearchQuery } from "@/modules/extensions/hooks/use-store-extensions-search-query";
import { useUninstallExtensionMutation } from "@/modules/extensions/hooks/use-uninstall-extension-mutation";
import { useExtensionsUiStore } from "@/modules/extensions/store/use-extensions-ui-store";
import type {
  ExtensionPreferenceField,
  InstalledExtensionSummary,
} from "@/modules/extensions/types";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface ExtensionsViewProps {
  onBack: () => void;
}

type SelectedExtensionsRow =
  | { kind: "installed"; id: string }
  | { kind: "store"; id: string }
  | null;

function areSelectedRowsEqual(left: SelectedExtensionsRow, right: SelectedExtensionsRow): boolean {
  return left?.kind === right?.kind && left?.id === right?.id;
}

function matchesInstalledSearch(entry: InstalledExtensionSummary, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [entry.title, entry.slug, entry.owner, entry.description, entry.version ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function extensionKey(owner: string, slug: string): string {
  return `${owner.trim().toLowerCase()}::${slug.trim().toLowerCase()}`;
}

function isMissingRequiredField(field: ExtensionPreferenceField, value: unknown): boolean {
  if (!field.required) {
    return false;
  }

  if (field.type === "checkbox") {
    return value !== true;
  }

  return String(value ?? "").trim().length === 0;
}

function InlineBadge({ value }: { value: string | number }) {
  return (
    <span className="inline-flex h-8 items-center rounded-md border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-2.5 text-launcher-xs font-medium text-muted-foreground">
      {value}
    </span>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 py-2">
      <div className="text-launcher-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-launcher-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

interface ExtensionsViewState {
  selectedRow: SelectedExtensionsRow;
  pendingInstallSlug: string | null;
  pendingUninstallSlug: string | null;
  actionError: string | null;
  optimisticInstalledSlugs: string[];
  isPreferenceSaving: boolean;
  preferenceDraftState: {
    key: string;
    values: Record<string, unknown>;
    validationError: string | null;
    saveError: string | null;
  };
}

type ExtensionsViewAction =
  | { type: "set-selected-row"; value: SelectedExtensionsRow }
  | { type: "set-pending-install-slug"; value: string | null }
  | { type: "set-pending-uninstall-slug"; value: string | null }
  | { type: "set-action-error"; value: string | null }
  | { type: "set-optimistic-installed-slugs"; value: string[] }
  | { type: "set-preference-saving"; value: boolean }
  | {
      type: "set-preference-draft-state";
      value: ExtensionsViewState["preferenceDraftState"];
    };

const INITIAL_EXTENSIONS_VIEW_STATE: ExtensionsViewState = {
  selectedRow: null,
  pendingInstallSlug: null,
  pendingUninstallSlug: null,
  actionError: null,
  optimisticInstalledSlugs: [],
  isPreferenceSaving: false,
  preferenceDraftState: {
    key: "",
    values: {},
    validationError: null,
    saveError: null,
  },
};

function extensionsViewReducer(
  state: ExtensionsViewState,
  action: ExtensionsViewAction,
): ExtensionsViewState {
  switch (action.type) {
    case "set-selected-row":
      return { ...state, selectedRow: action.value };
    case "set-pending-install-slug":
      return { ...state, pendingInstallSlug: action.value };
    case "set-pending-uninstall-slug":
      return { ...state, pendingUninstallSlug: action.value };
    case "set-action-error":
      return { ...state, actionError: action.value };
    case "set-optimistic-installed-slugs":
      return { ...state, optimisticInstalledSlugs: action.value };
    case "set-preference-saving":
      return { ...state, isPreferenceSaving: action.value };
    case "set-preference-draft-state":
      return { ...state, preferenceDraftState: action.value };
  }
}

export function ExtensionsView({ onBack }: ExtensionsViewProps) {
  const queryClient = useQueryClient();
  const extensionsUi = useExtensionsUiStore();
  const [state, dispatch] = useReducer(extensionsViewReducer, INITIAL_EXTENSIONS_VIEW_STATE);

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

  useMountEffect(() => {
    return () => {
      applyDebouncedSearch.clear();
      useExtensionsUiStore.getState().resetAll();
    };
  });

  const installedQuery = useInstalledExtensionsQuery();
  const storeSearchQuery = useStoreExtensionsSearchQuery(debouncedNormalizedSearch);
  const storeUpdatesQuery = useStoreExtensionUpdatesQuery();
  const installExtensionMutation = useInstallExtensionMutation();
  const uninstallExtensionMutation = useUninstallExtensionMutation();

  const installedExtensions = useMemo(
    () => toInstalledExtensionSummary(installedQuery.data ?? []),
    [installedQuery.data],
  );

  const displayedInstalledExtensions = useMemo(
    () => mergeInstalledWithOptimisticSlugs(installedExtensions, state.optimisticInstalledSlugs),
    [installedExtensions, state.optimisticInstalledSlugs],
  );

  const filteredInstalledExtensions = useMemo(
    () =>
      displayedInstalledExtensions.filter((entry) =>
        matchesInstalledSearch(entry, normalizedSearch),
      ),
    [displayedInstalledExtensions, normalizedSearch],
  );

  const updateById = useMemo(
    () => new Map((storeUpdatesQuery.data ?? []).map((entry) => [entry.id, entry])),
    [storeUpdatesQuery.data],
  );

  const selectedInstalled = useMemo(
    () =>
      state.selectedRow?.kind === "installed"
        ? (filteredInstalledExtensions.find((entry) => entry.id === state.selectedRow?.id) ?? null)
        : null,
    [filteredInstalledExtensions, state.selectedRow],
  );

  const selectedStore = useMemo(
    () => {
      const selectedStoreRow = state.selectedRow;
      if (!selectedStoreRow || selectedStoreRow.kind !== "store") {
        return null;
      }

      return (storeSearchQuery.data ?? []).find((entry) => entry.id === selectedStoreRow.id) ?? null;
    },
    [state.selectedRow, storeSearchQuery.data],
  );

  const selectedStorePackageQuery = useStoreExtensionPackageQuery(selectedStore?.id ?? null);
  const selectedStoreDetail = selectedStorePackageQuery.data ?? selectedStore;
  const selectedInstalledPluginName = selectedInstalled?.pluginName?.trim() ?? "";
  const selectedInstalledPreferences = selectedInstalled?.preferences ?? [];
  const installedPreferencesQuery = useQuery({
    queryKey: ["extension-preferences", selectedInstalledPluginName],
    queryFn: async () => extensionManagerService.getPreferences(selectedInstalledPluginName),
    enabled: selectedInstalledPluginName.length > 0 && selectedInstalledPreferences.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const selectedInstalledUpdate = useMemo(() => {
    if (!selectedInstalled) {
      return null;
    }

    return (
      [...updateById.values()].find(
        (entry) =>
          extensionKey(entry.author.handle, entry.slug) ===
          extensionKey(selectedInstalled.owner, selectedInstalled.slug),
      ) ?? null
    );
  }, [selectedInstalled, updateById]);

  const installedUpdateKeys = useMemo(
    () =>
      new Set(
        (storeUpdatesQuery.data ?? []).map((entry) =>
          extensionKey(entry.author.handle, entry.slug),
        ),
      ),
    [storeUpdatesQuery.data],
  );

  const desiredSelectedRow = useMemo<SelectedExtensionsRow>(() => {
    const selectedKind = state.selectedRow?.kind ?? null;
    const selectedId = state.selectedRow?.id ?? null;

    if (selectedKind === "installed" && selectedId) {
      const exists = filteredInstalledExtensions.some((entry) => entry.id === selectedId);
      if (exists) {
          return state.selectedRow;
      }
    }

    if (selectedKind === "store" && selectedId) {
      const exists = (storeSearchQuery.data ?? []).some((entry) => entry.id === selectedId);
      if (exists) {
          return state.selectedRow;
      }
    }

    const firstInstalled = filteredInstalledExtensions[0];
    if (firstInstalled) {
      return { kind: "installed", id: firstInstalled.id };
    }

    const firstStore = (storeSearchQuery.data ?? [])[0];
    return firstStore ? { kind: "store", id: firstStore.id } : null;
  }, [filteredInstalledExtensions, state.selectedRow, storeSearchQuery.data]);

  if (!areSelectedRowsEqual(state.selectedRow, desiredSelectedRow)) {
    dispatch({ type: "set-selected-row", value: desiredSelectedRow });
  }

  const seededPreferenceValues = useMemo(
    () =>
      selectedInstalledPluginName.length > 0 && selectedInstalledPreferences.length > 0
        ? buildPreferenceValues(selectedInstalledPreferences, installedPreferencesQuery.data ?? {})
        : {},
    [installedPreferencesQuery.data, selectedInstalledPluginName, selectedInstalledPreferences],
  );
  const preferenceDraftKey = useMemo(
    () =>
      selectedInstalledPluginName.length > 0 && selectedInstalledPreferences.length > 0
        ? `${selectedInstalledPluginName}:${installedPreferencesQuery.dataUpdatedAt}`
        : "",
    [
      installedPreferencesQuery.dataUpdatedAt,
      selectedInstalledPluginName,
      selectedInstalledPreferences.length,
    ],
  );

  if (state.preferenceDraftState.key !== preferenceDraftKey) {
    dispatch({ type: "set-preference-draft-state", value: {
      key: preferenceDraftKey,
      values: seededPreferenceValues,
      validationError: null,
      saveError: null,
    }});
  }

  const resolvedOptimisticInstalledSlugs = useMemo(() => {
    if (state.optimisticInstalledSlugs.length === 0) {
      return state.optimisticInstalledSlugs;
    }

    const installedSlugSet = new Set(installedExtensions.map((entry) => entry.slug.toLowerCase()));
    return state.optimisticInstalledSlugs.filter((entry) => !installedSlugSet.has(entry.toLowerCase()));
  }, [installedExtensions, state.optimisticInstalledSlugs]);

  if (
    resolvedOptimisticInstalledSlugs.length !== state.optimisticInstalledSlugs.length ||
    resolvedOptimisticInstalledSlugs.some(
      (entry, index) => entry !== state.optimisticInstalledSlugs[index],
    )
  ) {
    dispatch({ type: "set-optimistic-installed-slugs", value: resolvedOptimisticInstalledSlugs });
  }

  const handleRefreshInstalled = useCallback(async () => {
    invalidateDiscoveredExtensionsCache();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: EXTENSIONS_QUERY_KEY_INSTALLED }),
      queryClient.invalidateQueries({ queryKey: EXTENSIONS_QUERY_KEY_STORE_UPDATES }),
    ]);
    await Promise.all([
      queryClient.refetchQueries({
        queryKey: EXTENSIONS_QUERY_KEY_INSTALLED,
        type: "active",
      }),
      queryClient.refetchQueries({
        queryKey: EXTENSIONS_QUERY_KEY_STORE_UPDATES,
        type: "active",
      }),
    ]);
  }, [queryClient]);

  const handleInstall = useCallback(
    async (input: {
      packageId: string;
      slug: string;
      title: string;
      releaseVersion?: string;
      channel?: string;
    }) => {
      dispatch({ type: "set-action-error", value: null });
      dispatch({ type: "set-pending-install-slug", value: input.slug });

      try {
        const result = await installExtensionMutation.mutateAsync({
          packageId: input.packageId,
          slug: input.slug,
          releaseVersion: input.releaseVersion,
          channel: input.channel,
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
            packageId: input.packageId,
            slug: input.slug,
            releaseVersion: input.releaseVersion,
            channel: input.channel,
            force: true,
          });
        }

        const normalizedSlug = input.slug.trim();
        if (normalizedSlug) {
          const alreadyExists = state.optimisticInstalledSlugs.some(
            (entry) => entry.toLowerCase() === normalizedSlug.toLowerCase(),
          );
          if (!alreadyExists) {
            dispatch({
              type: "set-optimistic-installed-slugs",
              value: [...state.optimisticInstalledSlugs, normalizedSlug],
            });
          }
        }
        await handleRefreshInstalled();
      } catch (error) {
        dispatch({
          type: "set-action-error",
          value: error instanceof Error ? error.message : "Failed to install extension.",
        });
      }

      dispatch({ type: "set-pending-install-slug", value: null });
    },
    [handleRefreshInstalled, installExtensionMutation, state.optimisticInstalledSlugs],
  );

  const handleUninstall = useCallback(
    async (entry: InstalledExtensionSummary) => {
      const shouldRemove = window.confirm(`Uninstall "${entry.title}" from Beam?`);
      if (!shouldRemove) {
        return;
      }

      dispatch({ type: "set-action-error", value: null });
      dispatch({ type: "set-pending-uninstall-slug", value: entry.slug });
      try {
        await uninstallExtensionMutation.mutateAsync(entry.slug);
        dispatch({
          type: "set-optimistic-installed-slugs",
          value: state.optimisticInstalledSlugs.filter(
            (slug) => slug.toLowerCase() !== entry.slug.toLowerCase(),
          ),
        });
        await handleRefreshInstalled();
      } catch (error) {
        dispatch({
          type: "set-action-error",
          value: error instanceof Error ? error.message : "Failed to uninstall extension.",
        });
      }

      dispatch({ type: "set-pending-uninstall-slug", value: null });
    },
    [handleRefreshInstalled, state.optimisticInstalledSlugs, uninstallExtensionMutation],
  );

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

  const handleSavePreferences = async () => {
    if (!selectedInstalled?.pluginName) {
      return;
    }

    const missingRequiredField = selectedInstalled.preferences.find((field) =>
      isMissingRequiredField(field, state.preferenceDraftState.values[field.name]),
    );
    if (missingRequiredField) {
      dispatch({ type: "set-preference-draft-state", value: {
        ...state.preferenceDraftState,
        validationError: `"${missingRequiredField.title}" is required.`,
      }});
      return;
    }

    dispatch({ type: "set-preference-draft-state", value: {
      ...state.preferenceDraftState,
      validationError: null,
      saveError: null,
    }});
    dispatch({ type: "set-preference-saving", value: true });
    try {
      await extensionManagerService.setPreferences(
        selectedInstalled.pluginName,
        state.preferenceDraftState.values,
      );
      queryClient.setQueryData(
        ["extension-preferences", selectedInstalled.pluginName],
        state.preferenceDraftState.values,
      );
      toast.success(`Saved setup for ${selectedInstalled.title}.`);
      await handleRefreshInstalled();
    } catch (error) {
      dispatch({ type: "set-preference-draft-state", value: {
        ...state.preferenceDraftState,
        saveError: error instanceof Error ? error.message : "Failed to save extension preferences.",
      }});
    }

    dispatch({ type: "set-preference-saving", value: false });
  };

  useLauncherPanelBackHandler("extensions", onBack);

  const updateCount = storeUpdatesQuery.data?.length ?? 0;
  const storeResultCount =
    normalizedSearch.length >= EXTENSIONS_STORE_SEARCH_MIN_LENGTH
      ? (storeSearchQuery.data?.length ?? 0)
      : 0;
  const selectedStoreInstalled =
    selectedStoreDetail != null &&
    filteredInstalledExtensions.some(
      (entry) =>
        extensionKey(entry.owner, entry.slug) ===
        extensionKey(selectedStoreDetail.author.handle, selectedStoreDetail.slug),
    );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--solid-bg)] text-foreground">
      <SearchBar
        onBack={onBack}
        showBackButton
        interactive
        value={extensionsUi.search}
        onChange={handleSearchChange}
        placeholder="Search installed extensions or the extension store"
        rightSlot={
          <div className="flex items-center gap-2">
            <InlineBadge value={`${displayedInstalledExtensions.length} installed`} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-md px-2.5 text-launcher-xs"
              onClick={() => void handleRefreshInstalled()}
            >
              <RefreshCcw className="size-3.5" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="border-b border-[var(--ui-divider)] bg-[var(--solid-bg-header)] px-4 py-3">
        <div className="grid grid-cols-4 gap-2">
          <SummaryMetric label="Installed" value={String(displayedInstalledExtensions.length)} />
          <SummaryMetric label="Updates" value={String(updateCount)} />
          <SummaryMetric label="Store" value={String(storeResultCount)} />
          <SummaryMetric
            label="Search"
            value={
              normalizedSearch.length >= EXTENSIONS_STORE_SEARCH_MIN_LENGTH
                ? "Store"
                : `Min ${EXTENSIONS_STORE_SEARCH_MIN_LENGTH}`
            }
          />
        </div>
      </div>

      <GenericListView
        detailVisible
        templateColumns="320px minmax(0, 1fr)"
        listPaneClassName="overflow-y-auto border-r border-[var(--ui-divider)] bg-[var(--solid-bg-base)] p-3"
        detailPaneClassName="overflow-y-auto bg-[var(--solid-bg-recessed)]"
        list={
          <ExtensionsSidebar
            installedExtensions={filteredInstalledExtensions}
            installedErrorMessage={
              installedQuery.isError ? "Failed to load installed extensions." : null
            }
             selectedInstalledId={state.selectedRow?.kind === "installed" ? state.selectedRow.id : null}
             installedUpdateKeys={installedUpdateKeys}
             onSelectInstalled={(id) => dispatch({ type: "set-selected-row", value: { kind: "installed", id } })}
            search={normalizedSearch}
            minimumSearchLength={EXTENSIONS_STORE_SEARCH_MIN_LENGTH}
            storeResults={storeSearchQuery.data ?? []}
             selectedStoreId={state.selectedRow?.kind === "store" ? state.selectedRow.id : null}
             onSelectStore={(id) => dispatch({ type: "set-selected-row", value: { kind: "store", id } })}
            isStoreLoading={Boolean(storeSearchQuery.isLoading)}
            isStoreError={Boolean(storeSearchQuery.isError)}
            storeErrorMessage={
              storeSearchQuery.error instanceof Error
                ? storeSearchQuery.error.message
                : storeSearchQuery.isError
                  ? "Store search failed."
                  : null
            }
            isSearchDebouncing={extensionsUi.isSearchDebouncing}
          />
        }
        detail={
          <ExtensionsDetailPane
            selectedInstalled={selectedInstalled}
            selectedInstalledUpdate={selectedInstalledUpdate}
            selectedStoreDetail={selectedStoreDetail ?? null}
            selectedStoreInstalled={Boolean(selectedStoreInstalled)}
             pendingInstallSlug={state.pendingInstallSlug}
             pendingUninstallSlug={state.pendingUninstallSlug}
             onInstall={handleInstall}
             onUninstall={handleUninstall}
            isPreferenceLoading={
              selectedInstalledPluginName.length > 0 &&
              selectedInstalledPreferences.length > 0 &&
              installedPreferencesQuery.isLoading
            }
             isPreferenceSaving={state.isPreferenceSaving}
             preferenceValues={state.preferenceDraftState.values}
             preferenceError={
               state.preferenceDraftState.saveError ??
               (installedPreferencesQuery.error instanceof Error
                ? installedPreferencesQuery.error.message
                : installedPreferencesQuery.isError
                  ? "Failed to load extension preferences."
                  : null)
            }
             validationError={state.preferenceDraftState.validationError}
             onChangePreference={(key, value) => {
               dispatch({ type: "set-preference-draft-state", value: {
                 ...state.preferenceDraftState,
                 validationError: null,
                 saveError: null,
                 values: { ...state.preferenceDraftState.values, [key]: value },
               }});
             }}
            onSavePreferences={handleSavePreferences}
            storeDetailIsLoading={
              Boolean(selectedStorePackageQuery.isLoading) && selectedStorePackageQuery.data == null
            }
            storeDetailError={
              selectedStorePackageQuery.error instanceof Error
                ? selectedStorePackageQuery.error.message
                : selectedStorePackageQuery.isError
                  ? "Failed to load package details."
                  : null
            }
          />
        }
      />

      {state.actionError ? (
        <div className="border-t border-[var(--ui-divider)] px-4 py-2 text-launcher-sm text-[var(--icon-red-fg)]">
          {state.actionError}
        </div>
      ) : null}
    </div>
  );
}
