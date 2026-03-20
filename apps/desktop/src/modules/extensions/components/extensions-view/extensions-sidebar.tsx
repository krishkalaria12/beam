import { Loader2 } from "lucide-react";

import { EmptyView, ListItem, SectionHeader } from "@/components/module";
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

function CountBadge({ value }: { value: string | number }) {
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-md border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-1.5 py-0.5 text-launcher-2xs font-medium text-muted-foreground">
      {value}
    </span>
  );
}

function SidebarSectionHeader({ title, count }: { title: string; count: string | number }) {
  return (
    <SectionHeader
      title={
        <div className="flex items-center justify-between gap-2">
          <span>{title}</span>
          <CountBadge value={count} />
        </div>
      }
      className="px-0"
    />
  );
}

interface ExtensionsSidebarProps {
  installedExtensions: InstalledExtensionSummary[];
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

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <SidebarSectionHeader title="Installed" count={installedExtensions.length} />
        {installedErrorMessage ? (
          <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-3 py-2 text-launcher-sm text-[var(--icon-red-fg)]">
            {installedErrorMessage}
          </div>
        ) : installedExtensions.length === 0 ? (
          <EmptyView
            className="min-h-[120px] justify-start px-2 py-4"
            contentClassName="max-w-none text-left"
            title="No installed extensions match."
          />
        ) : (
          <div className="space-y-1">
            {installedExtensions.map((entry) => {
              const versionLabel = formatInstalledVersion(entry.version);
              return (
                <ListItem
                  key={entry.id}
                  selected={selectedInstalledId === entry.id}
                  onSelect={() => onSelectInstalled(entry.id)}
                  leftSlot={
                    <ExtensionIcon
                      iconReference={entry.icon}
                      title={entry.title}
                      className="size-9 rounded-lg"
                    />
                  }
                  rightSlot={
                    installedUpdateKeys.has(extensionKey(entry.owner, entry.slug)) ? (
                      <CountBadge value="Update" />
                    ) : null
                  }
                  className="rounded-lg"
                >
                  <ListItem.Title>{entry.title}</ListItem.Title>
                  <ListItem.Description>
                    {entry.owner}/{entry.slug}
                    {versionLabel ? ` · ${versionLabel}` : ""}
                  </ListItem.Description>
                </ListItem>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <SidebarSectionHeader title="Store" count={storeResultCount} />
        {search.length < minimumSearchLength ? (
          <EmptyView
            className="min-h-[120px] justify-start px-2 py-4"
            contentClassName="max-w-none text-left"
            title={`Type at least ${minimumSearchLength} characters to search the extension store.`}
          />
        ) : isStoreLoading || isSearchDebouncing ? (
          <div className="flex items-center gap-2 px-2 py-2 text-launcher-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Searching store…
          </div>
        ) : isStoreError ? (
          <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-3 py-2 text-launcher-sm text-[var(--icon-red-fg)]">
            {storeErrorMessage || "Store search failed."}
          </div>
        ) : storeResults.length === 0 ? (
          <EmptyView
            className="min-h-[120px] justify-start px-2 py-4"
            contentClassName="max-w-none text-left"
            title="No store packages found."
          />
        ) : (
          <div className="space-y-1">
            {storeResults.map((entry) => (
              <ListItem
                key={entry.id}
                selected={selectedStoreId === entry.id}
                onSelect={() => onSelectStore(entry.id)}
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
                  entry.verification.label ? <CountBadge value={entry.verification.label} /> : null
                }
                className="rounded-lg"
              >
                <ListItem.Title>{entry.title}</ListItem.Title>
                <ListItem.Description>{formatStoreSecondaryText(entry)}</ListItem.Description>
              </ListItem>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
