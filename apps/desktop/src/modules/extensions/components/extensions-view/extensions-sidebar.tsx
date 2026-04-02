import { Loader2, Package } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { ExtensionIcon } from "@/modules/extensions/components/extension-icon";
import type { ExtensionStoreListing, InstalledExtensionSummary } from "@/modules/extensions/types";

function extensionKey(owner: string, slug: string): string {
  return `${owner.trim().toLowerCase()}::${slug.trim().toLowerCase()}`;
}

function SidebarBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "info";
}) {
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 text-launcher-2xs font-medium",
        tone === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : tone === "info"
            ? "border-sky-500/25 bg-sky-500/10 text-sky-300"
            : "border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function SidebarRow({
  selected,
  onSelect,
  icon,
  title,
  description,
  badges,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  badges?: ReactNode;
}) {
  const rowRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!selected) {
      return;
    }

    rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={onSelect}
      data-selected={selected}
      className={cn(
        "ext-list-item flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        selected
          ? "bg-[var(--launcher-card-selected-bg)]"
          : "hover:bg-[var(--launcher-card-hover-bg)]",
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--solid-bg-recessed)] border border-[var(--ui-divider)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-launcher-sm font-medium text-foreground">{title}</span>
          {badges ? <div className="flex shrink-0 items-center gap-1.5">{badges}</div> : null}
        </div>
        <div className="truncate text-launcher-xs text-muted-foreground">{description}</div>
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
  const installedKeys = new Set(
    installedExtensions.map((entry) => extensionKey(entry.owner, entry.slug)),
  );

  const hasSearch = search.trim().length > 0;
  const isStoreActive = search.length >= minimumSearchLength;

  return (
    <div className="flex h-full flex-col gap-6">
      <section className="space-y-1">
        {installedErrorMessage ? (
          <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-3 py-2 text-launcher-xs text-[var(--icon-red-fg)]">
            {installedErrorMessage}
          </div>
        ) : isInstalledLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-launcher-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading installed...
          </div>
        ) : installedExtensions.length > 0 ? (
          installedExtensions.map((entry) => {
            const updateAvailable = installedUpdateKeys.has(extensionKey(entry.owner, entry.slug));
            return (
              <SidebarRow
                key={entry.id}
                selected={selectedInstalledId === entry.id}
                onSelect={() => onSelectInstalled(entry.id)}
                icon={
                  <ExtensionIcon
                    iconReference={entry.icon}
                    title={entry.title}
                    className="size-9 object-contain"
                  />
                }
                title={entry.title}
                description={entry.description || `${entry.commandCount} commands available.`}
                badges={
                  <>
                    <SidebarBadge tone="success">Installed</SidebarBadge>
                    {updateAvailable ? <SidebarBadge tone="info">Update</SidebarBadge> : null}
                  </>
                }
              />
            );
          })
        ) : !hasSearch ? (
          <div className="px-3 py-4 text-center text-launcher-xs text-muted-foreground">
            No extensions installed yet.
          </div>
        ) : null}
      </section>

      {isStoreActive || isStoreLoading || isSearchDebouncing || storeResults.length > 0 ? (
        <section className="space-y-1">
          {!isStoreLoading && !isSearchDebouncing && storeResults.length > 0 ? (
            <div className="mb-2 px-3 text-launcher-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Store Results
            </div>
          ) : null}

          {isStoreError ? (
            <div className="rounded-lg border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-3 py-2 text-launcher-xs text-[var(--icon-red-fg)]">
              {storeErrorMessage || "Store search failed."}
            </div>
          ) : isStoreLoading || isSearchDebouncing ? (
            <div className="flex items-center gap-2 px-3 py-2 text-launcher-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Searching store...
            </div>
          ) : storeResults.length > 0 ? (
            storeResults.map((entry) => {
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
                      className="size-9 object-contain"
                    />
                  }
                  title={entry.title}
                  description={entry.summary?.trim() || entry.description?.trim() || "View details"}
                  badges={
                    alreadyInstalled ? <SidebarBadge tone="success">Installed</SidebarBadge> : null
                  }
                />
              );
            })
          ) : (
            <div className="px-3 py-4 text-center text-launcher-xs text-muted-foreground">
              No store results found for "{search}".
            </div>
          )}
        </section>
      ) : hasSearch && search.length < minimumSearchLength ? (
        <div className="px-3 py-4 text-center text-launcher-xs text-muted-foreground">
          Type {minimumSearchLength} or more characters to search the store.
        </div>
      ) : null}

      {!hasSearch && installedExtensions.length === 0 && (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-[var(--ui-divider)] bg-[var(--launcher-card-hover-bg)] text-muted-foreground">
            <Package className="size-5" />
          </div>
          <p className="text-launcher-sm font-semibold text-foreground">No extensions installed</p>
          <p className="mt-1 text-launcher-xs text-muted-foreground">
            Search above to browse community extensions.
          </p>
        </div>
      )}
    </div>
  );
}
