import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2, RefreshCcw, Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import debounce from "@/lib/debounce";
import { requestLauncherActionsToggle } from "@/lib/launcher-actions";
import { ExtensionsDetailPanel } from "@/modules/extensions/components/extensions-view/extensions-detail-panel";
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
import {
  clearExtensionActionsState,
  type ExtensionInstalledActionContext,
  type ExtensionInstalledUpdateActionContext,
  type ExtensionStoreActionContext,
  syncExtensionActionsState,
} from "@/modules/extensions/hooks/use-extension-action-items";
import { useInstalledExtensionsQuery } from "@/modules/extensions/hooks/use-installed-extensions-query";
import { useStoreExtensionPackageQuery } from "@/modules/extensions/hooks/use-store-extension-package-query";
import { useStoreExtensionUpdatesQuery } from "@/modules/extensions/hooks/use-store-extension-updates-query";
import { useStoreExtensionsSearchQuery } from "@/modules/extensions/hooks/use-store-extensions-search-query";
import { useUninstallExtensionMutation } from "@/modules/extensions/hooks/use-uninstall-extension-mutation";
import { useExtensionsUiStore } from "@/modules/extensions/store/use-extensions-ui-store";
import type {
  ExtensionPreferenceField,
  HeuristicViolation,
  InstalledExtensionSummary,
} from "@/modules/extensions/types";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface ExtensionsViewProps {
  onBack: () => void;
}

interface InstallConfirmationState {
  title: string;
  violations: HeuristicViolation[];
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

function toInstallInput(
  input:
    | {
        packageId: string;
        slug: string;
        title: string;
        releaseVersion?: string;
        channel?: string;
      }
    | {
        id: string;
        slug: string;
        title: string;
        latestRelease: { version: string; channelName?: string };
      },
) {
  if ("packageId" in input) {
    return input;
  }

  return {
    packageId: input.id,
    slug: input.slug,
    title: input.title,
    releaseVersion: input.latestRelease.version,
    channel: input.latestRelease.channelName || undefined,
  };
}

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /mac/i.test(navigator.platform);
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

  const selectedStore = useMemo(() => {
    const selectedStoreRow = state.selectedRow;
    if (!selectedStoreRow || selectedStoreRow.kind !== "store") {
      return null;
    }

    return (storeSearchQuery.data ?? []).find((entry) => entry.id === selectedStoreRow.id) ?? null;
  }, [state.selectedRow, storeSearchQuery.data]);

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

  const selectedInstalledActionContext = useMemo<ExtensionInstalledActionContext | null>(
    () =>
      selectedInstalled
        ? {
            id: selectedInstalled.id,
            slug: selectedInstalled.slug,
            title: selectedInstalled.title,
          }
        : null,
    [selectedInstalled?.id, selectedInstalled?.slug, selectedInstalled?.title],
  );

  const selectedInstalledUpdateActionContext =
    useMemo<ExtensionInstalledUpdateActionContext | null>(
      () =>
        selectedInstalledUpdate
          ? {
              id: selectedInstalledUpdate.id,
              latestVersion: selectedInstalledUpdate.latestVersion,
              latestRelease: {
                channelName: selectedInstalledUpdate.latestRelease.channelName || undefined,
              },
            }
          : null,
      [
        selectedInstalledUpdate?.id,
        selectedInstalledUpdate?.latestRelease.channelName,
        selectedInstalledUpdate?.latestVersion,
      ],
    );

  const selectedStoreActionContext = useMemo<ExtensionStoreActionContext | null>(
    () =>
      selectedStoreDetail
        ? {
            id: selectedStoreDetail.id,
            slug: selectedStoreDetail.slug,
            title: selectedStoreDetail.title,
            latestRelease: {
              version: selectedStoreDetail.latestRelease.version,
              channelName: selectedStoreDetail.latestRelease.channelName || undefined,
            },
            readmeUrl: selectedStoreDetail.readmeUrl,
            sourceUrl: selectedStoreDetail.sourceUrl,
            homepageUrl: selectedStoreDetail.source.homepageUrl,
            sourceLabel: selectedStoreDetail.source.label,
          }
        : null,
    [
      selectedStoreDetail?.id,
      selectedStoreDetail?.latestRelease.channelName,
      selectedStoreDetail?.latestRelease.version,
      selectedStoreDetail?.readmeUrl,
      selectedStoreDetail?.slug,
      selectedStoreDetail?.source.homepageUrl,
      selectedStoreDetail?.source.label,
      selectedStoreDetail?.sourceUrl,
      selectedStoreDetail?.title,
    ],
  );

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

  const selectableRows = useMemo<SelectedExtensionsRow[]>(
    () => [
      ...filteredInstalledExtensions.map((entry) => ({ kind: "installed", id: entry.id }) as const),
      ...(storeSearchQuery.data ?? []).map((entry) => ({ kind: "store", id: entry.id }) as const),
    ],
    [filteredInstalledExtensions, storeSearchQuery.data],
  );

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

  const resolvedOptimisticInstalledSlugs = useMemo(() => {
    if (state.optimisticInstalledSlugs.length === 0) {
      return state.optimisticInstalledSlugs;
    }

    const installedSlugSet = new Set(installedExtensions.map((entry) => entry.slug.toLowerCase()));
    return state.optimisticInstalledSlugs.filter(
      (entry) => !installedSlugSet.has(entry.toLowerCase()),
    );
  }, [installedExtensions, state.optimisticInstalledSlugs]);

  useEffect(() => {
    if (areSelectedRowsEqual(state.selectedRow, desiredSelectedRow)) {
      return;
    }

    dispatch({ type: "set-selected-row", value: desiredSelectedRow });
  }, [desiredSelectedRow, state.selectedRow]);

  useEffect(() => {
    if (state.preferenceDraftState.key === preferenceDraftKey) {
      return;
    }

    dispatch({
      type: "set-preference-draft-state",
      value: {
        key: preferenceDraftKey,
        values: seededPreferenceValues,
        validationError: null,
        saveError: null,
      },
    });
  }, [preferenceDraftKey, seededPreferenceValues, state.preferenceDraftState.key]);

  useEffect(() => {
    const hasChanges =
      resolvedOptimisticInstalledSlugs.length !== state.optimisticInstalledSlugs.length ||
      resolvedOptimisticInstalledSlugs.some(
        (entry, index) => entry !== state.optimisticInstalledSlugs[index],
      );

    if (!hasChanges) {
      return;
    }

    dispatch({ type: "set-optimistic-installed-slugs", value: resolvedOptimisticInstalledSlugs });
  }, [resolvedOptimisticInstalledSlugs, state.optimisticInstalledSlugs]);

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

  const moveSelection = useCallback(
    (direction: -1 | 1) => {
      if (selectableRows.length === 0) {
        return;
      }

      const currentIndex = selectableRows.findIndex((entry) =>
        areSelectedRowsEqual(entry, state.selectedRow),
      );
      const nextIndex =
        currentIndex < 0
          ? direction > 0
            ? 0
            : selectableRows.length - 1
          : Math.min(Math.max(currentIndex + direction, 0), selectableRows.length - 1);

      dispatch({ type: "set-selected-row", value: selectableRows[nextIndex] ?? null });
    },
    [selectableRows, state.selectedRow],
  );

  const [installConfirmation, setInstallConfirmation] = useState<InstallConfirmationState | null>(
    null,
  );
  const installConfirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const closeInstallConfirmation = useCallback((confirmed: boolean) => {
    const resolve = installConfirmationResolverRef.current;
    installConfirmationResolverRef.current = null;
    setInstallConfirmation(null);
    resolve?.(confirmed);
  }, []);

  const requestInstallConfirmation = useCallback(
    (title: string, violations: HeuristicViolation[]) => {
      installConfirmationResolverRef.current?.(false);

      return new Promise<boolean>((resolve) => {
        installConfirmationResolverRef.current = resolve;
        setInstallConfirmation({ title, violations });
      });
    },
    [],
  );

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
          const shouldForceInstall = await requestInstallConfirmation(
            input.title,
            result.violations,
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
      } finally {
        dispatch({ type: "set-pending-install-slug", value: null });
      }
    },
    [
      handleRefreshInstalled,
      installExtensionMutation,
      requestInstallConfirmation,
      state.optimisticInstalledSlugs,
    ],
  );

  const handleUninstall = useCallback(
    async (entry: Pick<InstalledExtensionSummary, "slug" | "title">) => {
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

  const handleSelectedUninstall = useCallback(() => {
    if (!selectedInstalledActionContext) {
      return;
    }

    void handleUninstall(selectedInstalledActionContext);
  }, [handleUninstall, selectedInstalledActionContext]);

  const handleInstallActionRef = useRef(handleInstall);
  const handleRefreshActionRef = useRef(handleRefreshInstalled);
  const handleSelectedUninstallActionRef = useRef(handleSelectedUninstall);

  useEffect(() => {
    handleInstallActionRef.current = handleInstall;
  }, [handleInstall]);

  useEffect(() => {
    handleRefreshActionRef.current = handleRefreshInstalled;
  }, [handleRefreshInstalled]);

  useEffect(() => {
    handleSelectedUninstallActionRef.current = handleSelectedUninstall;
  }, [handleSelectedUninstall]);

  useMountEffect(() => {
    return () => {
      installConfirmationResolverRef.current?.(false);
      installConfirmationResolverRef.current = null;
    };
  });

  const handleInstallAction = useCallback(
    (input: {
      packageId: string;
      slug: string;
      title: string;
      releaseVersion?: string;
      channel?: string;
    }) => handleInstallActionRef.current(input),
    [],
  );

  const handleRefreshAction = useCallback(() => handleRefreshActionRef.current(), []);
  const handleSelectedUninstallAction = useCallback(
    () => handleSelectedUninstallActionRef.current(),
    [],
  );

  const handlePrimarySelectionAction = useCallback(() => {
    if (selectedInstalled && selectedInstalledUpdate) {
      void handleInstall(
        toInstallInput({
          packageId: selectedInstalledUpdate.id,
          slug: selectedInstalled.slug,
          title: selectedInstalled.title,
          releaseVersion: selectedInstalledUpdate.latestVersion,
          channel: selectedInstalledUpdate.latestRelease.channelName || undefined,
        }),
      );
      return;
    }

    if (selectedStoreDetail) {
      void handleInstall(toInstallInput(selectedStoreDetail));
    }
  }, [handleInstall, selectedInstalled, selectedInstalledUpdate, selectedStoreDetail]);

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

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        moveSelection(1);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        moveSelection(-1);
      }

      if (
        event.key === "Enter" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        handlePrimarySelectionAction();
      }
    },
    [handlePrimarySelectionAction, moveSelection],
  );

  const handleSavePreferences = async () => {
    if (!selectedInstalled?.pluginName) {
      return;
    }

    const missingRequiredField = selectedInstalled.preferences.find((field) =>
      isMissingRequiredField(field, state.preferenceDraftState.values[field.name]),
    );
    if (missingRequiredField) {
      dispatch({
        type: "set-preference-draft-state",
        value: {
          ...state.preferenceDraftState,
          validationError: `"${missingRequiredField.title}" is required.`,
        },
      });
      return;
    }

    dispatch({
      type: "set-preference-draft-state",
      value: {
        ...state.preferenceDraftState,
        validationError: null,
        saveError: null,
      },
    });
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
      dispatch({
        type: "set-preference-draft-state",
        value: {
          ...state.preferenceDraftState,
          saveError:
            error instanceof Error ? error.message : "Failed to save extension preferences.",
        },
      });
    }

    dispatch({ type: "set-preference-saving", value: false });
  };

  useLauncherPanelBackHandler("extensions", onBack);

  useMountEffect(() => {
    clearExtensionActionsState();
    return clearExtensionActionsState;
  });

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
  const footerSelectionTitle = selectedInstalled?.title ?? selectedStoreDetail?.title ?? null;
  const footerStatusLabel = state.pendingInstallSlug
    ? `Installing ${state.pendingInstallSlug}...`
    : state.pendingUninstallSlug
      ? `Removing ${state.pendingUninstallSlug}...`
      : state.actionError
        ? state.actionError
        : footerSelectionTitle
          ? `Viewing ${footerSelectionTitle}`
          : "Search installed extensions and community packages.";
  const footerStatusToneClass = state.actionError
    ? "bg-[var(--icon-red-fg)]"
    : state.pendingInstallSlug || state.pendingUninstallSlug
      ? "bg-sky-400"
      : "bg-emerald-400/80";
  const actionsShortcutLabel = isMacPlatform() ? "⌘K" : "Ctrl+K";
  const visibleInstallViolations = installConfirmation?.violations.slice(0, 4) ?? [];
  const hiddenInstallViolationCount = Math.max(
    0,
    (installConfirmation?.violations.length ?? 0) - visibleInstallViolations.length,
  );

  useEffect(() => {
    syncExtensionActionsState({
      selectedInstalled: selectedInstalledActionContext,
      selectedInstalledUpdate: selectedInstalledUpdateActionContext,
      selectedStoreDetail: selectedInstalledActionContext ? null : selectedStoreActionContext,
      selectedStoreInstalled: Boolean(selectedStoreInstalled),
      onInstall: handleInstallAction,
      onUninstall: selectedInstalledActionContext ? handleSelectedUninstallAction : undefined,
      onRefresh: handleRefreshAction,
    });
  }, [
    handleInstallAction,
    handleRefreshAction,
    handleSelectedUninstallAction,
    selectedInstalledActionContext,
    selectedInstalledUpdateActionContext,
    selectedStoreInstalled,
    selectedStoreActionContext,
  ]);

  return (
    <>
      <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--ui-divider)] px-4 py-3">
          <div className="flex items-center gap-2 text-foreground/80 hover:text-foreground">
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="flex items-center justify-center rounded-md p-1 transition-colors hover:bg-[var(--launcher-card-hover-bg)]"
            >
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="text-[15px] font-semibold text-foreground">Community</h2>
          </div>
          <span className="text-[12px] tracking-wide text-muted-foreground">
            Installed extensions appear first.
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-[var(--ui-divider)] px-4 py-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search extensions..."
                value={extensionsUi.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full rounded-lg border border-[var(--ui-divider)] bg-[var(--launcher-card-bg)] py-2 pl-10 pr-4 text-sm text-foreground/90 outline-none transition-colors placeholder:text-muted-foreground focus:border-[var(--ring)]"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => void handleRefreshInstalled()}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--ui-divider)] bg-[var(--launcher-card-bg)] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground disabled:opacity-40"
            >
              <RefreshCcw className="size-3.5" />
              Refresh
            </button>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-12 bg-transparent">
            <div className="custom-scrollbar col-span-5 h-full min-h-0 overflow-y-auto border-r border-[var(--ui-divider)] p-2">
              <ExtensionsSidebar
                installedExtensions={filteredInstalledExtensions}
                isInstalledLoading={installedQuery.isLoading && installedQuery.data == null}
                installedErrorMessage={
                  installedQuery.isError ? "Failed to load installed extensions." : null
                }
                selectedInstalledId={
                  state.selectedRow?.kind === "installed" ? state.selectedRow.id : null
                }
                installedUpdateKeys={installedUpdateKeys}
                onSelectInstalled={(id) =>
                  dispatch({ type: "set-selected-row", value: { kind: "installed", id } })
                }
                search={normalizedSearch}
                minimumSearchLength={EXTENSIONS_STORE_SEARCH_MIN_LENGTH}
                storeResults={storeSearchQuery.data ?? []}
                selectedStoreId={state.selectedRow?.kind === "store" ? state.selectedRow.id : null}
                onSelectStore={(id) =>
                  dispatch({ type: "set-selected-row", value: { kind: "store", id } })
                }
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
            </div>
            <div className="custom-scrollbar col-span-7 flex min-h-0 flex-col overflow-y-auto p-4">
              <ExtensionsDetailPanel
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
                  dispatch({
                    type: "set-preference-draft-state",
                    value: {
                      ...state.preferenceDraftState,
                      validationError: null,
                      saveError: null,
                      values: { ...state.preferenceDraftState.values, [key]: value },
                    },
                  });
                }}
                onSavePreferences={handleSavePreferences}
                storeDetailIsLoading={
                  Boolean(selectedStorePackageQuery.isLoading) &&
                  selectedStorePackageQuery.data == null
                }
                storeDetailError={
                  selectedStorePackageQuery.error instanceof Error
                    ? selectedStorePackageQuery.error.message
                    : selectedStorePackageQuery.isError
                      ? "Failed to load package details."
                      : null
                }
              />
            </div>
          </div>

          <div
            className="flex shrink-0 items-center justify-between border-t border-[var(--footer-border)] px-4 py-3.5"
            style={{
              backdropFilter: "blur(48px) saturate(170%)",
              background: "var(--actions-panel-bg)",
            }}
          >
            <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-[var(--foreground)]">
              {state.pendingInstallSlug || state.pendingUninstallSlug ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-sky-400" />
              ) : (
                <span
                  className={`size-2 shrink-0 rounded-full ${footerStatusToneClass}`}
                  style={{
                    boxShadow: footerStatusToneClass.includes("sky")
                      ? "0 0 0 4px rgba(56, 189, 248, 0.18)"
                      : footerStatusToneClass.includes("red")
                        ? "0 0 0 4px rgba(239, 68, 68, 0.16)"
                        : "0 0 0 4px rgba(52, 211, 153, 0.18)",
                  }}
                />
              )}
              <span className="truncate">{footerStatusLabel}</span>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-[11.5px] font-medium text-muted-foreground/80">
              <button
                type="button"
                onClick={() => requestLauncherActionsToggle()}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--ui-divider)] bg-[var(--launcher-card-bg)] px-2.5 py-1.5 text-[11.5px] text-muted-foreground transition-colors hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
              >
                <span>Actions</span>
                <span className="rounded border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-1.5 py-0.5 text-[10.5px] leading-none text-muted-foreground/90">
                  {actionsShortcutLabel}
                </span>
              </button>
              <span className="size-1 rounded-full bg-muted-foreground/30" />
              <span>
                {normalizedSearch.length >= EXTENSIONS_STORE_SEARCH_MIN_LENGTH
                  ? `${storeResultCount} store results`
                  : `type ${EXTENSIONS_STORE_SEARCH_MIN_LENGTH}+ chars`}
              </span>
              <span className="size-1 rounded-full bg-muted-foreground/30" />
              <span>
                {updateCount > 0 ? `${updateCount} updates ready` : "everything up to date"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={installConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeInstallConfirmation(false);
          }
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Potential compatibility risks</DialogTitle>
            <DialogDescription>
              Beam found a few commands in{" "}
              {installConfirmation?.title ? `"${installConfirmation.title}"` : "this extension"}{" "}
              that may rely on APIs Beam does not fully support yet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              {visibleInstallViolations.map((entry, index) => (
                <div
                  key={`${entry.commandName}:${entry.reason}:${index}`}
                  className="rounded-xl border border-[var(--ui-divider)] bg-[var(--launcher-card-bg)] px-3 py-2.5"
                >
                  <div className="text-sm font-medium text-foreground">{entry.commandName}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">{entry.reason}</div>
                </div>
              ))}
            </div>

            {hiddenInstallViolationCount > 0 ? (
              <div className="text-xs text-muted-foreground">
                +{hiddenInstallViolationCount} more potential issue
                {hiddenInstallViolationCount === 1 ? "" : "s"} not shown here.
              </div>
            ) : null}

            <div className="text-xs leading-5 text-muted-foreground">
              You can still install it, but some commands may not behave correctly until Beam adds
              support for the missing APIs.
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="outline" onClick={() => closeInstallConfirmation(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => closeInstallConfirmation(true)}>
              Install anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
