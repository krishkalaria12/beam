import { Download, Loader2, RefreshCcw, Trash2 } from "lucide-react";

import { DetailPanel, EmptyView, MarkdownView, MetadataBar, type MetadataBarItem } from "@/components/module";
import { Button } from "@/components/ui/button";
import { ExtensionIcon } from "@/modules/extensions/components/extension-icon";
import { PreferenceEditor } from "@/modules/extensions/components/extensions-view/preference-editor";
import type {
  ExtensionStoreListing,
  ExtensionStoreUpdate,
  InstalledExtensionSummary,
} from "@/modules/extensions/types";

function isSyntheticRaycastVersion(version: string | null | undefined): boolean {
  return typeof version === "string" && /^0\.0\.\d{9,}$/.test(version.trim());
}

function formatInstalledVersion(version: string | null | undefined): string | null {
  if (!version || isSyntheticRaycastVersion(version)) {
    return null;
  }

  return `v${version}`;
}

function formatStoreHeaderMeta(entry: ExtensionStoreListing): string {
  const sourceLabel = entry.source.label.trim();
  const isRaycast = entry.source.id.trim().toLowerCase() === "raycast";
  const version = entry.latestRelease.version.trim();

  if (isRaycast || /^0\.0\.\d{9,}$/.test(version)) {
    return `${entry.author.handle}/${entry.slug} · ${sourceLabel}`;
  }

  return `${entry.author.handle}/${entry.slug} · v${version}`;
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

interface ExtensionsDetailPaneProps {
  selectedInstalled: InstalledExtensionSummary | null;
  selectedInstalledUpdate: ExtensionStoreUpdate | null;
  selectedStoreDetail: ExtensionStoreListing | null;
  selectedStoreInstalled: boolean;
  pendingInstallSlug: string | null;
  pendingUninstallSlug: string | null;
  onInstall: (input: {
    packageId: string;
    slug: string;
    title: string;
    releaseVersion?: string;
    channel?: string;
  }) => Promise<void>;
  onUninstall: (entry: InstalledExtensionSummary) => Promise<void>;
  isPreferenceLoading: boolean;
  isPreferenceSaving: boolean;
  preferenceValues: Record<string, unknown>;
  preferenceError: string | null;
  validationError: string | null;
  onChangePreference: (key: string, value: unknown) => void;
  onSavePreferences: () => Promise<void>;
  storeDetailIsLoading: boolean;
  storeDetailError: string | null;
}

export function ExtensionsDetailPane({
  selectedInstalled,
  selectedInstalledUpdate,
  selectedStoreDetail,
  selectedStoreInstalled,
  pendingInstallSlug,
  pendingUninstallSlug,
  onInstall,
  onUninstall,
  isPreferenceLoading,
  isPreferenceSaving,
  preferenceValues,
  preferenceError,
  validationError,
  onChangePreference,
  onSavePreferences,
  storeDetailIsLoading,
  storeDetailError,
}: ExtensionsDetailPaneProps) {
  const installedVersionLabel = formatInstalledVersion(selectedInstalled?.version);

  if (!selectedInstalled && !selectedStoreDetail) {
    return (
      <DetailPanel className="h-full">
        <DetailPanel.Content className="flex items-center justify-center">
          <EmptyView
            title="Select an extension"
            description="Installed commands and store packages open here."
          />
        </DetailPanel.Content>
      </DetailPanel>
    );
  }

  if (selectedInstalled) {
    return (
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
                <h2 className="text-[18px] font-semibold text-foreground">{selectedInstalled.title}</h2>
                <p className="text-[12px] text-muted-foreground">
                  {selectedInstalled.owner}/{selectedInstalled.slug}
                  {installedVersionLabel ? ` · ${installedVersionLabel}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedInstalledUpdate ? (
                <Button
                  size="sm"
                  onClick={() =>
                    void onInstall({
                      packageId: selectedInstalledUpdate.id,
                      slug: selectedInstalled.slug,
                      title: selectedInstalled.title,
                      releaseVersion: selectedInstalledUpdate.latestVersion,
                      channel: selectedInstalledUpdate.latestRelease.channelName || undefined,
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
                onClick={() => void onUninstall(selectedInstalled)}
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
                {installedVersionLabel
                  ? `Installed ${installedVersionLabel}`
                  : "Installed build"}
                {selectedInstalledUpdate.id.startsWith("raycast:")
                  ? " · latest Raycast Store build"
                  : ` · latest v${selectedInstalledUpdate.latestVersion}`}
              </p>
            </section>
          ) : null}

          <section className="rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]">
            <MetadataBar
              items={compactMetadataRows([
                { label: "Commands", value: String(selectedInstalled.commandCount) },
                {
                  label: "Version",
                  value:
                    installedVersionLabel?.replace(/^v/, "") ??
                    (isSyntheticRaycastVersion(selectedInstalled.version)
                      ? "Raycast Store build"
                      : "Unknown"),
                },
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
            onChange={onChangePreference}
            onSave={onSavePreferences}
          />
        </DetailPanel.Content>
      </DetailPanel>
    );
  }

  if (!selectedStoreDetail) {
    return null;
  }

  return (
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
              <h2 className="text-[18px] font-semibold text-foreground">{selectedStoreDetail.title}</h2>
              <p className="text-[12px] text-muted-foreground">{formatStoreHeaderMeta(selectedStoreDetail)}</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() =>
              void onInstall({
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
          {selectedStoreDetail.description || selectedStoreDetail.summary || "No description provided."}
        </p>

        {storeDetailIsLoading ? (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading package details…
          </div>
        ) : null}

        {storeDetailError ? (
          <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-3 py-2 text-[12px] text-[var(--icon-red-fg)]">
            {storeDetailError}
          </div>
        ) : null}

        <section className="rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]">
          <MetadataBar
            items={compactMetadataRows([
              { label: "Source", value: selectedStoreDetail.source.label },
              {
                label: "Verification",
                value: selectedStoreDetail.verification.label || "Unspecified",
              },
              {
                label: "Platforms",
                value: selectedStoreDetail.compatibility.platforms.join(", ") || "Unspecified",
              },
              {
                label: "Desktop Environments",
                value:
                  selectedStoreDetail.compatibility.desktopEnvironments.join(", ") || "Unspecified",
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
          <section className="space-y-3 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4">
            <h3 className="text-[13px] font-medium text-foreground">Latest release</h3>
            {selectedStoreDetail.latestRelease.releaseNotes?.summary ? (
              <p className="text-[12px] text-foreground/90">
                {selectedStoreDetail.latestRelease.releaseNotes.summary}
              </p>
            ) : null}
            {selectedStoreDetail.latestRelease.releaseNotes?.markdown ? (
              <div className="rounded-md border border-[var(--launcher-card-border)] bg-[var(--solid-bg-recessed)] p-3">
                <MarkdownView>{selectedStoreDetail.latestRelease.releaseNotes.markdown}</MarkdownView>
              </div>
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
          <section className="space-y-2 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4">
            <h3 className="text-[13px] font-medium text-foreground">Metadata</h3>
            <div className="flex flex-wrap gap-2">
              {[...selectedStoreDetail.categories, ...selectedStoreDetail.tags].map((entry) => (
                <span
                  key={entry}
                  className="rounded-md border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {entry}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </DetailPanel.Content>
    </DetailPanel>
  );
}
