import {
  BookOpen,
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

import {
  DetailPanel,
  EmptyView,
  MarkdownView,
  MetadataBar,
  type MetadataBarItem,
} from "@/components/module";
import { Button } from "@/components/ui/button";
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

function openExternalUrl(url: string | undefined): void {
  if (!url) {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function joinValues(values: string[]): string {
  return values.filter((value) => value.trim().length > 0).join(", ");
}

function HeroBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-2.5 py-1 text-launcher-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--launcher-card-border)]/80 bg-[var(--launcher-card-bg)]/85 px-4 py-3">
      <div className="text-launcher-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-launcher-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

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
        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-launcher-xs font-medium transition-colors",
        active
          ? "border-[var(--launcher-card-selected-border)] bg-[var(--launcher-card-selected-bg)] text-foreground"
          : "border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="[&_svg]:size-3.5">{icon}</span>
      {label}
    </button>
  );
}

function SectionCard({
  title,
  icon,
  description,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[22px] border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/85 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--solid-bg-recessed)] p-2 text-muted-foreground [&_svg]:size-4">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-launcher-md font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-1 text-launcher-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LinkAction({ label, url }: { label: string; url: string | undefined }) {
  if (!url) {
    return null;
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={() => openExternalUrl(url)}>
      <ExternalLink className="size-3.5" />
      {label}
    </Button>
  );
}

function ScreenshotGrid({ screenshots }: { screenshots: string[] }) {
  if (screenshots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--solid-bg-recessed)] px-4 py-8 text-center text-launcher-sm text-muted-foreground">
        No screenshots were published for this extension yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {screenshots.map((screenshot, index) => (
        <button
          key={`${screenshot}-${index}`}
          type="button"
          onClick={() => openExternalUrl(screenshot)}
          className="group overflow-hidden rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--solid-bg-recessed)] text-left transition-colors hover:border-[var(--launcher-card-selected-border)]"
        >
          <img
            src={screenshot}
            alt="Extension screenshot"
            className="h-48 w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
            loading="lazy"
            draggable={false}
          />
          <div className="flex items-center justify-between px-3 py-2 text-launcher-xs text-muted-foreground">
            <span>Screenshot {index + 1}</span>
            <ExternalLink className="size-3.5" />
          </div>
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
    return (
      <div className="rounded-2xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--solid-bg-recessed)] px-4 py-8 text-center text-launcher-sm text-muted-foreground">
        No commands were declared for this package.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {commands.map((command, index) => (
        <div
          key={`${command.name || command.title || "command"}-${index}`}
          className="flex items-start gap-3 rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/85 px-4 py-3"
        >
          <div className="mt-0.5 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--solid-bg-recessed)] p-2 text-muted-foreground [&_svg]:size-4">
            <Terminal className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-launcher-sm font-medium text-foreground">
              {command.title?.trim() || command.name}
            </div>
            <div className="mt-1 text-launcher-sm leading-6 text-muted-foreground">
              {command.description?.trim() || "No description provided."}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
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

function EmptyExtensionsDetailPane() {
  return (
    <DetailPanel className="h-full bg-transparent">
      <DetailPanel.Content className="flex items-center justify-center p-6">
        <EmptyView
          title="Select an extension"
          description="Store details, screenshots, and setup options show up here."
        />
      </DetailPanel.Content>
    </DetailPanel>
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
  ExtensionsDetailPaneProps,
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

  if (!selectedInstalled) {
    return null;
  }

  const installedVersionLabel = formatInstalledVersion(selectedInstalled.version);
  const hasPreferences = selectedInstalled.preferences.length > 0;

  return (
    <DetailPanel className="h-full bg-transparent">
      <DetailPanel.Content className="space-y-5 p-5">
        <section className="rounded-[28px] border border-[var(--launcher-card-border)] bg-[linear-gradient(135deg,var(--launcher-card-bg),color-mix(in_srgb,var(--launcher-card-bg)_70%,var(--solid-bg-recessed)))] px-5 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <ExtensionIcon
                iconReference={selectedInstalled.icon}
                title={selectedInstalled.title}
                className="size-14 rounded-2xl"
              />
              <div className="min-w-0">
                <h2 className="text-launcher-3xl font-semibold tracking-[-0.02em] text-foreground">
                  {selectedInstalled.title}
                </h2>
                <p className="mt-1 text-launcher-sm text-muted-foreground">
                  {selectedInstalled.owner}/{selectedInstalled.slug}
                  {installedVersionLabel ? ` · ${installedVersionLabel}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <HeroBadge>Installed in Beam</HeroBadge>
                  <HeroBadge>{selectedInstalled.commandCount} commands</HeroBadge>
                  <HeroBadge>
                    {hasPreferences
                      ? `${selectedInstalled.preferences.length} setup fields`
                      : "No setup required"}
                  </HeroBadge>
                  {selectedInstalledUpdate ? (
                    <HeroBadge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                      <RefreshCcw className="size-3.5" />
                      Update ready
                    </HeroBadge>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
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

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatCard label="Commands" value={String(selectedInstalled.commandCount)} />
            <StatCard
              label="Version"
              value={
                installedVersionLabel?.replace(/^v/, "") ??
                (isSyntheticRaycastVersion(selectedInstalled.version) ? "Raycast build" : "Unknown")
              }
            />
            <StatCard
              label="Preferences"
              value={hasPreferences ? String(selectedInstalled.preferences.length) : "None"}
            />
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
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

        {tab === "overview" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <SectionCard
              title="What it adds"
              icon={<Sparkles />}
              description="Installed extensions stay ready to run from Beam as soon as they are discovered."
            >
              <p className="text-launcher-sm leading-7 text-foreground/90">
                {selectedInstalled.description ||
                  "This extension is installed and ready to run. Open setup if it needs preferences or secrets before first use."}
              </p>

              {selectedInstalledUpdate ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-launcher-sm font-medium text-emerald-300">
                    <RefreshCcw className="size-4" />
                    Update available
                  </div>
                  <p className="mt-1 text-launcher-sm text-emerald-100/80">
                    {installedVersionLabel
                      ? `Installed ${installedVersionLabel}`
                      : "Installed build"}
                    {selectedInstalledUpdate.id.startsWith("raycast:")
                      ? " · latest Raycast Store build"
                      : ` · latest v${selectedInstalledUpdate.latestVersion}`}
                  </p>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title="Details"
              icon={<Terminal />}
              description="A quick snapshot of what Beam knows about this installed package."
            >
              <div className="overflow-hidden rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--solid-bg-recessed)]">
                <MetadataBar
                  items={compactMetadataRows([
                    { label: "Owner", value: selectedInstalled.owner },
                    { label: "Slug", value: selectedInstalled.slug },
                    { label: "Plugin", value: selectedInstalled.pluginName ?? "Unknown" },
                    {
                      label: "Update",
                      value: selectedInstalledUpdate
                        ? `Latest v${selectedInstalledUpdate.latestVersion}`
                        : "Up to date",
                    },
                  ])}
                  contentClassName="space-y-3 p-4"
                />
              </div>
            </SectionCard>
          </div>
        ) : (
          <div className="space-y-4">
            <SectionCard
              title="Extension setup"
              icon={<Sparkles />}
              description={
                hasPreferences
                  ? "Save preferences here before running commands that require tokens, defaults, or toggle values."
                  : "This extension does not declare any editable preferences."
              }
            >
              {!hasPreferences ? (
                <div className="rounded-2xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--solid-bg-recessed)] px-4 py-8 text-center text-launcher-sm text-muted-foreground">
                  No setup fields were declared for this extension.
                </div>
              ) : null}
            </SectionCard>

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
          </div>
        )}
      </DetailPanel.Content>
    </DetailPanel>
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
  ExtensionsDetailPaneProps,
  | "selectedStoreDetail"
  | "selectedStoreInstalled"
  | "pendingInstallSlug"
  | "onInstall"
  | "storeDetailIsLoading"
  | "storeDetailError"
>) {
  const [tab, setTab] = useState<StoreDetailTab>("overview");

  if (!selectedStoreDetail) {
    return null;
  }

  const commands = selectedStoreDetail.manifest?.commands ?? [];
  const screenshots = selectedStoreDetail.screenshots ?? [];
  const publishedAtLabel = formatPublishedAt(selectedStoreDetail.latestRelease.publishedAt);

  return (
    <DetailPanel className="h-full bg-transparent">
      <DetailPanel.Content className="space-y-5 p-5">
        <section className="rounded-[28px] border border-[var(--launcher-card-border)] bg-[linear-gradient(135deg,var(--launcher-card-bg),color-mix(in_srgb,var(--launcher-card-bg)_70%,var(--solid-bg-recessed)))] px-5 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <ExtensionIcon
                iconReference={
                  selectedStoreDetail.icons.light ||
                  selectedStoreDetail.icons.dark ||
                  selectedStoreDetail.author.avatar ||
                  null
                }
                title={selectedStoreDetail.title}
                className="size-14 rounded-2xl"
              />
              <div className="min-w-0">
                <h2 className="text-launcher-3xl font-semibold tracking-[-0.02em] text-foreground">
                  {selectedStoreDetail.title}
                </h2>
                <p className="mt-1 text-launcher-sm text-muted-foreground">
                  {formatStoreHeaderMeta(selectedStoreDetail)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedStoreInstalled ? (
                    <HeroBadge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                      Installed already
                    </HeroBadge>
                  ) : null}
                  <HeroBadge>
                    <ShieldCheck className="size-3.5" />
                    {selectedStoreDetail.verification.label || "Unverified"}
                  </HeroBadge>
                  <HeroBadge>{selectedStoreDetail.source.label}</HeroBadge>
                  <HeroBadge>{commands.length} commands</HeroBadge>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <LinkAction label="README" url={selectedStoreDetail.readmeUrl} />
              <LinkAction label="Source" url={selectedStoreDetail.sourceUrl} />
              <LinkAction label="Homepage" url={selectedStoreDetail.source.homepageUrl} />
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
          </div>

          <p className="mt-5 max-w-3xl text-launcher-md leading-7 text-foreground/90">
            {selectedStoreDetail.description ||
              selectedStoreDetail.summary ||
              "No description provided for this extension."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Commands" value={String(commands.length)} />
            <StatCard label="Screenshots" value={String(screenshots.length)} />
            <StatCard label="Releases" value={String(selectedStoreDetail.releases.length)} />
            <StatCard
              label="Channel"
              value={formatReleaseChannelLabel(
                selectedStoreDetail.latestRelease.channelName,
                selectedStoreDetail.latestRelease.channel,
              )}
            />
          </div>
        </section>

        {storeDetailIsLoading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-3 text-launcher-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading the latest package details...
          </div>
        ) : null}

        {storeDetailError ? (
          <div className="rounded-2xl border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-4 py-3 text-launcher-sm text-[var(--icon-red-fg)]">
            {storeDetailError}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
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
            label="Latest release"
          />
        </div>

        {tab === "overview" ? (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <SectionCard
                title="Compatibility"
                icon={<Globe />}
                description="A quick read on where this package is expected to work before you install it."
              >
                <div className="overflow-hidden rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--solid-bg-recessed)]">
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
                          joinValues(selectedStoreDetail.compatibility.platforms) || "Unspecified",
                      },
                      {
                        label: "Desktop",
                        value:
                          joinValues(selectedStoreDetail.compatibility.desktopEnvironments) ||
                          "Unspecified",
                      },
                      {
                        label: "Downloads",
                        value:
                          typeof selectedStoreDetail.downloadCount === "number"
                            ? selectedStoreDetail.downloadCount.toLocaleString()
                            : "Unspecified",
                      },
                    ])}
                    contentClassName="space-y-3 p-4"
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Quick links"
                icon={<ExternalLink />}
                description="Jump out to source material when you want the full context around an extension."
              >
                <div className="flex flex-wrap gap-2">
                  <LinkAction label="README" url={selectedStoreDetail.readmeUrl} />
                  <LinkAction label="Source" url={selectedStoreDetail.sourceUrl} />
                  <LinkAction label="Homepage" url={selectedStoreDetail.source.homepageUrl} />
                </div>
              </SectionCard>
            </div>

            {selectedStoreDetail.categories.length > 0 || selectedStoreDetail.tags.length > 0 ? (
              <SectionCard
                title="Categories and tags"
                icon={<Sparkles />}
                description="Use these to quickly judge what this extension is for before you install it."
              >
                <div className="flex flex-wrap gap-2">
                  {[...selectedStoreDetail.categories, ...selectedStoreDetail.tags].map((entry) => (
                    <HeroBadge key={entry}>{entry}</HeroBadge>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {screenshots.length > 0 ? (
              <SectionCard
                title="Preview"
                icon={<ImageIcon />}
                description="A quick look at the extension before you install it."
              >
                <ScreenshotGrid screenshots={screenshots.slice(0, 4)} />
              </SectionCard>
            ) : null}
          </div>
        ) : null}

        {tab === "commands" ? (
          <SectionCard
            title="Included commands"
            icon={<Terminal />}
            description="Browse the commands this package exposes in Beam."
          >
            <StoreCommandsList commands={commands} />
          </SectionCard>
        ) : null}

        {tab === "screenshots" ? (
          <SectionCard
            title="Screenshots"
            icon={<ImageIcon />}
            description="Open any preview image in the browser for a closer look."
          >
            <ScreenshotGrid screenshots={screenshots} />
          </SectionCard>
        ) : null}

        {tab === "release" ? (
          <div className="space-y-4">
            <SectionCard
              title="Release snapshot"
              icon={<BookOpen />}
              description="The latest published release information from the store."
            >
              <div className="overflow-hidden rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--solid-bg-recessed)]">
                <MetadataBar
                  items={compactMetadataRows([
                    { label: "Version", value: selectedStoreDetail.latestRelease.version },
                    {
                      label: "Channel",
                      value: formatReleaseChannelLabel(
                        selectedStoreDetail.latestRelease.channelName,
                        selectedStoreDetail.latestRelease.channel,
                      ),
                    },
                    { label: "Published", value: publishedAtLabel ?? "Unknown" },
                    {
                      label: "Package format",
                      value: selectedStoreDetail.packageFormatVersion ?? "Unknown",
                    },
                  ])}
                  contentClassName="space-y-3 p-4"
                />
              </div>
            </SectionCard>

            {selectedStoreDetail.latestRelease.releaseNotes?.summary ||
            selectedStoreDetail.latestRelease.releaseNotes?.markdown ? (
              <SectionCard
                title="Release notes"
                icon={<BookOpen />}
                description="The store summary and markdown notes for the newest published build."
              >
                {selectedStoreDetail.latestRelease.releaseNotes?.summary ? (
                  <p className="text-launcher-sm leading-7 text-foreground/90">
                    {selectedStoreDetail.latestRelease.releaseNotes.summary}
                  </p>
                ) : null}
                {selectedStoreDetail.latestRelease.releaseNotes?.markdown ? (
                  <div className="mt-4 rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--solid-bg-recessed)] p-4">
                    <MarkdownView>
                      {selectedStoreDetail.latestRelease.releaseNotes.markdown}
                    </MarkdownView>
                  </div>
                ) : null}
              </SectionCard>
            ) : (
              <SectionCard
                title="Release notes"
                icon={<BookOpen />}
                description="The latest release did not publish any notes."
              >
                <div className="rounded-2xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--solid-bg-recessed)] px-4 py-8 text-center text-launcher-sm text-muted-foreground">
                  No release notes were published for this version.
                </div>
              </SectionCard>
            )}
          </div>
        ) : null}
      </DetailPanel.Content>
    </DetailPanel>
  );
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
  if (!selectedInstalled && !selectedStoreDetail) {
    return <EmptyExtensionsDetailPane />;
  }

  if (selectedInstalled) {
    return (
      <InstalledExtensionDetailPane
        key={selectedInstalled.id}
        selectedInstalled={selectedInstalled}
        selectedInstalledUpdate={selectedInstalledUpdate}
        pendingInstallSlug={pendingInstallSlug}
        pendingUninstallSlug={pendingUninstallSlug}
        onInstall={onInstall}
        onUninstall={onUninstall}
        isPreferenceLoading={isPreferenceLoading}
        isPreferenceSaving={isPreferenceSaving}
        preferenceValues={preferenceValues}
        preferenceError={preferenceError}
        validationError={validationError}
        onChangePreference={onChangePreference}
        onSavePreferences={onSavePreferences}
      />
    );
  }

  return (
    <StoreExtensionDetailPane
      key={selectedStoreDetail?.id ?? "store-detail"}
      selectedStoreDetail={selectedStoreDetail}
      selectedStoreInstalled={selectedStoreInstalled}
      pendingInstallSlug={pendingInstallSlug}
      onInstall={onInstall}
      storeDetailIsLoading={storeDetailIsLoading}
      storeDetailError={storeDetailError}
    />
  );
}
