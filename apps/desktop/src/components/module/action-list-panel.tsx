import { ArrowRight, Search } from "lucide-react";
import { type CSSProperties, type KeyboardEvent, useCallback, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useMountEffect } from "@/hooks/use-mount-effect";

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

export function ActionListPanel({
  items,
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
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const resolvedOpen = open ?? uncontrolledOpen;
  const resolvedOpenRef = useRef(resolvedOpen);
  resolvedOpenRef.current = resolvedOpen;

  const setPanelOpen = (nextOpen: boolean) => {
    if (open === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

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
  const maxHighlightedIndex = Math.max(0, itemRows.length - 1);

  const closePanel = () => {
    setPanelOpen(false);
    setQuery("");
    setHighlightedIndex(0);
  };

  if (resolvedOpen && highlightedIndex !== 0) {
    setHighlightedIndex(0);
  }

  const inputMountRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (resolvedOpen && node) {
      window.setTimeout(() => node.focus(), 0);
    }
  }, [resolvedOpen]);

  useMountEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!resolvedOpenRef.current) {
        return;
      }

      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      closePanel();
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  });

  const activate = (item: ActionListPanelItem) => {
    item.onSelect();
    closePanel();
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

  return (
    <div ref={rootRef} className={cn("module-action-list-panel relative", className)} style={style}>
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
            setQuery("");
            setPanelOpen(true);
          }}
          className={cn(
            "module-action-list-trigger",
            "h-8 gap-1.5 bg-[var(--launcher-card-bg)] text-foreground border-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-hover-bg)]",
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
            "absolute bottom-[calc(100%+8px)] right-0 z-50 w-[320px] overflow-hidden rounded-xl border border-[var(--launcher-card-border)] bg-[var(--popover)] shadow-lg",
            panelClassName,
          )}
          style={panelStyle}
        >
          <div className="module-action-list-search border-b border-[var(--ui-divider)] p-2">
            <SearchInput
              ref={inputMountRef}
              value={query}
              onChange={setQuery}
              placeholder="Filter actions…"
              leftIcon={<Search />}
              className="text-launcher-sm"
              containerClassName="h-9 rounded-lg"
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="module-action-list-content custom-scrollbar max-h-[320px] overflow-y-auto overscroll-contain p-2">
            {itemRows.length === 0 ? (
              <div className="module-action-list-empty px-3 py-10 text-center text-launcher-sm text-muted-foreground">
                No matching actions
              </div>
            ) : (
              <div className="module-action-list-items space-y-1">
                {rows.map((row) => {
                  if (row.type === "section") {
                    return (
                      <SectionHeader
                        key={row.key}
                        title={row.title}
                        className="module-action-list-section pt-2"
                      />
                    );
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
                        "module-action-list-row",
                        "rounded-lg px-2.5 py-2",
                        row.item.danger && "text-[var(--icon-red-fg)]",
                      )}
                    >
                      <ListItem.Title
                        className={cn(
                          "text-launcher-sm",
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
