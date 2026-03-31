"use client";

import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CommandPaletteCloseReason = "action" | "dismiss";

export interface CommandPaletteClassNames {
  dialogContent: string;
  surface: string;
  header: string;
  backButton: string;
  breadcrumbs: string;
  titleBlock: string;
  title: string;
  subtitle: string;
  searchRow: string;
  searchLabel: string;
  searchIcon: string;
  searchInput: string;
  list: string;
  group: string;
  item: string;
  itemIcon: string;
  itemBody: string;
  itemTitle: string;
  itemDescription: string;
  itemEnd: string;
  itemShortcut: string;
  itemChevron: string;
  empty: string;
  footer: string;
  footerHint: string;
}

const DEFAULT_CLASS_NAMES: CommandPaletteClassNames = {
  dialogContent: "top-[18%] translate-y-0 overflow-hidden p-0 sm:max-w-2xl",
  surface: cn(
    "relative flex h-[560px] max-h-[78vh] w-full flex-col overflow-hidden",
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)),var(--card)]",
    "ring-1 ring-[var(--glass-outline)]",
  ),
  header: cn(
    "relative z-10 flex flex-col gap-3 border-b border-[var(--ui-divider)] px-4 pb-3 pt-3",
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]",
  ),
  backButton: cn(
    "size-8 rounded-md text-muted-foreground/75 hover:text-foreground",
    "hover:bg-[var(--launcher-card-hover-bg)]",
  ),
  breadcrumbs: "text-launcher-xs truncate uppercase tracking-[0.11em] text-muted-foreground/60",
  titleBlock: "min-w-0 flex-1",
  title: "text-launcher-xl truncate font-semibold tracking-[-0.02em] text-foreground",
  subtitle: "text-launcher-sm truncate tracking-[-0.01em] text-muted-foreground/75",
  searchRow: cn(
    "flex h-10 items-center gap-2 rounded-xl border border-[var(--launcher-card-border)]",
    "bg-[var(--launcher-card-hover-bg)] px-3 transition-colors",
    "focus-within:border-[var(--ring)]",
  ),
  searchLabel: "sr-only",
  searchIcon: "size-4 shrink-0 text-muted-foreground/60",
  searchInput: cn(
    "text-launcher-lg h-full border-none bg-transparent p-0 font-medium text-foreground",
    "placeholder:text-muted-foreground/45 focus-visible:ring-0",
  ),
  list: "custom-scrollbar min-h-0 flex-1 px-2 pb-2 pt-2",
  group: cn(
    "overflow-hidden",
    "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3",
    "[&_[cmdk-group-heading]]:text-[length:var(--beam-text-2xs)] [&_[cmdk-group-heading]]:font-semibold",
    "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em]",
    "[&_[cmdk-group-heading]]:text-muted-foreground/55",
  ),
  item: cn(
    "group/command-palette-item min-h-12 rounded-xl border border-transparent px-2.5 py-2.5",
    "data-[selected=true]:border-[var(--command-item-selected-border)]",
  ),
  itemIcon: "mt-0.5 shrink-0 text-muted-foreground/80 [&_svg]:size-4.5",
  itemBody: "min-w-0 flex-1",
  itemTitle: "text-launcher-md truncate font-medium tracking-[-0.01em] text-foreground",
  itemDescription: "text-launcher-xs truncate text-muted-foreground/70",
  itemEnd: "ml-2 flex shrink-0 items-center gap-2",
  itemShortcut: "text-launcher-2xs ml-0 uppercase tracking-[0.1em] text-muted-foreground/65",
  itemChevron: "size-4 text-muted-foreground/45",
  empty: "py-12 text-center",
  footer: cn(
    "flex h-10 shrink-0 items-center justify-between gap-2 border-t border-[var(--footer-border)] px-4",
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)),var(--card)]",
  ),
  footerHint: "text-launcher-xs flex items-center gap-1.5 text-muted-foreground/65",
};

export interface CommandPaletteEmptyState {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

export interface CommandPaletteSelectionContext {
  close: () => void;
  navigate: (pageId: string) => void;
  goBack: () => void;
  query: string;
  pageId: string;
}

export interface CommandPaletteItem {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  shortcut?: React.ReactNode;
  keywords?: string[];
  searchText?: string;
  value?: string;
  disabled?: boolean;
  closeOnSelect?: boolean;
  nextPageId?: string;
  className?: string;
  onSelect?: (context: CommandPaletteSelectionContext) => void | Promise<void>;
}

export interface CommandPaletteSection {
  id: string;
  heading?: React.ReactNode;
  forceMount?: boolean;
  items: CommandPaletteItem[];
}

export interface CommandPalettePage {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  breadcrumbLabel?: string;
  searchPlaceholder?: string;
  emptyState?: CommandPaletteEmptyState;
  sections: CommandPaletteSection[];
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean, reason?: CommandPaletteCloseReason) => void;
  pages: CommandPalettePage[];
  initialPageId: string;
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  resetOnClose?: boolean;
  showFooterHints?: boolean;
  classNames?: Partial<CommandPaletteClassNames>;
  className?: string;
}

interface CommandPaletteHeaderProps {
  mergedClassNames: CommandPaletteClassNames;
  pageStack: string[];
  breadcrumbText: string;
  currentPage: CommandPalettePage;
  currentQuery: string;
  searchInputId: string;
  searchPlaceholder: string;
  onGoBack: () => void;
  onInputChange: (value: string) => void;
}

function CommandPaletteHeader({
  mergedClassNames,
  pageStack,
  breadcrumbText,
  currentPage,
  currentQuery,
  searchInputId,
  searchPlaceholder,
  onGoBack,
  onInputChange,
}: CommandPaletteHeaderProps) {
  return (
    <div data-slot="command-palette-header" className={mergedClassNames.header}>
      <div className="flex items-start gap-2">
        {pageStack.length > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onGoBack}
            className={mergedClassNames.backButton}
          >
            <ChevronLeft className="size-4" />
            <span className="sr-only">Back</span>
          </Button>
        ) : null}

        <div className={mergedClassNames.titleBlock}>
          <p data-slot="command-palette-breadcrumbs" className={mergedClassNames.breadcrumbs}>
            {breadcrumbText}
          </p>
          <h2 data-slot="command-palette-title" className={mergedClassNames.title}>
            {currentPage.title}
          </h2>
          {currentPage.subtitle ? (
            <p data-slot="command-palette-subtitle" className={mergedClassNames.subtitle}>
              {currentPage.subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div data-slot="command-palette-search-row" className={mergedClassNames.searchRow}>
        <Label htmlFor={searchInputId} className={mergedClassNames.searchLabel}>
          Search commands
        </Label>
        <Search className={mergedClassNames.searchIcon} />
        <Input
          id={searchInputId}
          type="text"
          data-slot="command-palette-search-input"
          value={currentQuery}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={currentPage.searchPlaceholder ?? searchPlaceholder}
          className={mergedClassNames.searchInput}
        />
      </div>
    </div>
  );
}

interface CommandPaletteSectionsProps {
  mergedClassNames: CommandPaletteClassNames;
  currentPage: CommandPalettePage;
  filteredSections: CommandPaletteSection[];
  pendingItemId: string | null;
  onItemSelect: (item: CommandPaletteItem) => void;
}

function CommandPaletteSections({
  mergedClassNames,
  currentPage,
  filteredSections,
  pendingItemId,
  onItemSelect,
}: CommandPaletteSectionsProps) {
  return (
    <CommandList data-slot="command-palette-list" className={mergedClassNames.list}>
      <CommandEmpty data-slot="command-palette-empty" className={mergedClassNames.empty}>
        <p className="text-launcher-sm font-medium text-muted-foreground">
          {currentPage.emptyState?.title ?? "No matches found"}
        </p>
        <p className="mt-1 text-launcher-xs text-muted-foreground/70">
          {currentPage.emptyState?.description ?? "Try a different search term."}
        </p>
      </CommandEmpty>

      {filteredSections.map((section) => (
        <CommandGroup
          key={section.id}
          data-slot="command-palette-group"
          heading={section.heading}
          className={mergedClassNames.group}
          forceMount={section.forceMount}
        >
          {section.items.map((item) => {
            const isPending = pendingItemId === item.id;
            const isDisabled = item.disabled || (pendingItemId !== null && !isPending);
            return (
              <CommandItem
                key={item.id}
                value={item.id}
                keywords={item.keywords}
                disabled={isDisabled}
                onSelect={() => {
                  void onItemSelect(item);
                }}
                data-slot="command-palette-item"
                className={cn(mergedClassNames.item, item.className)}
              >
                {item.icon ? (
                  <div data-slot="command-palette-item-icon" className={mergedClassNames.itemIcon}>
                    {item.icon}
                  </div>
                ) : null}

                <div data-slot="command-palette-item-body" className={mergedClassNames.itemBody}>
                  <p data-slot="command-palette-item-title" className={mergedClassNames.itemTitle}>
                    {item.label}
                  </p>
                  {item.description ? (
                    <p
                      data-slot="command-palette-item-description"
                      className={mergedClassNames.itemDescription}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </div>

                <div data-slot="command-palette-item-end" className={mergedClassNames.itemEnd}>
                  {item.badge}
                  {item.shortcut ? (
                    <CommandShortcut
                      data-slot="command-palette-item-shortcut"
                      className={mergedClassNames.itemShortcut}
                    >
                      {item.shortcut}
                    </CommandShortcut>
                  ) : null}
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground/70" />
                  ) : item.nextPageId ? (
                    <ChevronRight
                      data-slot="command-palette-item-chevron"
                      className={mergedClassNames.itemChevron}
                    />
                  ) : null}
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      ))}
    </CommandList>
  );
}

function CommandPaletteFooter({
  mergedClassNames,
  showFooterHints,
  pageStack,
}: {
  mergedClassNames: CommandPaletteClassNames;
  showFooterHints: boolean;
  pageStack: string[];
}) {
  if (!showFooterHints) {
    return null;
  }

  return (
    <div data-slot="command-palette-footer" className={mergedClassNames.footer}>
      <span className={mergedClassNames.footerHint}>Enter to run</span>
      {pageStack.length > 1 ? (
        <span className={mergedClassNames.footerHint}>Backspace or Esc to go back</span>
      ) : (
        <span className={mergedClassNames.footerHint}>Esc to close</span>
      )}
    </div>
  );
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true;
  }
  return Boolean(target.closest("[contenteditable=true]"));
}

function matchesItemQuery(item: CommandPaletteItem, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const searchableSegments = [
    typeof item.label === "string" ? item.label : "",
    typeof item.description === "string" ? item.description : "",
    item.searchText ?? "",
    item.value ?? "",
    ...(item.keywords ?? []),
  ];

  const searchableText = searchableSegments.join(" ").toLowerCase();
  return searchableText.includes(normalizedQuery);
}

function getPageBreadcrumbLabel(page: CommandPalettePage): string | undefined {
  if (page.breadcrumbLabel) {
    return page.breadcrumbLabel;
  }
  return typeof page.title === "string" ? page.title : undefined;
}

export function CommandPalette({
  open,
  onOpenChange,
  pages,
  initialPageId,
  title = "Command Palette",
  description = "Search or navigate commands.",
  searchPlaceholder = "Search commands...",
  resetOnClose = true,
  showFooterHints = true,
  classNames,
  className,
}: CommandPaletteProps) {
  const mergedClassNames = React.useMemo(
    () => ({ ...DEFAULT_CLASS_NAMES, ...classNames }),
    [classNames],
  );

  const pagesById = React.useMemo(() => {
    const map = new Map<string, CommandPalettePage>();
    for (const page of pages) {
      map.set(page.id, page);
    }
    return map;
  }, [pages]);

  const fallbackInitialPageId = React.useMemo(() => {
    if (pagesById.has(initialPageId)) {
      return initialPageId;
    }
    return pages[0]?.id ?? "";
  }, [initialPageId, pages, pagesById]);

  const [storedPageStack, setStoredPageStack] = React.useState<string[]>(() =>
    fallbackInitialPageId ? [fallbackInitialPageId] : [],
  );
  const [storedQueriesByPage, setStoredQueriesByPage] = React.useState<Record<string, string>>({});
  const [storedPendingItemId, setStoredPendingItemId] = React.useState<string | null>(null);

  const pageStack = React.useMemo(() => {
    const baseStack = !open && resetOnClose ? [] : storedPageStack;
    const nextStack = baseStack.filter((pageId) => pagesById.has(pageId));
    if (nextStack.length > 0) {
      return nextStack;
    }
    return fallbackInitialPageId ? [fallbackInitialPageId] : [];
  }, [fallbackInitialPageId, open, pagesById, resetOnClose, storedPageStack]);

  const queriesByPage = React.useMemo(
    () => (!open && resetOnClose ? {} : storedQueriesByPage),
    [open, resetOnClose, storedQueriesByPage],
  );
  const pendingItemId = open || !resetOnClose ? storedPendingItemId : null;

  const currentPageId = pageStack[pageStack.length - 1] ?? fallbackInitialPageId;
  const currentPage = currentPageId ? pagesById.get(currentPageId) : undefined;
  const currentQuery = queriesByPage[currentPageId] ?? "";
  const searchInputId = React.useId();

  const resetNavigation = React.useCallback(() => {
    setStoredQueriesByPage({});
    setStoredPendingItemId(null);
    setStoredPageStack(fallbackInitialPageId ? [fallbackInitialPageId] : []);
  }, [fallbackInitialPageId]);

  const closePalette = React.useCallback(
    (reason: CommandPaletteCloseReason) => {
      if (resetOnClose) {
        resetNavigation();
      }
      onOpenChange(false, reason);
    },
    [onOpenChange, resetNavigation, resetOnClose],
  );

  const navigate = React.useCallback(
    (pageId: string) => {
      if (!pagesById.has(pageId)) {
        return;
      }
      setStoredPageStack(
        pageStack[pageStack.length - 1] === pageId ? pageStack : [...pageStack, pageId],
      );
    },
    [pageStack, pagesById],
  );

  const goBack = React.useCallback(() => {
    setStoredPageStack(pageStack.length <= 1 ? pageStack : pageStack.slice(0, -1));
  }, [pageStack]);

  const handleInputChange = React.useCallback(
    (value: string) => {
      if (!currentPageId) {
        return;
      }
      setStoredQueriesByPage({ ...queriesByPage, [currentPageId]: value });
    },
    [currentPageId, queriesByPage],
  );

  const handleCommandKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented || pageStack.length <= 1) {
        return;
      }

      if (
        event.key === "Backspace" &&
        currentQuery.length === 0 &&
        isTextInputTarget(event.target)
      ) {
        event.preventDefault();
        event.stopPropagation();
        goBack();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        goBack();
      }
    },
    [currentQuery.length, goBack, pageStack.length],
  );

  const handleItemSelect = React.useCallback(
    async (item: CommandPaletteItem) => {
      if (pendingItemId || item.disabled) {
        return;
      }

      const selectionContext: CommandPaletteSelectionContext = {
        close: () => closePalette("action"),
        navigate,
        goBack,
        query: currentQuery,
        pageId: currentPageId,
      };

      setStoredPendingItemId(item.id);
      await Promise.resolve(item.onSelect?.(selectionContext)).catch((error: unknown) => {
        setStoredPendingItemId(null);
        throw error;
      });
      setStoredPendingItemId(null);

      if (item.nextPageId) {
        navigate(item.nextPageId);
        return;
      }

      if (item.closeOnSelect ?? true) {
        closePalette("action");
      }
    },
    [closePalette, currentPageId, currentQuery, goBack, navigate, pendingItemId],
  );

  const breadcrumbText = React.useMemo(() => {
    const labels = pageStack
      .map((pageId) => pagesById.get(pageId))
      .flatMap((page) => (page ? [getPageBreadcrumbLabel(page)] : []))
      .filter((label): label is string => Boolean(label && label.trim().length > 0));
    if (labels.length === 0) {
      return "Command Palette";
    }
    return labels.join(" / ");
  }, [pageStack, pagesById]);

  const filteredSections = React.useMemo(() => {
    if (!currentPage) {
      return [];
    }

    return currentPage.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => matchesItemQuery(item, currentQuery)),
      }))
      .filter((section) => section.items.length > 0);
  }, [currentPage, currentQuery]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpenChange(true);
        return;
      }
      closePalette("dismiss");
    },
    [closePalette, onOpenChange],
  );

  if (!currentPage) {
    return null;
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      className={mergedClassNames.dialogContent}
      showCloseButton={false}
    >
      <Command
        shouldFilter={false}
        data-slot="command-palette"
        onKeyDown={handleCommandKeyDown}
        className={cn(mergedClassNames.surface, className)}
      >
        <CommandPaletteHeader
          mergedClassNames={mergedClassNames}
          pageStack={pageStack}
          breadcrumbText={breadcrumbText}
          currentPage={currentPage}
          currentQuery={currentQuery}
          searchInputId={searchInputId}
          searchPlaceholder={searchPlaceholder}
          onGoBack={goBack}
          onInputChange={handleInputChange}
        />

        <CommandPaletteSections
          mergedClassNames={mergedClassNames}
          currentPage={currentPage}
          filteredSections={filteredSections}
          pendingItemId={pendingItemId}
          onItemSelect={handleItemSelect}
        />

        <CommandPaletteFooter
          mergedClassNames={mergedClassNames}
          showFooterHints={showFooterHints}
          pageStack={pageStack}
        />
      </Command>
    </CommandDialog>
  );
}
