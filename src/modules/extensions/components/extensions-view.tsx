import { useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, RefreshCcw, Save, Search, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import {
  DetailPanel,
  EmptyView,
  FormField,
  ListItem,
  MetadataBar,
  ModuleHeader,
  SearchInput,
  SectionHeader,
  SplitView,
  type MetadataBarItem,
} from "@/components/module";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import debounce from "@/lib/debounce";
import {
  EXTENSIONS_QUERY_KEY_INSTALLED,
  EXTENSIONS_QUERY_KEY_STORE_UPDATES,
  EXTENSIONS_SEARCH_DEBOUNCE_MS,
  EXTENSIONS_STORE_SEARCH_MIN_LENGTH,
} from "@/modules/extensions/constants";
import { ExtensionIcon } from "@/modules/extensions/components/extension-icon";
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
import { useStoreExtensionPackageQuery } from "@/modules/extensions/hooks/use-store-extension-package-query";
import { useStoreExtensionUpdatesQuery } from "@/modules/extensions/hooks/use-store-extension-updates-query";
import { useStoreExtensionsSearchQuery } from "@/modules/extensions/hooks/use-store-extensions-search-query";
import { useUninstallExtensionMutation } from "@/modules/extensions/hooks/use-uninstall-extension-mutation";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { useExtensionsUiStore } from "@/modules/extensions/store/use-extensions-ui-store";
import type {
  ExtensionPreferenceField,
  InstalledExtensionSummary,
} from "@/modules/extensions/types";

interface ExtensionsViewProps {
  onBack: () => void;
}

type SelectedExtensionsRow =
  | { kind: "installed"; id: string }
  | { kind: "store"; id: string }
  | null;

function stopFieldKeyPropagation(event: KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

function toInputValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return "";
  }
  return String(value);
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

function isMissingRequiredField(field: ExtensionPreferenceField, value: unknown): boolean {
  if (!field.required) {
    return false;
  }

  if (field.type === "checkbox") {
    return value !== true;
  }

  return toInputValue(value).trim().length === 0;
}

function compactMetadataRows(rows: Array<{ label: string; value: string }>): MetadataBarItem[] {
  return rows
    .filter((entry) => entry.value.trim().length > 0)
    .map((entry) => ({ label: entry.label, value: entry.value }));
}

function formatReleaseChannelLabel(channelName: string | undefined, channel: number): string {
  if (channelName && channelName.trim().length > 0) {
    return channelName.trim();
  }

  switch (channel) {
    case 1:
      return "stable";
    case 2:
      return "beta";
    case 3:
      return "nightly";
    case 4:
      return "custom";
    default:
      return "unspecified";
  }
}

function PreferenceEditor({
  fields,
  values,
  isLoading,
  isSaving,
  error,
  validationError,
  onChange,
  onSave,
}: {
  fields: ExtensionPreferenceField[];
  values: Record<string, unknown>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  validationError: string | null;
  onChange: (key: string, value: unknown) => void;
  onSave: () => Promise<void>;
}) {
  const renderField = (field: ExtensionPreferenceField) => {
    const label = field.required ? `${field.title} *` : field.title;
    const value = values[field.name];

    if (field.type === "dropdown") {
      return (
        <FormField
          key={field.name}
          label={<Label className="text-[12px] font-medium text-muted-foreground">{label}</Label>}
          description={field.description}
        >
          <Select
            value={toInputValue(value)}
            onValueChange={(nextValue) => onChange(field.name, nextValue)}
          >
            <SelectTrigger className="h-10 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-[13px]">
              <SelectValue placeholder={field.title} />
            </SelectTrigger>
            <SelectContent className="rounded-lg border border-[var(--launcher-card-border)]">
              {field.options.map((option) => (
                <SelectItem key={`${field.name}:${option.value}`} value={option.value}>
                  {option.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      );
    }

    if (field.type === "checkbox") {
      return (
        <div
          key={field.name}
          className="space-y-2 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 py-3"
        >
          <div className="flex items-center gap-3">
            <Checkbox
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(field.name, Boolean(checked))}
            />
            <Label className="text-[13px] font-medium text-foreground">{label}</Label>
          </div>
          {field.description ? (
            <p className="text-[11px] text-muted-foreground">{field.description}</p>
          ) : null}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <FormField
          key={field.name}
          label={<Label className="text-[12px] font-medium text-muted-foreground">{label}</Label>}
          description={field.description}
        >
          <Textarea
            value={toInputValue(value)}
            onChange={(event) => onChange(field.name, event.target.value)}
            onKeyDownCapture={stopFieldKeyPropagation}
            onKeyDown={stopFieldKeyPropagation}
            className="min-h-[110px] rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-[13px]"
          />
        </FormField>
      );
    }

    return (
      <FormField
        key={field.name}
        label={<Label className="text-[12px] font-medium text-muted-foreground">{label}</Label>}
        description={field.description}
      >
        <Input
          type={field.type === "password" ? "password" : "text"}
          value={toInputValue(value)}
          onChange={(event) => onChange(field.name, event.target.value)}
          onKeyDownCapture={stopFieldKeyPropagation}
          onKeyDown={stopFieldKeyPropagation}
          className="h-10 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-[13px]"
        />
      </FormField>
    );
  };

  return (
    <section className="space-y-3 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-medium text-foreground">Preferences</h3>
          <p className="text-[12px] text-muted-foreground">Extension-level configuration.</p>
        </div>
        <Button
          size="sm"
          onClick={() => void onSave()}
          disabled={isLoading || isSaving || fields.length === 0}
        >
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </Button>
      </div>

      {error || validationError ? (
        <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-3 py-2 text-[12px] text-[var(--icon-red-fg)]">
          {validationError || error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading preferences…
        </div>
      ) : fields.length === 0 ? (
        <div className="text-[12px] text-muted-foreground">
          No preferences declared by this extension.
        </div>
      ) : (
        <div className="space-y-3">{fields.map(renderField)}</div>
      )}
    </section>
  );
}

export function ExtensionsView({ onBack }: ExtensionsViewProps) {
  const queryClient = useQueryClient();
  const extensionsUi = useExtensionsUiStore();
  const [selectedRow, setSelectedRow] = useState<SelectedExtensionsRow>(null);
  const [pendingInstallSlug, setPendingInstallSlug] = useState<string | null>(null);
  const [pendingUninstallSlug, setPendingUninstallSlug] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [optimisticInstalledSlugs, setOptimisticInstalledSlugs] = useState<string[]>([]);
  const [preferenceValues, setPreferenceValues] = useState<Record<string, unknown>>({});
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPreferenceLoading, setIsPreferenceLoading] = useState(false);
  const [isPreferenceSaving, setIsPreferenceSaving] = useState(false);
  const preferenceRequestIdRef = useRef(0);

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
  const storeUpdatesQuery = useStoreExtensionUpdatesQuery();
  const installExtensionMutation = useInstallExtensionMutation();
  const uninstallExtensionMutation = useUninstallExtensionMutation();
  const loadExtensionPreferencesMutation = useLoadExtensionPreferencesMutation();
  const saveExtensionPreferencesMutation = useSaveExtensionPreferencesMutation();

  const installedExtensions = useMemo(
    () => toInstalledExtensionSummary(installedQuery.data ?? []),
    [installedQuery.data],
  );

  const displayedInstalledExtensions = useMemo(
    () => mergeInstalledWithOptimisticSlugs(installedExtensions, optimisticInstalledSlugs),
    [installedExtensions, optimisticInstalledSlugs],
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
      selectedRow?.kind === "installed"
        ? (filteredInstalledExtensions.find((entry) => entry.id === selectedRow.id) ?? null)
        : null,
    [filteredInstalledExtensions, selectedRow],
  );

  const selectedStore = useMemo(
    () =>
      selectedRow?.kind === "store"
        ? ((storeSearchQuery.data ?? []).find((entry) => entry.id === selectedRow.id) ?? null)
        : null,
    [selectedRow, storeSearchQuery.data],
  );
  const selectedStorePackageQuery = useStoreExtensionPackageQuery(selectedStore?.id ?? null);
  const selectedStoreDetail = selectedStorePackageQuery.data ?? selectedStore;

  const selectedInstalledUpdate = useMemo(() => {
    if (!selectedInstalled) {
      return null;
    }

    return (
      [...updateById.values()].find(
        (entry) =>
          entry.slug.toLowerCase() === selectedInstalled.slug.toLowerCase() &&
          selectedInstalled.owner.trim().length > 0,
      ) ?? null
    );
  }, [selectedInstalled, updateById]);

  useEffect(() => {
    if (selectedRow?.kind === "installed") {
      const exists = filteredInstalledExtensions.some((entry) => entry.id === selectedRow.id);
      if (exists) {
        return;
      }
    }

    if (selectedRow?.kind === "store") {
      const exists = (storeSearchQuery.data ?? []).some((entry) => entry.id === selectedRow.id);
      if (exists) {
        return;
      }
    }

    const firstInstalled = filteredInstalledExtensions[0];
    if (firstInstalled) {
      setSelectedRow({ kind: "installed", id: firstInstalled.id });
      return;
    }

    const firstStore = (storeSearchQuery.data ?? [])[0];
    if (firstStore) {
      setSelectedRow({ kind: "store", id: firstStore.id });
      return;
    }

    setSelectedRow(null);
  }, [filteredInstalledExtensions, selectedRow, storeSearchQuery.data]);

  useEffect(() => {
    if (!selectedInstalled?.pluginName || selectedInstalled.preferences.length === 0) {
      setPreferenceValues({});
      setPreferenceError(null);
      setValidationError(null);
      setIsPreferenceLoading(false);
      return;
    }

    preferenceRequestIdRef.current += 1;
    const requestId = preferenceRequestIdRef.current;
    setIsPreferenceLoading(true);
    setPreferenceError(null);
    setValidationError(null);
    setPreferenceValues(buildPreferenceValues(selectedInstalled.preferences, {}));

    loadExtensionPreferencesMutation
      .mutateAsync(selectedInstalled.pluginName)
      .then((savedValues) => {
        if (requestId !== preferenceRequestIdRef.current) {
          return;
        }
        setPreferenceValues(buildPreferenceValues(selectedInstalled.preferences, savedValues));
      })
      .catch((error) => {
        if (requestId !== preferenceRequestIdRef.current) {
          return;
        }
        setPreferenceError(
          error instanceof Error ? error.message : "Failed to load extension preferences.",
        );
      })
      .finally(() => {
        if (requestId === preferenceRequestIdRef.current) {
          setIsPreferenceLoading(false);
        }
      });
  }, [loadExtensionPreferencesMutation, selectedInstalled]);

  useEffect(() => {
    if (optimisticInstalledSlugs.length === 0) {
      return;
    }

    const installedSlugSet = new Set(installedExtensions.map((entry) => entry.slug.toLowerCase()));
    setOptimisticInstalledSlugs((current) =>
      current.filter((entry) => !installedSlugSet.has(entry.toLowerCase())),
    );
  }, [installedExtensions, optimisticInstalledSlugs.length]);

  const handleRefreshInstalled = useCallback(async () => {
    invalidateDiscoveredExtensionsCache();
    await queryClient.invalidateQueries({ queryKey: EXTENSIONS_QUERY_KEY_INSTALLED });
    await queryClient.invalidateQueries({ queryKey: EXTENSIONS_QUERY_KEY_STORE_UPDATES });
    await queryClient.refetchQueries({
      queryKey: EXTENSIONS_QUERY_KEY_INSTALLED,
      type: "active",
    });
    await queryClient.refetchQueries({
      queryKey: EXTENSIONS_QUERY_KEY_STORE_UPDATES,
      type: "active",
    });
  }, [queryClient]);

  const handleInstall = useCallback(
    async (input: {
      packageId: string;
      slug: string;
      title: string;
      releaseVersion?: string;
      channel?: string;
    }) => {
      setActionError(null);
      setPendingInstallSlug(input.slug);

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

        setOptimisticInstalledSlugs((current) => {
          const normalizedSlug = input.slug.trim();
          if (!normalizedSlug) {
            return current;
          }
          const alreadyExists = current.some(
            (entry) => entry.toLowerCase() === normalizedSlug.toLowerCase(),
          );
          return alreadyExists ? current : [...current, normalizedSlug];
        });
        await handleRefreshInstalled();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Failed to install extension.");
      } finally {
        setPendingInstallSlug(null);
      }
    },
    [handleRefreshInstalled, installExtensionMutation],
  );

  const handleUninstall = useCallback(
    async (entry: InstalledExtensionSummary) => {
      const shouldRemove = window.confirm(`Uninstall "${entry.title}" from Beam?`);
      if (!shouldRemove) {
        return;
      }

      setActionError(null);
      setPendingUninstallSlug(entry.slug);
      try {
        await uninstallExtensionMutation.mutateAsync(entry.slug);
        setOptimisticInstalledSlugs((current) =>
          current.filter((slug) => slug.toLowerCase() !== entry.slug.toLowerCase()),
        );
        await handleRefreshInstalled();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Failed to uninstall extension.");
      } finally {
        setPendingUninstallSlug(null);
      }
    },
    [handleRefreshInstalled, uninstallExtensionMutation],
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
      isMissingRequiredField(field, preferenceValues[field.name]),
    );
    if (missingRequiredField) {
      setValidationError(`"${missingRequiredField.title}" is required.`);
      return;
    }

    setValidationError(null);
    setPreferenceError(null);
    setIsPreferenceSaving(true);
    try {
      await saveExtensionPreferencesMutation.mutateAsync({
        pluginName: selectedInstalled.pluginName,
        values: preferenceValues,
      });
      toast.success(`Saved setup for ${selectedInstalled.title}.`);
      await handleRefreshInstalled();
    } catch (error) {
      setPreferenceError(
        error instanceof Error ? error.message : "Failed to save extension preferences.",
      );
    } finally {
      setIsPreferenceSaving(false);
    }
  };

  useLauncherPanelBackHandler("extensions", onBack);

  const selectedStoreInstalled =
    selectedStore &&
    filteredInstalledExtensions.some(
      (entry) => entry.slug.toLowerCase() === selectedStore.slug.toLowerCase(),
    );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--solid-bg)] text-foreground">
      <ModuleHeader
        onBack={onBack}
        title="Extensions"
        subtitle="Installed commands and the Beam store"
        badge={
          <ModuleHeader.Badge className="inline-flex items-center gap-1 rounded-lg px-2">
            <Sparkles className="size-3" />
            {displayedInstalledExtensions.length}
          </ModuleHeader.Badge>
        }
      />

      <div className="border-b border-[var(--ui-divider)] px-4 py-3">
        <SearchInput
          value={extensionsUi.search}
          onChange={handleSearchChange}
          placeholder="Search installed extensions or the Beam store"
          leftIcon={<Search />}
        />
      </div>

      <SplitView
        detailVisible
        templateColumns="320px minmax(0, 1fr)"
        primaryClassName="overflow-y-auto border-r border-[var(--ui-divider)] p-2"
        detailClassName="overflow-y-auto"
        primary={
          <div className="space-y-5">
            <section className="space-y-1">
              <SectionHeader title="Installed" />
              {installedQuery.isError ? (
                <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-3 py-2 text-[12px] text-[var(--icon-red-fg)]">
                  Failed to load installed extensions.
                </div>
              ) : filteredInstalledExtensions.length === 0 ? (
                <EmptyView
                  className="min-h-[120px] justify-start px-2 py-4"
                  contentClassName="max-w-none text-left"
                  title="No installed extensions match."
                />
              ) : (
                filteredInstalledExtensions.map((entry) => (
                  <ListItem
                    key={entry.id}
                    selected={selectedRow?.kind === "installed" && selectedRow.id === entry.id}
                    onSelect={() => setSelectedRow({ kind: "installed", id: entry.id })}
                    leftSlot={
                      <ExtensionIcon
                        iconReference={entry.icon}
                        title={entry.title}
                        className="size-9 rounded-lg"
                      />
                    }
                    rightSlot={
                      selectedInstalledUpdate &&
                      selectedInstalledUpdate.slug.toLowerCase() === entry.slug.toLowerCase() ? (
                        <span className="text-[11px] text-amber-700">Update</span>
                      ) : null
                    }
                  >
                    <ListItem.Title>{entry.title}</ListItem.Title>
                    <ListItem.Description>
                      {entry.owner}/{entry.slug}
                      {entry.version ? ` · v${entry.version}` : ""}
                    </ListItem.Description>
                  </ListItem>
                ))
              )}
            </section>

            <section className="space-y-1">
              <SectionHeader title="Store" />
              {normalizedSearch.length < EXTENSIONS_STORE_SEARCH_MIN_LENGTH ? (
                <EmptyView
                  className="min-h-[120px] justify-start px-2 py-4"
                  contentClassName="max-w-none text-left"
                  title={`Type at least ${EXTENSIONS_STORE_SEARCH_MIN_LENGTH} characters to search the Beam store.`}
                />
              ) : storeSearchQuery.isLoading || extensionsUi.isSearchDebouncing ? (
                <div className="flex items-center gap-2 px-2 py-2 text-[12px] text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Searching store…
                </div>
              ) : storeSearchQuery.isError ? (
                <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-3 py-2 text-[12px] text-[var(--icon-red-fg)]">
                  {storeSearchQuery.error instanceof Error
                    ? storeSearchQuery.error.message
                    : "Store search failed."}
                </div>
              ) : (storeSearchQuery.data ?? []).length === 0 ? (
                <EmptyView
                  className="min-h-[120px] justify-start px-2 py-4"
                  contentClassName="max-w-none text-left"
                  title="No store packages found."
                />
              ) : (
                (storeSearchQuery.data ?? []).map((entry) => (
                  <ListItem
                    key={entry.id}
                    selected={selectedRow?.kind === "store" && selectedRow.id === entry.id}
                    onSelect={() => setSelectedRow({ kind: "store", id: entry.id })}
                    leftSlot={
                      <ExtensionIcon
                        iconReference={
                          entry.icons.light || entry.icons.dark || entry.author.avatar || null
                        }
                        title={entry.title}
                        className="size-9 rounded-lg"
                      />
                    }
                    rightSlot={
                      entry.verification.label ? (
                        <span className="text-[11px] text-muted-foreground">
                          {entry.verification.label}
                        </span>
                      ) : null
                    }
                  >
                    <ListItem.Title>{entry.title}</ListItem.Title>
                    <ListItem.Description>
                      {entry.author.handle}/{entry.slug} · v{entry.latestRelease.version}
                    </ListItem.Description>
                  </ListItem>
                ))
              )}
            </section>
          </div>
        }
        detail={
          !selectedInstalled && !selectedStore ? (
            <DetailPanel className="h-full">
              <DetailPanel.Content className="flex items-center justify-center">
                <EmptyView
                  title="Select an extension"
                  description="Installed commands and store packages open here."
                />
              </DetailPanel.Content>
            </DetailPanel>
          ) : selectedInstalled ? (
          <DetailPanel className="h-full bg-transparent">
              <DetailPanel.Content className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <ExtensionIcon
                      iconReference={selectedInstalled.icon}
                      title={selectedInstalled.title}
                      className="size-12 rounded-xl"
                    />
                    <div>
                      <h2 className="text-[18px] font-semibold text-foreground">
                        {selectedInstalled.title}
                      </h2>
                      <p className="text-[12px] text-muted-foreground">
                        {selectedInstalled.owner}/{selectedInstalled.slug}
                        {selectedInstalled.version ? ` · v${selectedInstalled.version}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedInstalledUpdate ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          void handleInstall({
                            packageId: selectedInstalledUpdate.id,
                            slug: selectedInstalled.slug,
                            title: selectedInstalled.title,
                            releaseVersion: selectedInstalledUpdate.latestVersion,
                            channel:
                              selectedInstalledUpdate.latestRelease.channelName || undefined,
                          })
                        }
                        disabled={pendingInstallSlug === selectedInstalled.slug}
                      >
                        {pendingInstallSlug === selectedInstalled.slug ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCcw className="size-3.5" />
                        )}
                        Update
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[var(--icon-red-fg)]"
                      onClick={() => void handleUninstall(selectedInstalled)}
                      disabled={pendingUninstallSlug === selectedInstalled.slug}
                    >
                      {pendingUninstallSlug === selectedInstalled.slug ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      Uninstall
                    </Button>
                  </div>
                </div>

                {selectedInstalled.description ? (
                  <p className="max-w-2xl text-[13px] leading-6 text-foreground/90">
                    {selectedInstalled.description}
                  </p>
                ) : null}

                {selectedInstalledUpdate ? (
                  <section className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                      <RefreshCcw className="size-4" />
                      Update available
                    </div>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Installed v{selectedInstalled.version ?? "unknown"} · latest v
                      {selectedInstalledUpdate.latestVersion}
                    </p>
                  </section>
                ) : null}

                <section className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]">
                  <MetadataBar
                    items={compactMetadataRows([
                      { label: "Commands", value: String(selectedInstalled.commandCount) },
                      { label: "Version", value: selectedInstalled.version ?? "Unknown" },
                      {
                        label: "Preferences",
                        value:
                          selectedInstalled.preferences.length > 0
                            ? `${selectedInstalled.preferences.length} fields`
                            : "None",
                      },
                    ])}
                  />
                </section>

                <PreferenceEditor
                  fields={selectedInstalled.preferences}
                  values={preferenceValues}
                  isLoading={isPreferenceLoading}
                  isSaving={isPreferenceSaving}
                  error={preferenceError}
                  validationError={validationError}
                  onChange={(key, value) => {
                    setValidationError(null);
                    setPreferenceValues((previous) => ({ ...previous, [key]: value }));
                  }}
                  onSave={handleSavePreferences}
                />
              </DetailPanel.Content>
            </DetailPanel>
          ) : selectedStoreDetail ? (
            <DetailPanel className="h-full bg-transparent">
              <DetailPanel.Content className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <ExtensionIcon
                      iconReference={
                        selectedStoreDetail.icons.light ||
                        selectedStoreDetail.icons.dark ||
                        selectedStoreDetail.author.avatar ||
                        null
                      }
                      title={selectedStoreDetail.title}
                      className="size-12 rounded-xl"
                    />
                    <div>
                      <h2 className="text-[18px] font-semibold text-foreground">
                        {selectedStoreDetail.title}
                      </h2>
                      <p className="text-[12px] text-muted-foreground">
                        {selectedStoreDetail.author.handle}/{selectedStoreDetail.slug} · v
                        {selectedStoreDetail.latestRelease.version}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      void handleInstall({
                        packageId: selectedStoreDetail.id,
                        slug: selectedStoreDetail.slug,
                        title: selectedStoreDetail.title,
                        releaseVersion: selectedStoreDetail.latestRelease.version,
                        channel: selectedStoreDetail.latestRelease.channelName || undefined,
                      })
                    }
                    disabled={pendingInstallSlug === selectedStoreDetail.slug}
                  >
                    {pendingInstallSlug === selectedStoreDetail.slug ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    {selectedStoreInstalled ? "Reinstall" : "Install"}
                  </Button>
                </div>

                <p className="max-w-2xl text-[13px] leading-6 text-foreground/90">
                  {selectedStoreDetail.description ||
                    selectedStoreDetail.summary ||
                    "No description provided."}
                </p>

                {selectedStorePackageQuery.isLoading && selectedStorePackageQuery.data == null ? (
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading package details…
                  </div>
                ) : null}

                {selectedStorePackageQuery.isError ? (
                  <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-3 py-2 text-[12px] text-[var(--icon-red-fg)]">
                    {selectedStorePackageQuery.error instanceof Error
                      ? selectedStorePackageQuery.error.message
                      : "Failed to load package details."}
                  </div>
                ) : null}

                <section className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]">
                  <MetadataBar
                    items={compactMetadataRows([
                      { label: "Source", value: selectedStoreDetail.source.label },
                      {
                        label: "Verification",
                        value: selectedStoreDetail.verification.label || "Unspecified",
                      },
                      {
                        label: "Platforms",
                        value:
                          selectedStoreDetail.compatibility.platforms.join(", ") || "Unspecified",
                      },
                      {
                        label: "Desktop Environments",
                        value:
                          selectedStoreDetail.compatibility.desktopEnvironments.join(", ") ||
                          "Unspecified",
                      },
                      {
                        label: "Commands",
                        value: String(selectedStoreDetail.manifest?.commands.length ?? 0),
                      },
                      {
                        label: "Channel",
                        value: formatReleaseChannelLabel(
                          selectedStoreDetail.latestRelease.channelName,
                          selectedStoreDetail.latestRelease.channel,
                        ),
                      },
                      {
                        label: "Releases",
                        value: String(selectedStoreDetail.releases.length),
                      },
                    ])}
                  />
                </section>

                {selectedStoreDetail.latestRelease.releaseNotes?.summary ||
                selectedStoreDetail.latestRelease.releaseNotes?.markdown ? (
                  <section className="space-y-2 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4">
                    <h3 className="text-[13px] font-medium text-foreground">Latest release</h3>
                    {selectedStoreDetail.latestRelease.releaseNotes?.summary ? (
                      <p className="text-[12px] text-foreground/90">
                        {selectedStoreDetail.latestRelease.releaseNotes.summary}
                      </p>
                    ) : null}
                    <div className="text-[11px] text-muted-foreground">
                      v{selectedStoreDetail.latestRelease.version} ·{" "}
                      {formatReleaseChannelLabel(
                        selectedStoreDetail.latestRelease.channelName,
                        selectedStoreDetail.latestRelease.channel,
                      )}
                      {selectedStoreDetail.latestRelease.publishedAt
                        ? ` · ${selectedStoreDetail.latestRelease.publishedAt}`
                        : ""}
                    </div>
                  </section>
                ) : null}

                {selectedStoreDetail.categories.length > 0 || selectedStoreDetail.tags.length > 0 ? (
                  <section className="space-y-2 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4">
                    <h3 className="text-[13px] font-medium text-foreground">Metadata</h3>
                    <div className="flex flex-wrap gap-2">
                      {[...selectedStoreDetail.categories, ...selectedStoreDetail.tags].map(
                        (entry) => (
                        <span
                          key={entry}
                          className="rounded-md border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {entry}
                        </span>
                        ),
                      )}
                    </div>
                  </section>
                ) : null}
              </DetailPanel.Content>
            </DetailPanel>
          ) : null
        }
      />

      {actionError ? (
        <div className="border-t border-[var(--ui-divider)] px-4 py-2 text-[12px] text-[var(--icon-red-fg)]">
          {actionError}
        </div>
      ) : null}
    </div>
  );
}
