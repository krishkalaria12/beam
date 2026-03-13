import { ArrowRight, Search } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { Button } from "../ui/button";
import { KbdShortcut } from "./kbd";
import { ListItem } from "./list-item";
import { SearchInput } from "./search-input";
import { SectionHeader } from "./section-header";

export interface ActionListPanelItem {
  key: string;
  title: string;
  shortcut?: string[];
  danger?: boolean;
  section?: string;
  onSelect: () => void;
}

interface ActionListPanelProps {
  items: ActionListPanelItem[];
  className?: string;
  panelClassName?: string;
  triggerLabel?: string;
}

type ActionRow =
  | { type: "section"; key: string; title: string }
  | { type: "item"; key: string; item: ActionListPanelItem };

export function ActionListPanel({
  items,
  className,
  panelClassName,
  triggerLabel = "Actions",
}: ActionListPanelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const rows = useMemo<ActionRow[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const grouped = new Map<string, ActionListPanelItem[]>();

    for (const item of items) {
      const matches =
        normalizedQuery.length === 0 ||
        [item.title, item.shortcut?.join(" ") ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      if (!matches) {
        continue;
      }

      const sectionKey = item.section ?? "";
      grouped.set(sectionKey, [...(grouped.get(sectionKey) ?? []), item]);
    }

    const output: ActionRow[] = [];
    for (const [section, sectionItems] of grouped) {
      if (section) {
        output.push({ type: "section", key: `section:${section}`, title: section });
      }
      output.push(...sectionItems.map((item) => ({ type: "item" as const, key: item.key, item })));
    }
    return output;
  }, [items, query]);

  const itemRows = rows.filter(
    (row): row is Extract<ActionRow, { type: "item" }> => row.type === "item",
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setHighlightedIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const activate = (item: ActionListPanelItem) => {
    item.onSelect();
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
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen((current) => !current)}
        className="h-8 gap-1.5 bg-[var(--launcher-card-bg)] text-foreground border-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-hover-bg)]"
      >
        {triggerLabel}
      </Button>

      {open ? (
        <div
          className={cn(
            "absolute bottom-[calc(100%+8px)] right-0 z-50 w-[320px] overflow-hidden rounded-xl border border-[var(--launcher-card-border)] bg-[var(--popover)] shadow-lg",
            panelClassName,
          )}
        >
          <div className="border-b border-[var(--ui-divider)] p-2">
            <SearchInput
              ref={inputRef}
              value={query}
              onChange={setQuery}
              placeholder="Filter actions…"
              leftIcon={<Search />}
              className="text-[12px]"
              containerClassName="h-9 rounded-lg"
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2">
            {itemRows.length === 0 ? (
              <div className="px-3 py-10 text-center text-[12px] text-muted-foreground">
                No matching actions
              </div>
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
                      onSelect={() => activate(row.item)}
                      onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      rightSlot={
                        row.item.shortcut?.length ? (
                          <KbdShortcut keys={row.item.shortcut} />
                        ) : (
                          <ArrowRight className="size-3.5 text-muted-foreground" />
                        )
                      }
                      className={cn(
                        "rounded-lg px-2.5 py-2",
                        row.item.danger && "text-[var(--icon-red-fg)]",
                      )}
                    >
                      <ListItem.Title
                        className={cn(
                          "text-[12px]",
                          row.item.danger && "text-[var(--icon-red-fg)]",
                        )}
                      >
                        {row.item.title}
                      </ListItem.Title>
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
