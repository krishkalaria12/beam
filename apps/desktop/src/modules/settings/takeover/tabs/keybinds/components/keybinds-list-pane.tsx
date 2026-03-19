import { CommandIcon } from "@/components/icons/command-icon";
import { EmptyView } from "@/components/module";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { formatShortcutLabel } from "../lib/build-keybind-rows";
import type { KeybindRow } from "../types";

interface KeybindsListPaneProps {
  query: string;
  rows: KeybindRow[];
  selectedId: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
}

export function KeybindsListPane({
  query,
  rows,
  selectedId,
  onQueryChange,
  onSelect,
}: KeybindsListPaneProps) {
  return (
    <div className="flex h-full min-h-0 flex-col border-r border-[var(--launcher-card-border)]">
      <div className="border-b border-[var(--launcher-card-border)] p-3">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search keybinds..."
          className="h-10 rounded-lg border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] font-mono text-launcher-md"
          onKeyDown={(event) => {
            if (rows.length === 0) {
              return;
            }

            const currentIndex = rows.findIndex((row) => row.id === selectedId);
            if (event.key === "ArrowDown") {
              event.preventDefault();
              const nextIndex = Math.min(rows.length - 1, Math.max(currentIndex, 0) + 1);
              onSelect(rows[nextIndex]?.id ?? rows[0]?.id ?? "");
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              const nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
              onSelect(rows[nextIndex]?.id ?? rows[0]?.id ?? "");
            }
          }}
        />
      </div>

      <div className="grid grid-cols-[1fr_180px] border-b border-[var(--launcher-card-border)] px-4 py-2 font-mono text-launcher-xs uppercase tracking-[0.14em] text-muted-foreground">
        <div>Name</div>
        <div>Shortcut</div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {rows.length === 0 ? (
          <div className="px-6 py-14">
            <EmptyView title="No keybinds found" description="Try a different search query." />
          </div>
        ) : (
          rows.map((row) => {
            const isSelected = row.id === selectedId;

            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row.id)}
                className={cn(
                  "grid w-full grid-cols-[1fr_180px] items-center border-b border-[var(--launcher-card-border)]/70 px-4 py-3 text-left transition-colors",
                  isSelected
                    ? "bg-[var(--command-item-selected-bg)] text-foreground"
                    : "hover:bg-[var(--launcher-card-hover-bg)]",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CommandIcon
                    icon={row.icon}
                    commandId={row.kind === "command" ? row.id : undefined}
                    className="size-8 rounded-lg"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-mono text-launcher-md text-foreground">{row.title}</div>
                    <div className="truncate text-launcher-xs text-muted-foreground">
                      {row.kind === "global" ? "Global" : row.id}
                    </div>
                  </div>
                </div>
                <div className="pl-3">
                  <div className="inline-flex min-h-8 items-center rounded-md border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2.5 font-mono text-launcher-xs text-muted-foreground">
                    {formatShortcutLabel(row.shortcut)}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
