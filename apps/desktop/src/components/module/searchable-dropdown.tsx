import { Check, ChevronDown, Search } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { useMountEffect } from "@/hooks/use-mount-effect";

import { EmptyView } from "./empty-view";
import { ListItem } from "./list-item";
import { SearchInput } from "./search-input";
import { SectionHeader } from "./section-header";

export interface SearchableDropdownItem {
  value: string;
  title: string;
  keywords?: string;
  icon?: ReactNode;
}

export interface SearchableDropdownSection {
  title?: string;
  items: SearchableDropdownItem[];
}

interface SearchableDropdownProps {
  sections: SearchableDropdownSection[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyTitle?: string;
  className?: string;
  style?: CSSProperties;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  panelAlign?: "start" | "end";
  matchTriggerWidth?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

type FlatRow =
  | { type: "section"; key: string; title: string }
  | { type: "item"; key: string; item: SearchableDropdownItem };

export function SearchableDropdown({
  sections,
  value,
  onValueChange,
  placeholder = "Select option",
  searchPlaceholder = "Filter options…",
  emptyTitle = "No matching options",
  className,
  style,
  triggerClassName,
  triggerStyle,
  panelClassName,
  panelStyle,
  panelAlign = "start",
  matchTriggerWidth = true,
  compact = false,
  disabled = false,
}: SearchableDropdownProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [panelPositionStyle, setPanelPositionStyle] = useState<CSSProperties | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const selectedItem = useMemo(
    () => sections.flatMap((section) => section.items).find((item) => item.value === value),
    [sections, value],
  );

  const rows = useMemo<FlatRow[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sections.flatMap((section, sectionIndex) => {
      const filteredItems = section.items.filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        return [item.title, item.keywords ?? "", item.value]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      });

      if (filteredItems.length === 0) {
        return [];
      }

      const sectionRows: FlatRow[] = [];
      if (section.title) {
        sectionRows.push({
          type: "section",
          key: `section:${section.title}:${sectionIndex}`,
          title: section.title,
        });
      }

      sectionRows.push(
        ...filteredItems.map((item) => ({
          type: "item" as const,
          key: `item:${item.value}`,
          item,
        })),
      );

      return sectionRows;
    });
  }, [query, sections]);

  const itemRows = rows.filter(
    (row): row is Extract<FlatRow, { type: "item" }> => row.type === "item",
  );
  const maxHighlightedIndex = Math.max(0, itemRows.length - 1);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHighlightedIndex(0);
  }, []);

  useMountEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!openRef.current) {
        return;
      }

      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      closeDropdown();
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  });

  const selectedIndex = itemRows.findIndex((row) => row.item.value === value);
  const desiredHighlightedIndex = selectedIndex >= 0 ? selectedIndex : 0;
  if (open && highlightedIndex !== desiredHighlightedIndex) {
    setHighlightedIndex(desiredHighlightedIndex);
  }

  const inputMountRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (open && node) {
      window.setTimeout(() => node.focus(), 0);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPositionStyle(null);
      return;
    }

    const PANEL_GAP = 6;
    const PANEL_VIEWPORT_MARGIN = 8;
    const PANEL_MIN_HEIGHT = 140;
    const PANEL_MAX_HEIGHT = 320;
    const PANEL_MIN_WIDTH = 240;

    const updatePanelPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const maxPanelWidth = Math.max(0, window.innerWidth - PANEL_VIEWPORT_MARGIN * 2);
      const minPanelWidth = Math.min(
        Math.max(triggerRect.width, PANEL_MIN_WIDTH),
        maxPanelWidth,
      );
      const measuredPanelWidth = panelRef.current?.offsetWidth ?? minPanelWidth;
      const resolvedPanelWidth = matchTriggerWidth
        ? minPanelWidth
        : Math.min(Math.max(measuredPanelWidth, minPanelWidth), maxPanelWidth);

      const leftCandidate =
        panelAlign === "end" ? triggerRect.right - resolvedPanelWidth : triggerRect.left;
      const maxLeft = Math.max(
        PANEL_VIEWPORT_MARGIN,
        window.innerWidth - resolvedPanelWidth - PANEL_VIEWPORT_MARGIN,
      );
      const clampedLeft = Math.min(Math.max(PANEL_VIEWPORT_MARGIN, leftCandidate), maxLeft);

      const availableBelow = Math.max(
        0,
        window.innerHeight - triggerRect.bottom - PANEL_GAP - PANEL_VIEWPORT_MARGIN,
      );
      const availableAbove = Math.max(0, triggerRect.top - PANEL_GAP - PANEL_VIEWPORT_MARGIN);
      const shouldOpenAbove =
        availableBelow < PANEL_MIN_HEIGHT && availableAbove > availableBelow;
      const maxHeight = Math.min(
        PANEL_MAX_HEIGHT,
        shouldOpenAbove ? availableAbove : availableBelow,
      );

      const nextStyle: CSSProperties = {
        position: "fixed",
        left: clampedLeft,
        zIndex: 80,
        maxHeight,
      };

      if (matchTriggerWidth) {
        nextStyle.width = resolvedPanelWidth;
      } else {
        nextStyle.minWidth = minPanelWidth;
        nextStyle.maxWidth = maxPanelWidth;
      }

      if (shouldOpenAbove) {
        nextStyle.bottom = window.innerHeight - triggerRect.top + PANEL_GAP;
      } else {
        nextStyle.top = triggerRect.bottom + PANEL_GAP;
      }

      setPanelPositionStyle((current) => {
        const currentKeys = Object.keys(current ?? {});
        const nextKeys = Object.keys(nextStyle);
        const sameShape =
          currentKeys.length === nextKeys.length &&
          currentKeys.every(
            (key) =>
              current?.[key as keyof CSSProperties] === nextStyle[key as keyof CSSProperties],
          );

        return sameShape ? current : nextStyle;
      });
    };

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [matchTriggerWidth, open, panelAlign]);

  const activateItem = (nextValue: string) => {
    onValueChange(nextValue);
    closeDropdown();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      if (itemRows.length === 0) {
        return;
      }
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(maxHighlightedIndex, current + 1));
      return;
    }

    if (event.key === "ArrowUp") {
      if (itemRows.length === 0) {
        return;
      }
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (event.key === "Enter") {
      const selectedRow = itemRows[highlightedIndex];
      if (!selectedRow) {
        return;
      }
      event.preventDefault();
      activateItem(selectedRow.item.value);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }
  };

  return (
    <div ref={rootRef} className={cn("module-searchable-dropdown relative", className)} style={style}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }
          if (open) {
            closeDropdown();
            return;
          }
          setQuery("");
          setOpen(true);
        }}
        className={cn(
          "module-searchable-dropdown-trigger",
          "flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-left text-foreground transition-colors hover:bg-[var(--launcher-card-hover-bg)] disabled:opacity-50",
          compact ? "h-8 text-[12px]" : "h-10 text-[13px]",
          triggerClassName,
        )}
        style={triggerStyle}
      >
        <span className="module-searchable-dropdown-trigger-label min-w-0 truncate text-inherit">{selectedItem?.title || placeholder}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className={cn(
                "module-searchable-dropdown-panel",
                "fixed flex flex-col overflow-hidden rounded-xl border border-[var(--launcher-card-border)] bg-[var(--popover)] shadow-lg",
                panelClassName,
              )}
              style={panelPositionStyle ? { ...panelPositionStyle, ...panelStyle } : panelStyle}
            >
              <div className="module-searchable-dropdown-search border-b border-[var(--ui-divider)] p-2">
            <SearchInput
              ref={inputMountRef}
                  value={query}
                  onChange={setQuery}
                  placeholder={searchPlaceholder}
                  leftIcon={<Search />}
                  className="text-[12px]"
                  containerClassName="h-9 rounded-lg"
                  onKeyDown={handleKeyDown}
                />
              </div>

              <div className="module-searchable-dropdown-content custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                {itemRows.length === 0 ? (
                  <EmptyView
                    className="module-searchable-dropdown-empty min-h-[120px]"
                    title={emptyTitle}
                  />
                ) : (
                  <div className="module-searchable-dropdown-items space-y-1">
                    {rows.map((row) => {
                      if (row.type === "section") {
                        return (
                          <SectionHeader
                            key={row.key}
                            title={row.title}
                            className="module-searchable-dropdown-section pt-2"
                          />
                        );
                      }

                      const itemIndex = itemRows.findIndex((itemRow) => itemRow.key === row.key);
                      const selected = itemIndex === highlightedIndex;

                      return (
                        <ListItem
                          key={row.key}
                          selected={selected}
                          onSelect={() => activateItem(row.item.value)}
                          onMouseEnter={() => setHighlightedIndex(itemIndex)}
                          leftSlot={row.item.icon}
                          rightSlot={
                            row.item.value === value ? (
                              <Check className="size-3.5 text-muted-foreground" />
                            ) : null
                          }
                          className="module-searchable-dropdown-row rounded-lg px-2.5 py-2"
                        >
                          <ListItem.Title className="text-[12px]">{row.item.title}</ListItem.Title>
                        </ListItem>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
