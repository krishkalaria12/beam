import {
  AtSign,
  ChevronLeft,
  ChevronRight,
  Command as CommandIcon,
  Keyboard,
  Search,
  Settings2,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LauncherActionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActionItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  keywords?: string[];
  nextPageId?: "hotkey" | "alias";
  closeOnSelect?: boolean;
  onSelect?: () => void;
}

type ActionPageId = "root" | "hotkey" | "alias";

interface ActionPage {
  id: ActionPageId;
  title: string;
  subtitle?: string;
  searchPlaceholder: string;
  items: ActionItem[];
}

function filterItems(items: ActionItem[], query: string): ActionItem[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return items;
  }

  return items.filter((item) => {
    const searchable = [item.label, item.description ?? "", ...(item.keywords ?? [])]
      .join(" ")
      .toLowerCase();
    return searchable.includes(normalized);
  });
}

export function LauncherActionsPanel({ open, onOpenChange }: LauncherActionsPanelProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const inputId = React.useId();

  const [pageStack, setPageStack] = React.useState<ActionPageId[]>(["root"]);
  const [queries, setQueries] = React.useState<Record<ActionPageId, string>>({
    root: "",
    hotkey: "",
    alias: "",
  });

  const currentPageId = pageStack[pageStack.length - 1] ?? "root";
  const query = queries[currentPageId] ?? "";

  const pages = React.useMemo<Record<ActionPageId, ActionPage>>(
    () => ({
      root: {
        id: "root",
        title: "Configure Application...",
        searchPlaceholder: "Search actions...",
        items: [
          {
            id: "open-command-settings",
            label: "Open Command Settings",
            icon: <Settings2 />,
            keywords: ["settings", "preferences", "config"],
            onSelect: () => {
              toast.info("Command settings integration can be wired next.");
            },
          },
          {
            id: "set-hotkey",
            label: "Set Hotkey...",
            icon: <Keyboard />,
            keywords: ["shortcut", "keys", "binding"],
            nextPageId: "hotkey",
            closeOnSelect: false,
          },
          {
            id: "set-alias",
            label: "Set Alias...",
            icon: <AtSign />,
            keywords: ["alias", "keyword", "trigger"],
            nextPageId: "alias",
            closeOnSelect: false,
          },
        ],
      },
      hotkey: {
        id: "hotkey",
        title: "Set Hotkey",
        subtitle: "Assign quick keyboard shortcuts.",
        searchPlaceholder: "Search hotkey actions...",
        items: [
          {
            id: "record-hotkey",
            label: "Record New Shortcut",
            icon: <CommandIcon />,
            keywords: ["record", "new", "shortcut"],
            onSelect: () => {
              toast.info("Hotkey recorder can be connected next.");
            },
          },
          {
            id: "remove-hotkey",
            label: "Remove Existing Shortcut",
            icon: <Keyboard />,
            keywords: ["remove", "clear", "delete"],
            onSelect: () => {
              toast.info("Shortcut removed.");
            },
          },
        ],
      },
      alias: {
        id: "alias",
        title: "Set Alias",
        subtitle: "Create quick trigger phrases.",
        searchPlaceholder: "Search alias actions...",
        items: [
          {
            id: "create-alias",
            label: "Create Alias",
            icon: <AtSign />,
            keywords: ["add", "new", "alias"],
            onSelect: () => {
              toast.info("Alias editor can be connected next.");
            },
          },
          {
            id: "clear-alias",
            label: "Clear Alias",
            icon: <AtSign />,
            keywords: ["remove", "delete", "alias"],
            onSelect: () => {
              toast.info("Alias cleared.");
            },
          },
        ],
      },
    }),
    [],
  );

  const currentPage = pages[currentPageId];
  const filteredItems = React.useMemo(
    () => filterItems(currentPage.items, query),
    [currentPage, query],
  );

  const goBack = React.useCallback(() => {
    setPageStack((previous) => {
      if (previous.length <= 1) {
        return previous;
      }
      return previous.slice(0, -1);
    });
  }, []);

  const resetState = React.useCallback(() => {
    setPageStack(["root"]);
    setQueries({ root: "", hotkey: "", alias: "" });
  }, []);

  React.useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [open, resetState]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (panelRef.current?.contains(target)) {
        return;
      }

      if (target.closest('[data-slot="command-footer-actions-button"]')) {
        return;
      }

      onOpenChange(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      data-slot="launcher-actions-panel"
      className={cn(
        "absolute bottom-[calc(100%+10px)] right-3 z-40",
        "w-[335px] overflow-hidden rounded-2xl border border-[var(--launcher-card-border)]",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)),var(--popover)]",
        "shadow-2xl shadow-black/45 backdrop-blur-xl",
      )}
    >
      <Command
        shouldFilter={false}
        className="h-full bg-transparent"
        onKeyDown={(event) => {
          if (event.defaultPrevented) {
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (pageStack.length > 1) {
              goBack();
            } else {
              onOpenChange(false);
            }
            return;
          }

          if (
            event.key === "Backspace" &&
            query.length === 0 &&
            pageStack.length > 1 &&
            event.target instanceof HTMLElement &&
            (event.target instanceof HTMLInputElement ||
              event.target instanceof HTMLTextAreaElement)
          ) {
            event.preventDefault();
            event.stopPropagation();
            goBack();
          }
        }}
      >
        <div className="border-b border-[var(--ui-divider)] px-3.5 py-3">
          <div className="flex items-center gap-2">
            {pageStack.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 rounded-md text-muted-foreground/75 hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
                onClick={goBack}
              >
                <ChevronLeft className="size-4" />
                <span className="sr-only">Back</span>
              </Button>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-foreground">
                {currentPage.title}
              </p>
              {currentPage.subtitle ? (
                <p className="truncate text-[11px] text-muted-foreground">{currentPage.subtitle}</p>
              ) : null}
            </div>
          </div>
        </div>

        <CommandList className="max-h-[240px] overflow-y-auto px-2 py-2">
          <CommandGroup>
            {filteredItems.map((item) => (
              <CommandItem
                key={item.id}
                value={[item.label, ...(item.keywords ?? [])].join(" ")}
                className="rounded-lg px-2.5 py-2"
                onSelect={() => {
                  const nextPageId = item.nextPageId;
                  if (nextPageId) {
                    setPageStack((previous) => [...previous, nextPageId]);
                    return;
                  }
                  item.onSelect?.();
                  if (item.closeOnSelect ?? true) {
                    onOpenChange(false);
                  }
                }}
              >
                <div className="mr-2 text-muted-foreground/80 [&_svg]:size-4">{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{item.label}</p>
                  {item.description ? (
                    <p className="truncate text-[11px] text-muted-foreground/70">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                {item.nextPageId ? (
                  <ChevronRight className="ml-2 size-4 text-muted-foreground/50" />
                ) : null}
              </CommandItem>
            ))}
            {filteredItems.length === 0 ? (
              <div className="px-3 py-6 text-center text-[12px] text-muted-foreground/75">
                No actions found.
              </div>
            ) : null}
          </CommandGroup>
        </CommandList>

        <div className="border-t border-[var(--ui-divider)] px-3 py-2.5">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--launcher-card-hover-bg)] px-2.5 py-1.5 ring-1 ring-[var(--launcher-card-border)] focus-within:ring-[var(--ring)]">
            <Label htmlFor={inputId} className="sr-only">
              Search actions
            </Label>
            <Search className="size-4 text-muted-foreground/60" />
            <Input
              ref={inputRef}
              id={inputId}
              value={query}
              onChange={(event) => {
                const nextValue = event.target.value;
                setQueries((previous) => ({ ...previous, [currentPageId]: nextValue }));
              }}
              placeholder={currentPage.searchPlaceholder}
              className="h-7 border-none bg-transparent px-0 py-0 text-[12px] focus-visible:ring-0"
            />
          </div>
        </div>
      </Command>
    </div>
  );
}
