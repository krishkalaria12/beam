import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";

import { Button } from "../ui/button";
import { KbdShortcut } from "./kbd";
import { ListItem } from "./list-item";
import { SearchInput } from "./search-input";
import { SectionHeader } from "./section-header";

export interface ActionListPanelShortcutDefinition {
  key: string;
  modifiers: Array<"cmd" | "ctrl" | "opt" | "shift">;
}

export interface ActionListPanelItem {
  key: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string[];
  shortcutDefinition?: ActionListPanelShortcutDefinition;
  danger?: boolean;
  primary?: boolean;
  autoFocus?: boolean;
  submenu?: ActionListPanelPage;
  onSelect?: () => void;
  onOpen?: () => void;
}

export interface ActionListPanelSection {
  key: string;
  title?: string;
  items: ActionListPanelItem[];
}

export interface ActionListPanelPage {
  key: string;
  title?: string;
  sections: ActionListPanelSection[];
}

interface ActionListPanelProps {
  panel: ActionListPanelPage;
  className?: string;
  style?: CSSProperties;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  triggerClassName?: string;
  triggerLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

type ActionRow =
  | { type: "section"; key: string; title: string }
  | { type: "item"; key: string; item: ActionListPanelItem };

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /mac/i.test(navigator.platform);
}

function keyMatchesShortcut(
  event: Pick<
    KeyboardEvent<HTMLInputElement>,
    "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey"
  >,
  shortcut: ActionListPanelShortcutDefinition,
): boolean {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  const required = new Set(shortcut.modifiers);
  const isMac = isMacPlatform();
  const expectMeta = isMac ? required.has("cmd") : false;
  const expectCtrl = isMac ? required.has("ctrl") : required.has("cmd") || required.has("ctrl");
  const expectAlt = required.has("opt");
  const expectShift = required.has("shift");

  return (
    event.metaKey === expectMeta &&
    event.ctrlKey === expectCtrl &&
    event.altKey === expectAlt &&
    event.shiftKey === expectShift
  );
}

function getPageItems(page: ActionListPanelPage): ActionListPanelItem[] {
  return page.sections.flatMap((section) => section.items);
}

function getDefaultHighlightedIndex(page: ActionListPanelPage): number {
  const items = getPageItems(page);
  if (items.length === 0) {
    return -1;
  }

  const autoFocusIndex = items.findIndex((item) => item.autoFocus);
  return autoFocusIndex >= 0 ? autoFocusIndex : 0;
}

function findSubmenuByKey(page: ActionListPanelPage, key: string): ActionListPanelItem | undefined {
  return getPageItems(page).find((item) => item.key === key && !!item.submenu);
}

function resolveCurrentPage(panel: ActionListPanelPage, path: string[]) {
  let currentPage = panel;
  const breadcrumbs: Array<{ key: string; title: string }> = [];

  if (panel.title) {
    breadcrumbs.push({ key: panel.key, title: panel.title });
  }

  for (const key of path) {
    const submenu = findSubmenuByKey(currentPage, key);
    if (!submenu?.submenu) {
      return {
        page: panel,
        breadcrumbs: panel.title ? [{ key: panel.key, title: panel.title }] : [],
      };
    }

    currentPage = submenu.submenu;
    breadcrumbs.push({ key: submenu.key, title: submenu.title });
  }

  return { page: currentPage, breadcrumbs };
}

export function ActionListPanel({
  panel,
  className,
  style,
  panelClassName,
  panelStyle,
  triggerClassName,
  triggerLabel = "Actions",
  open,
  onOpenChange,
  showTrigger = true,
}: ActionListPanelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [navigationState, setNavigationState] = useState<{ rootKey: string; path: string[] }>({
    rootKey: panel.key,
    path: [],
  });
  const [queryState, setQueryState] = useState<{ pageKey: string; value: string }>({
    pageKey: panel.key,
    value: "",
  });
  const [highlightState, setHighlightState] = useState<{ pageKey: string; index: number }>({
    pageKey: panel.key,
    index: getDefaultHighlightedIndex(panel),
  });
  const resolvedOpen = open ?? uncontrolledOpen;

  const navigationPath = navigationState.rootKey === panel.key ? navigationState.path : [];
  const { page: currentPage, breadcrumbs } = useMemo(
    () => resolveCurrentPage(panel, navigationPath),
    [navigationPath, panel],
  );
  const query = queryState.pageKey === currentPage.key ? queryState.value : "";

  const rows = useMemo<ActionRow[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const output: ActionRow[] = [];

    for (const section of currentPage.sections) {
      const matchingItems = section.items.filter((item) => {
        if (normalizedQuery.length === 0) {
          return true;
        }

        return [item.title, item.description ?? "", item.shortcut?.join(" ") ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      });

      if (matchingItems.length === 0) {
        continue;
      }

      if (section.title) {
        output.push({ type: "section", key: `section:${section.key}`, title: section.title });
      }

      output.push(
        ...matchingItems.map((item) => ({
          type: "item" as const,
          key: item.key,
          item,
        })),
      );
    }

    return output;
  }, [currentPage, query]);

  const itemRows = useMemo(
    () => rows.filter((row): row is Extract<ActionRow, { type: "item" }> => row.type === "item"),
    [rows],
  );
  const itemIndexByKey = useMemo(
    () => new Map(itemRows.map((row, index) => [row.key, index])),
    [itemRows],
  );
  const maxHighlightedIndex = Math.max(0, itemRows.length - 1);
  const highlightedIndex =
    highlightState.pageKey === currentPage.key
      ? Math.min(highlightState.index, maxHighlightedIndex)
      : getDefaultHighlightedIndex(currentPage);

  const setPanelOpen = (nextOpen: boolean) => {
    if (open === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const resetPageState = useCallback(
    (pageToReset: ActionListPanelPage, path: string[] = []) => {
      setNavigationState({ rootKey: panel.key, path });
      setQueryState({ pageKey: pageToReset.key, value: "" });
      setHighlightState({
        pageKey: pageToReset.key,
        index: getDefaultHighlightedIndex(pageToReset),
      });
    },
    [panel.key],
  );

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    resetPageState(panel);
  }, [panel, resetPageState]);

  const inputMountRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (resolvedOpen && node) {
        window.setTimeout(() => node.focus(), 0);
      }
    },
    [resolvedOpen],
  );

  const handleOutsidePointerDown = useEffectEvent((event: MouseEvent) => {
    if (!resolvedOpen) {
      return;
    }

    if (rootRef.current?.contains(event.target as Node)) {
      return;
    }

    closePanel();
  });

  useMountEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      handleOutsidePointerDown(event);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  });

  const activate = useCallback(
    (item: ActionListPanelItem) => {
      if (item.submenu) {
        item.onOpen?.();
        resetPageState(item.submenu, [...navigationPath, item.key]);
        return;
      }

      item.onSelect?.();
      closePanel();
    },
    [closePanel, navigationPath, resetPageState],
  );

  const navigateBack = useCallback(() => {
    if (navigationPath.length === 0) {
      closePanel();
      return;
    }

    const nextPath = navigationPath.slice(0, -1);
    const nextPage = resolveCurrentPage(panel, nextPath).page;
    resetPageState(nextPage, nextPath);
  }, [closePanel, navigationPath, panel, resetPageState]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      if (itemRows.length === 0) {
        return;
      }
      event.preventDefault();
      setHighlightState({
        pageKey: currentPage.key,
        index: Math.min(maxHighlightedIndex, Math.max(0, highlightedIndex) + 1),
      });
      return;
    }

    if (event.key === "ArrowUp") {
      if (itemRows.length === 0) {
        return;
      }
      event.preventDefault();
      setHighlightState({
        pageKey: currentPage.key,
        index: Math.max(0, Math.max(0, highlightedIndex) - 1),
      });
      return;
    }

    for (const row of itemRows) {
      if (!row.item.shortcutDefinition) {
        continue;
      }

      if (keyMatchesShortcut(event, row.item.shortcutDefinition)) {
        event.preventDefault();
        activate(row.item);
        return;
      }
    }

    if (event.key === "ArrowLeft") {
      if (navigationPath.length > 0 && query.length === 0) {
        event.preventDefault();
        navigateBack();
      }
      return;
    }

    if (event.key === "Backspace") {
      if (navigationPath.length > 0 && query.length === 0) {
        event.preventDefault();
        navigateBack();
      }
      return;
    }

    if (event.key === "Enter") {
      const item = itemRows[highlightedIndex]?.item;
      if (!item) {
        return;
      }
      event.preventDefault();
      activate(item);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
    }
  };

  const panelTitle = breadcrumbs[breadcrumbs.length - 1]?.title ?? currentPage.title;

  return (
    <div
      ref={rootRef}
      className={cn("module-action-list-panel relative", className)}
      style={style}
      data-slot="launcher-actions-panel"
    >
      {showTrigger ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            if (resolvedOpen) {
              closePanel();
              return;
            }

            resetPageState(panel);
            setPanelOpen(true);
          }}
          className={cn(
            "module-action-list-trigger",
            "h-8 gap-1.5 border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-foreground hover:bg-[var(--launcher-card-hover-bg)]",
            triggerClassName,
          )}
        >
          {triggerLabel}
        </Button>
      ) : null}

      {resolvedOpen ? (
        <div
          className={cn(
            "sc-actions-panel module-action-list-overlay",
            "absolute bottom-[calc(100%+10px)] right-0 z-50 w-[400px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--popover)] shadow-2xl",
            panelClassName,
          )}
          style={panelStyle}
          data-slot="launcher-actions-panel"
        >
          {panelTitle || navigationPath.length > 0 ? (
            <div className="flex items-center gap-2 border-b border-[var(--ui-divider)] px-3 py-2.5">
              {navigationPath.length > 0 ? (
                <button
                  type="button"
                  onClick={navigateBack}
                  className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
                  aria-label="Back"
                >
                  <ChevronLeft className="size-4" />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                {breadcrumbs.length > 1 ? (
                  <p className="truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
                    {breadcrumbs.map((crumb) => crumb.title).join(" / ")}
                  </p>
                ) : null}
                {panelTitle ? (
                  <p className="truncate text-launcher-sm font-medium text-foreground">
                    {panelTitle}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="module-action-list-search border-b border-[var(--ui-divider)] p-3">
            <SearchInput
              ref={inputMountRef}
              value={query}
              onChange={(value) => {
                setQueryState({ pageKey: currentPage.key, value });
                setHighlightState({
                  pageKey: currentPage.key,
                  index: value.trim().length > 0 ? 0 : getDefaultHighlightedIndex(currentPage),
                });
              }}
              placeholder={
                navigationPath.length > 0 ? "Filter submenu actions..." : "Filter actions..."
              }
              leftIcon={<Search />}
              className="text-launcher-sm"
              containerClassName="h-10 rounded-xl"
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="module-action-list-content custom-scrollbar max-h-[420px] overflow-y-auto overscroll-contain p-2.5">
            {itemRows.length === 0 ? (
              <div className="module-action-list-empty px-4 py-12 text-center text-launcher-sm text-muted-foreground">
                No matching actions
              </div>
            ) : (
              <div className="module-action-list-items space-y-1.5">
                {rows.map((row) => {
                  if (row.type === "section") {
                    return (
                      <SectionHeader
                        key={row.key}
                        title={row.title}
                        className="module-action-list-section px-1 pt-2"
                      />
                    );
                  }

                  const itemIndex = itemIndexByKey.get(row.key) ?? -1;
                  const selected = itemIndex >= 0 && itemIndex === highlightedIndex;

                  return (
                    <ListItem
                      key={row.key}
                      selected={selected}
                      onSelect={() => activate(row.item)}
                      onMouseEnter={() => {
                        if (itemIndex >= 0) {
                          setHighlightState({ pageKey: currentPage.key, index: itemIndex });
                        }
                      }}
                      leftSlot={
                        row.item.icon ? (
                          <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-border)]">
                            {row.item.icon}
                          </div>
                        ) : undefined
                      }
                      rightSlot={
                        row.item.shortcut?.length || row.item.primary || row.item.submenu ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {row.item.primary ? (
                              <span className="rounded-md border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                                default
                              </span>
                            ) : null}
                            {row.item.shortcut?.length ? (
                              <KbdShortcut keys={row.item.shortcut} />
                            ) : null}
                            {row.item.submenu ? (
                              <ChevronRight className="size-4 opacity-60" />
                            ) : null}
                          </div>
                        ) : undefined
                      }
                      className={cn(
                        "module-action-list-row rounded-xl px-3 py-2.5",
                        row.item.danger && "text-[var(--icon-red-fg)]",
                      )}
                    >
                      <div className="min-w-0">
                        <ListItem.Title
                          className={cn(
                            "text-launcher-sm",
                            row.item.danger && "text-[var(--icon-red-fg)]",
                          )}
                        >
                          {row.item.title}
                        </ListItem.Title>
                        {row.item.description ? (
                          <ListItem.Description>{row.item.description}</ListItem.Description>
                        ) : null}
                      </div>
                    </ListItem>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
