import { ChevronRight, Search } from "lucide-react";

import { CommandGroup, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { LauncherActionItem } from "@/modules/launcher/types";

interface LauncherActionsRootPageProps {
  inputId: string;
  inputRef: (node: HTMLInputElement | null) => void;
  query: string;
  searchPlaceholder: string;
  showItemDescriptions: boolean;
  items: LauncherActionItem[];
  onQueryChange: (value: string) => void;
  onNavigate: (item: LauncherActionItem) => void;
}

export function LauncherActionsRootPage({
  inputId,
  inputRef,
  query,
  searchPlaceholder,
  showItemDescriptions,
  items,
  onQueryChange,
  onNavigate,
}: LauncherActionsRootPageProps) {
  return (
    <>
      <CommandList className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
        <CommandGroup>
          {items.map((item) => (
            <CommandItem
              key={item.id}
              value={item.id}
              disabled={item.disabled}
              className="rounded-lg px-2.5 py-2"
              onSelect={() => {
                onNavigate(item);
              }}
            >
              <div className="mr-2 text-muted-foreground/80 [&_svg]:size-4">{item.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-launcher-md font-medium text-foreground">
                  {item.label}
                </p>
                {showItemDescriptions && item.description ? (
                  <p className="truncate text-launcher-xs text-muted-foreground/70">
                    {item.description}
                  </p>
                ) : null}
              </div>
              {item.shortcut ? (
                <CommandShortcut className="ml-2 text-launcher-2xs tracking-[0.08em] text-muted-foreground/70">
                  {item.shortcut}
                </CommandShortcut>
              ) : null}
              {item.nextPageId ? (
                <ChevronRight className="ml-2 size-4 text-muted-foreground/50" />
              ) : null}
            </CommandItem>
          ))}
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-launcher-sm text-muted-foreground/75">
              No actions found.
            </div>
          ) : null}
        </CommandGroup>
      </CommandList>

      <div className="border-t border-[var(--ui-divider)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Label htmlFor={inputId} className="sr-only">
            Search actions
          </Label>
          <Input
            ref={inputRef}
            id={inputId}
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
            }}
            placeholder={searchPlaceholder}
            minimal
            leftIcon={<Search className="size-4" />}
            className="h-7 border-none bg-transparent px-0 py-0 text-launcher-sm"
          />
        </div>
      </div>
    </>
  );
}
