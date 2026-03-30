import { Check, Loader2, RefreshCcw, ShieldCheck, Terminal } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyView } from "@/components/module";
import { cn } from "@/lib/utils";
import { ExtensionIcon } from "@/modules/extensions/components/extension-icon";
import type { ExtensionStoreListing, InstalledExtensionSummary } from "@/modules/extensions/types";

function isSyntheticRaycastVersion(version: string | null | undefined): boolean {
  return typeof version === "string" && /^0\.0\.\d{9,}$/.test(version.trim());
}

function formatInstalledVersion(version: string | null | undefined): string | null {
  if (!version || isSyntheticRaycastVersion(version)) {
    return null;
  }

  return `v${version}`;
}

function formatStoreSecondaryText(entry: ExtensionStoreListing): string {
  const sourceLabel = entry.source.label.trim();
  const isRaycast = entry.source.id.trim().toLowerCase() === "raycast";
  const version = entry.latestRelease.version.trim();

  if (isRaycast || /^0\.0\.\d{9,}$/.test(version)) {
    return `${entry.author.handle}/${entry.slug} · ${sourceLabel}`;
  }

  return `${entry.author.handle}/${entry.slug} · v${version}`;
}

function extensionKey(owner: string, slug: string): string {
  return `${owner.trim().toLowerCase()}::${slug.trim().toLowerCase()}`;
}

function SidebarBadge({
  children,
  icon,
  tone = "default",
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "success" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-launcher-2xs font-medium",
        tone === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : tone === "info"
            ? "border-sky-500/25 bg-sky-500/10 text-sky-300"
            : "border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] text-muted-foreground",
      )}
    >
      {icon ? <span className="[&_svg]:size-3">{icon}</span> : null}
      {children}
    </span>
  );
}

function SidebarSectionHeader({
  title,
  count,
  description,
}: {
  title: string;
  count: string | number;
  description: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div>
        <h3 className="text-launcher-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-launcher-xs text-muted-foreground">{description}</p>
      </div>
      <SidebarBadge>{count}</SidebarBadge>
    </div>
  );
}

function SidebarRow({
  selected,
  onSelect,
  icon,
  title,
  description,
  meta,
  badges,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  meta: string;
  badges?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-full rounded-[20px] border px-3 py-3 text-left transition-colors",
        selected
          ? "border-[var(--launcher-card-selected-border)] bg-[var(--launcher-card-selected-bg)]"
          : "border-transparent bg-[var(--launcher-card-bg)]/70 hover:border-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-bg)]",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-launcher-sm font-medium text-foreground">{title}</div>
              <div className="mt-1 truncate text-launcher-xs text-muted-foreground">{meta}</div>
            </div>
          </div>
          <div className="mt-2 text-launcher-xs leading-5 text-foreground/70">{description}</div>
          {badges ? <div className="mt-3 flex flex-wrap gap-1.5">{badges}</div> : null}
        </div>
      </div>
    </button>
  );
}

interface ExtensionsSidebarProps {
  installedExtensions: InstalledExtensionSummary[];
  isInstalledLoading: boolean;
  installedErrorMessage: string | null;
  selectedInstalledId: string | null;
  installedUpdateKeys: Set<string>;
  onSelectInstalled: (id: string) => void;
  search: string;
  minimumSearchLength: number;
  storeResults: ExtensionStoreListing[];
  selectedStoreId: string | null;
  onSelectStore: (id: string) => void;
  isStoreLoading: boolean;
  isStoreError: boolean;
  storeErrorMessage: string | null;
  isSearchDebouncing: boolean;
}

export function ExtensionsSidebar({
  installedExtensions,
  isInstalledLoading,
  installedErrorMessage,
  selectedInstalledId,
  installedUpdateKeys,
  onSelectInstalled,
  search,
  minimumSearchLength,
  storeResults,
  selectedStoreId,
  onSelectStore,
  isStoreLoading,
  isStoreError,
  storeErrorMessage,
  isSearchDebouncing,
}: ExtensionsSidebarProps) {
  const storeResultCount = search.length >= minimumSearchLength ? storeResults.length : 0;
  const installedKeys = new Set(
    installedExtensions.map((entry) => extensionKey(entry.owner, entry.slug)),
  );

  return (
    <div className="flex h-full flex-col gap-5">
      <section className="rounded-[24px] border border-[var(--launcher-card-border)] bg-[linear-gradient(180deg,var(--launcher-card-bg),color-mix(in_srgb,var(--launcher-card-bg)_72%,var(--solid-bg-recessed)))] px-4 py-4">
        <p className="text-launcher-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Marketplace
        </p>
        <h2 className="mt-2 text-launcher-lg font-semibold text-foreground">
          Browse installed tools and community packages in one place.
        </h2>
        <p className="mt-2 text-launcher-sm leading-6 text-muted-foreground">
          Installed extensions stay pinned first, and store results open richer details on the
          right.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <SidebarBadge>{installedExtensions.length} installed</SidebarBadge>
          <SidebarBadge>{storeResultCount} store results</SidebarBadge>
        </div>
      </section>

      <section className="space-y-2.5">
        <SidebarSectionHeader
          title="Installed"
          count={installedExtensions.length}
          description="Already available inside Beam"
        />

        {installedErrorMessage ? (
          <div className="rounded-2xl border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-3 py-2 text-launcher-sm text-[var(--icon-red-fg)]">
            {installedErrorMessage}
          </div>
        ) : isInstalledLoading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 py-3 text-launcher-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading installed extensions...
          </div>
        ) : installedExtensions.length === 0 ? (
          <EmptyView
            className="min-h-[128px] rounded-2xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/70 px-3 py-4"
            contentClassName="max-w-none text-left"
            title="No installed extensions match."
          />
        ) : (
          <div className="space-y-2">
            {installedExtensions.map((entry) => {
              const versionLabel = formatInstalledVersion(entry.version);
              const updateAvailable = installedUpdateKeys.has(
                extensionKey(entry.owner, entry.slug),
              );
              return (
                <SidebarRow
                  key={entry.id}
                  selected={selectedInstalledId === entry.id}
                  onSelect={() => onSelectInstalled(entry.id)}
                  icon={
                    <ExtensionIcon
                      iconReference={entry.icon}
                      title={entry.title}
                      className="size-10 rounded-xl"
                    />
                  }
                  title={entry.title}
                  description={
                    entry.description || `${entry.commandCount} commands available in Beam.`
                  }
                  meta={`${entry.owner}/${entry.slug}`}
                  badges={
                    <>
                      {updateAvailable ? (
                        <SidebarBadge tone="info" icon={<RefreshCcw />}>
                          Update
                        </SidebarBadge>
                      ) : null}
                      <SidebarBadge icon={<Terminal />}>{entry.commandCount} commands</SidebarBadge>
                      {versionLabel ? <SidebarBadge>{versionLabel}</SidebarBadge> : null}
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-2.5">
        <SidebarSectionHeader
          title="Store"
          count={storeResultCount}
          description="Community packages that match the current search"
        />

        {search.length < minimumSearchLength ? (
          <EmptyView
            className="min-h-[128px] rounded-2xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/70 px-3 py-4"
            contentClassName="max-w-none text-left"
            title={`Type at least ${minimumSearchLength} characters to search the extension store.`}
          />
        ) : isStoreLoading || isSearchDebouncing ? (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 py-3 text-launcher-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Searching community extensions...
          </div>
        ) : isStoreError ? (
          <div className="rounded-2xl border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-3 py-2 text-launcher-sm text-[var(--icon-red-fg)]">
            {storeErrorMessage || "Store search failed."}
          </div>
        ) : storeResults.length === 0 ? (
          <EmptyView
            className="min-h-[128px] rounded-2xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/70 px-3 py-4"
            contentClassName="max-w-none text-left"
            title="No store packages found."
          />
        ) : (
          <div className="space-y-2">
            {storeResults.map((entry) => {
              const alreadyInstalled = installedKeys.has(
                extensionKey(entry.author.handle, entry.slug),
              );
              return (
                <SidebarRow
                  key={entry.id}
                  selected={selectedStoreId === entry.id}
                  onSelect={() => onSelectStore(entry.id)}
                  icon={
                    <ExtensionIcon
                      iconReference={
                        entry.icons.light || entry.icons.dark || entry.author.avatar || null
                      }
                      title={entry.title}
                      className="size-10 rounded-xl"
                    />
                  }
                  title={entry.title}
                  description={
                    entry.summary?.trim() ||
                    entry.description?.trim() ||
                    "Open to preview commands, screenshots, and release notes."
                  }
                  meta={formatStoreSecondaryText(entry)}
                  badges={
                    <>
                      {alreadyInstalled ? (
                        <SidebarBadge tone="success" icon={<Check />}>
                          Installed
                        </SidebarBadge>
                      ) : null}
                      {entry.verification.label ? (
                        <SidebarBadge tone="info" icon={<ShieldCheck />}>
                          {entry.verification.label}
                        </SidebarBadge>
                      ) : null}
                      <SidebarBadge>{entry.source.label}</SidebarBadge>
                      {entry.screenshots.length > 0 ? (
                        <SidebarBadge>{entry.screenshots.length} shots</SidebarBadge>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
