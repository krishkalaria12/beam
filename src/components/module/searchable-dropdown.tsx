import { Check, ChevronDown, Search } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

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
  triggerClassName?: string;
  panelClassName?: string;
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
  triggerClassName,
  panelClassName,
  compact = false,
  disabled = false,
}: SearchableDropdownProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const selectedIndex = itemRows.findIndex((row) => row.item.value === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [itemRows, open, value]);

  const activateItem = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(itemRows.length - 1, current + 1));
      return;
    }

    if (event.key === "ArrowUp") {
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
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }
          setOpen((current) => !current);
        }}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 text-left text-foreground transition-colors hover:bg-[var(--launcher-card-hover-bg)] disabled:opacity-50",
          compact ? "h-8 text-[12px]" : "h-10 text-[13px]",
          triggerClassName,
        )}
      >
        <span className="min-w-0 truncate text-inherit">{selectedItem?.title || placeholder}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-[240px] overflow-hidden rounded-xl border border-[var(--launcher-card-border)] bg-[var(--popover)] shadow-lg",
            panelClassName,
          )}
        >
          <div className="border-b border-[var(--ui-divider)] p-2">
            <SearchInput
              ref={inputRef}
              value={query}
              onChange={setQuery}
              placeholder={searchPlaceholder}
              leftIcon={<Search />}
              className="text-[12px]"
              containerClassName="h-9 rounded-lg"
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2">
            {itemRows.length === 0 ? (
              <EmptyView className="min-h-[120px]" title={emptyTitle} />
            ) : (
              <div className="space-y-1">
                {rows.map((row) => {
                  if (row.type === "section") {
                    return <SectionHeader key={row.key} title={row.title} className="pt-2" />;
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
                      className="rounded-lg px-2.5 py-2"
                    >
                      <ListItem.Title className="text-[12px]">{row.item.title}</ListItem.Title>
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
