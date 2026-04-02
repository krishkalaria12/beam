import {
  BookOpen,
  Check,
  Download,
  ExternalLink,
  Globe,
  ImageIcon,
  Info,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { EmptyView, MarkdownView } from "@/components/module";
import { Button } from "@/components/ui/button";
import { openExternalUrl } from "@/lib/open-external-url";
import { cn } from "@/lib/utils";
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

function formatPublishedAt(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function openExtensionExternalUrl(url: string | undefined): void {
  if (!url) return;
  void openExternalUrl(url);
}

function joinValues(values: string[]): string {
  return values.filter((value) => value.trim().length > 0).join(", ");
}

/* UI Primitives */

function DetailTabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-launcher-xs font-medium transition-colors hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="[&_svg]:size-3.5">{icon}</span>
      {label}
    </button>
  );
}

function DetailContainer({ children }: { children: ReactNode }) {
  return <div className="space-y-6 pt-4">{children}</div>;
}

function DetailSectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-launcher-md font-semibold text-foreground">{children}</h3>;
}

function DetailBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded bg-[var(--launcher-card-bg)] px-2 py-0.5 text-launcher-xs font-medium border",
        tone === "success"
          ? "border-[color:var(--status-success)] bg-[color:var(--status-success-soft)] text-[color:var(--status-success)]"
          : tone === "info"
            ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
            : "border-[var(--ui-divider)] text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function DetailMetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex border-b border-[var(--ui-divider)] py-2.5 last:border-0 text-launcher-sm">
      <div className="w-1/3 text-muted-foreground">{label}</div>
      <div className="w-2/3 text-foreground font-medium">{value}</div>
    </div>
  );
}

function LinkAction({ label, url }: { label: string; url: string | undefined }) {
  if (!url) return null;
  return (
    <button
      type="button"
      onClick={() => openExtensionExternalUrl(url)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ui-divider)] bg-[var(--launcher-card-bg)] px-3 py-1.5 text-launcher-xs font-medium text-foreground transition-colors hover:border-[var(--ring)] hover:bg-[var(--launcher-card-hover-bg)]"
    >
      <ExternalLink className="size-3.5" />
      {label}
    </button>
  );
}

function ScreenshotGrid({ screenshots }: { screenshots: string[] }) {
  if (screenshots.length === 0) {
    return <div className="text-launcher-sm text-muted-foreground">No screenshots available.</div>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {screenshots.map((screenshot, index) => (
        <button
          key={`${screenshot}-${index}`}
          type="button"
          onClick={() => openExtensionExternalUrl(screenshot)}
          className="group overflow-hidden rounded-xl border border-[var(--ui-divider)] bg-[var(--solid-bg-recessed)] text-left transition-colors hover:border-[var(--ring)]"
        >
          <img
            src={screenshot}
            alt="Extension screenshot"
            className="h-48 w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
            loading="lazy"
            draggable={false}
          />
        </button>
      ))}
    </div>
  );
}

function StoreCommandsList({
  commands,
}: {
  commands: Array<{ name: string; title?: string; description?: string }>;
}) {
  if (!commands || commands.length === 0) {
    return <div className="text-launcher-sm text-muted-foreground">No commands available.</div>;
  }
  return (
    <div className="space-y-2">
      {commands.map((command, index) => (
        <div
          key={`${command.name || command.title || "command"}-${index}`}
          className="flex items-center gap-3 rounded-xl border border-[var(--ui-divider)] bg-[var(--launcher-card-bg)] px-3 py-2"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[var(--ui-divider)] bg-[var(--solid-bg-recessed)] text-muted-foreground">
            <Terminal className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-launcher-sm font-medium text-foreground">
              {command.title?.trim() || command.name}
            </div>
            <div className="truncate text-launcher-xs text-muted-foreground">
              {command.description?.trim() || "No description"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ExtensionsDetailPanelProps {
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

function EmptyExtensionsDetailPanel() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-launcher-sm text-muted-foreground">
      Select an extension to view details
    </div>
  );
}

type InstalledDetailTab = "overview" | "setup";

function InstalledExtensionDetailPane({
  selectedInstalled,
  selectedInstalledUpdate,
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
}: Pick<
  ExtensionsDetailPanelProps,
  | "selectedInstalled"
  | "selectedInstalledUpdate"
  | "pendingInstallSlug"
  | "pendingUninstallSlug"
  | "onInstall"
  | "onUninstall"
  | "isPreferenceLoading"
  | "isPreferenceSaving"
  | "preferenceValues"
  | "preferenceError"
  | "validationError"
  | "onChangePreference"
  | "onSavePreferences"
>) {
  const [tab, setTab] = useState<InstalledDetailTab>("overview");

  if (!selectedInstalled) return null;

  const installedVersionLabel = formatInstalledVersion(selectedInstalled.version);
  const hasPreferences = selectedInstalled.preferences.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--ui-divider)] bg-[var(--solid-bg-recessed)] p-0.5">
          <ExtensionIcon
            iconReference={selectedInstalled.icon}
            title={selectedInstalled.title}
            className="size-full rounded-lg object-contain"
          />
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="truncate text-launcher-xl font-semibold text-foreground">
            {selectedInstalled.title}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-launcher-sm font-medium text-muted-foreground">
            <span>
              {selectedInstalled.owner}/{selectedInstalled.slug}
            </span>
            {installedVersionLabel ? <span>· {installedVersionLabel}</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          {selectedInstalledUpdate ? (
            <Button
              size="sm"
              className="min-w-24"
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
                <>
                  <Loader2 className="animate-spin" />
                  Updating
                </>
              ) : (
                <>
                  <RefreshCcw />
                  Update
                </>
              )}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="min-w-24 text-[var(--icon-red-fg)] hover:text-[var(--icon-red-fg)] hover:bg-[var(--icon-red-bg)] border-[var(--ui-divider)]"
            onClick={() => void onUninstall(selectedInstalled)}
            disabled={pendingUninstallSlug === selectedInstalled.slug}
          >
            {pendingUninstallSlug === selectedInstalled.slug ? (
              <>
                <Loader2 className="animate-spin" />
                Removing
              </>
            ) : (
              <>
                <Trash2 />
                Uninstall
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-[var(--ui-divider)] -mx-4 px-4">
        <DetailTabButton
          active={tab === "overview"}
          onClick={() => setTab("overview")}
          icon={<Info />}
          label="Overview"
        />
        <DetailTabButton
          active={tab === "setup"}
          onClick={() => setTab("setup")}
          icon={<Sparkles />}
          label="Setup"
        />
      </div>

      <div className="flex-1 overflow-y-auto pt-4">
        {tab === "overview" && (
          <DetailContainer>
            <div className="text-launcher-md leading-relaxed text-foreground/90">
              {selectedInstalled.description || "This extension is installed and ready to use."}
            </div>

            {selectedInstalledUpdate && (
              <div className="rounded-lg border border-[var(--ui-divider)] bg-[var(--launcher-card-bg)] p-3">
                <div className="flex items-center gap-2 text-launcher-md font-medium text-sky-400">
                  <RefreshCcw className="size-3.5" />
                  Update available
                </div>
                <div className="mt-1 text-launcher-xs text-muted-foreground">
                  Version {selectedInstalledUpdate.latestVersion} is available.
                </div>
              </div>
            )}

            <div>
              <DetailSectionTitle>Stats</DetailSectionTitle>
              <div className="flex flex-col rounded-lg border border-[var(--ui-divider)] bg-[var(--launcher-card-bg)] px-4">
                <DetailMetaRow
                  label="Plugin Engine"
                  value={selectedInstalled.pluginName ?? "Unknown"}
                />
                <DetailMetaRow label="Command Count" value={selectedInstalled.commandCount} />
                <DetailMetaRow label="Preferences" value={selectedInstalled.preferences.length} />
              </div>
            </div>
          </DetailContainer>
        )}

        {tab === "setup" && (
          <DetailContainer>
            <DetailSectionTitle>Configuration</DetailSectionTitle>
            {!hasPreferences ? (
              <div className="text-launcher-sm text-muted-foreground">
                This extension has no configurable preferences.
              </div>
            ) : (
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
            )}
          </DetailContainer>
        )}
      </div>
    </div>
  );
}

type StoreDetailTab = "overview" | "commands" | "screenshots" | "release";

function StoreExtensionDetailPane({
  selectedStoreDetail,
  selectedStoreInstalled,
  pendingInstallSlug,
  onInstall,
  storeDetailIsLoading,
  storeDetailError,
}: Pick<
  ExtensionsDetailPanelProps,
  | "selectedStoreDetail"
  | "selectedStoreInstalled"
  | "pendingInstallSlug"
  | "onInstall"
  | "storeDetailIsLoading"
  | "storeDetailError"
>) {
  const [tab, setTab] = useState<StoreDetailTab>("overview");

  if (!selectedStoreDetail) return null;

  const commands = selectedStoreDetail.manifest?.commands ?? [];
  const screenshots = selectedStoreDetail.screenshots ?? [];
  const publishedAtLabel = formatPublishedAt(selectedStoreDetail.latestRelease.publishedAt);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--ui-divider)] bg-[var(--solid-bg-recessed)] p-0.5">
          <ExtensionIcon
            iconReference={
              selectedStoreDetail.icons.light ||
              selectedStoreDetail.icons.dark ||
              selectedStoreDetail.author.avatar ||
              null
            }
            title={selectedStoreDetail.title}
            className="size-full rounded-lg object-contain"
          />
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="truncate text-launcher-xl font-semibold text-foreground">
            {selectedStoreDetail.title}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-launcher-sm font-medium text-muted-foreground">
            <span>{formatStoreHeaderMeta(selectedStoreDetail)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-muted-foreground">
            {selectedStoreInstalled && (
              <DetailBadge tone="success">
                <Check className="size-3" /> Installed
              </DetailBadge>
            )}
            <DetailBadge tone="info">
              <ShieldCheck className="size-3" />{" "}
              {selectedStoreDetail.verification.label || "Unverified"}
            </DetailBadge>
            <DetailBadge>{commands.length} commands</DetailBadge>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="min-w-24"
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
              <>
                <Loader2 className="animate-spin" />
                Installing
              </>
            ) : (
              <>
                <Download />
                {selectedStoreInstalled ? "Reinstall" : "Install"}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-[var(--ui-divider)] -mx-4 px-4 overflow-x-auto custom-scrollbar">
        <DetailTabButton
          active={tab === "overview"}
          onClick={() => setTab("overview")}
          icon={<Info />}
          label="Overview"
        />
        <DetailTabButton
          active={tab === "commands"}
          onClick={() => setTab("commands")}
          icon={<Terminal />}
          label="Commands"
        />
        <DetailTabButton
          active={tab === "screenshots"}
          onClick={() => setTab("screenshots")}
          icon={<ImageIcon />}
          label="Screenshots"
        />
        <DetailTabButton
          active={tab === "release"}
          onClick={() => setTab("release")}
          icon={<BookOpen />}
          label="Release info"
        />
      </div>

      <div className="flex-1 overflow-y-auto pt-4 relative">
        {storeDetailIsLoading && (
          <div className="absolute inset-0 bg-[var(--solid-bg-recessed)]/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {storeDetailError && (
          <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-4 py-3 text-launcher-sm text-[var(--icon-red-fg)] mb-4">
            {storeDetailError}
          </div>
        )}

        {tab === "overview" && (
          <DetailContainer>
            <div className="text-launcher-lg leading-relaxed text-foreground/90 font-medium">
              {selectedStoreDetail.description ||
                selectedStoreDetail.summary ||
                "No description provided."}
            </div>

            <div className="flex flex-wrap gap-2">
              <LinkAction label="README" url={selectedStoreDetail.readmeUrl} />
              <LinkAction label="Source" url={selectedStoreDetail.sourceUrl} />
              <LinkAction label="Homepage" url={selectedStoreDetail.source.homepageUrl} />
            </div>

            {(selectedStoreDetail.categories.length > 0 || selectedStoreDetail.tags.length > 0) && (
              <div>
                <DetailSectionTitle>Categories</DetailSectionTitle>
                <div className="flex flex-wrap gap-2">
                  {[...selectedStoreDetail.categories, ...selectedStoreDetail.tags].map((entry) => (
                    <DetailBadge key={entry}>{entry}</DetailBadge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <DetailSectionTitle>Information</DetailSectionTitle>
              <div className="flex flex-col rounded-xl border border-[var(--ui-divider)] bg-[var(--launcher-card-bg)] px-4">
                <DetailMetaRow label="Source" value={selectedStoreDetail.source.label} />
                <DetailMetaRow
                  label="Platform"
                  value={joinValues(selectedStoreDetail.compatibility.platforms) || "Any"}
                />
                <DetailMetaRow
                  label="Downloads"
                  value={
                    typeof selectedStoreDetail.downloadCount === "number"
                      ? selectedStoreDetail.downloadCount.toLocaleString()
                      : "Unknown"
                  }
                />
              </div>
            </div>
          </DetailContainer>
        )}

        {tab === "commands" && (
          <DetailContainer>
            <StoreCommandsList commands={commands} />
          </DetailContainer>
        )}

        {tab === "screenshots" && (
          <DetailContainer>
            <ScreenshotGrid screenshots={screenshots} />
          </DetailContainer>
        )}

        {tab === "release" && (
          <DetailContainer>
            <div>
              <DetailSectionTitle>Package Details</DetailSectionTitle>
              <div className="flex flex-col rounded-xl border border-[var(--ui-divider)] bg-[var(--launcher-card-bg)] px-4">
                <DetailMetaRow label="Version" value={selectedStoreDetail.latestRelease.version} />
                <DetailMetaRow
                  label="Channel"
                  value={formatReleaseChannelLabel(
                    selectedStoreDetail.latestRelease.channelName,
                    selectedStoreDetail.latestRelease.channel,
                  )}
                />
                <DetailMetaRow label="Published" value={publishedAtLabel ?? "Unknown"} />
                <DetailMetaRow
                  label="Format"
                  value={selectedStoreDetail.packageFormatVersion ?? "Unknown"}
                />
              </div>
            </div>

            {selectedStoreDetail.latestRelease.releaseNotes?.markdown ? (
              <div>
                <DetailSectionTitle>Release Notes</DetailSectionTitle>
                <div className="rounded-xl border border-[var(--ui-divider)] bg-[var(--launcher-card-bg)] p-4">
                  <MarkdownView>
                    {selectedStoreDetail.latestRelease.releaseNotes.markdown}
                  </MarkdownView>
                </div>
              </div>
            ) : selectedStoreDetail.latestRelease.releaseNotes?.summary ? (
              <div>
                <DetailSectionTitle>Release Summary</DetailSectionTitle>
                <div className="text-launcher-md text-foreground/90">
                  {selectedStoreDetail.latestRelease.releaseNotes.summary}
                </div>
              </div>
            ) : null}
          </DetailContainer>
        )}
      </div>
    </div>
  );
}

export function ExtensionsDetailPanel(props: ExtensionsDetailPanelProps) {
  if (!props.selectedInstalled && !props.selectedStoreDetail) {
    return <EmptyExtensionsDetailPanel />;
  }

  if (props.selectedInstalled) {
    return <InstalledExtensionDetailPane key={props.selectedInstalled.id} {...props} />;
  }

  return (
    <StoreExtensionDetailPane key={props.selectedStoreDetail?.id ?? "store-detail"} {...props} />
  );
}
