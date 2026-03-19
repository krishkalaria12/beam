import { Eye, EyeOff, ListFilter, Lock, Search } from "lucide-react";
import { useState } from "react";

import { staticCommandRegistry } from "@/command-registry/registry";
import { CommandIcon } from "@/components/icons/command-icon";
import { IconChip } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { isNonHideableCommandId } from "@/modules/settings/api/command-items";
import { SettingsSection, SettingsDivider, SettingsHint } from "../components/settings-field";

import type {
  CommandItemsEntry,
  CommandItemsFilter,
} from "../types";

const FILTER_LABELS: Record<CommandItemsFilter, string> = {
  all: "All",
  enabled: "Enabled",
  disabled: "Disabled",
};

function toGroupLabel(commandId: string): string {
  if (commandId.startsWith("system.")) return "System";
  if (commandId.startsWith("settings.")) return "Settings";
  if (commandId.startsWith("search.")) return "Search";
  if (commandId.startsWith("quicklinks.")) return "Quicklinks";
  if (commandId.startsWith("integrations.")) return "Integrations";
  if (commandId.startsWith("todo.")) return "Todo";
  if (commandId.startsWith("snippets.")) return "Snippets";
  if (commandId.startsWith("ai.")) return "AI";
  if (commandId.startsWith("file_search.")) return "Files";
  return "Command";
}

function getCommandItems(): CommandItemsEntry[] {
  const commands = staticCommandRegistry.getAll();
  const entries: CommandItemsEntry[] = [];

  for (const command of commands) {
    if (command.hidden || !command.action) {
      continue;
    }

    entries.push({
      id: command.id,
      title: command.title,
      subtitle: command.subtitle,
      icon: command.icon,
      keywords: command.keywords,
      groupLabel: toGroupLabel(command.id),
    });
  }

  entries.sort((left, right) => left.title.localeCompare(right.title));
  return entries;
}

const COMMAND_ITEMS = getCommandItems();

export function GeneralCommandItemsSection({
  hiddenCommandIds,
  onSetHidden,
}: {
  hiddenCommandIds: ReadonlySet<string>;
  onSetHidden: (commandId: string, hidden: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CommandItemsFilter>("all");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems: CommandItemsEntry[] = [];

  for (const item of COMMAND_ITEMS) {
    const isHidden = hiddenCommandIds.has(item.id);
    if (filter === "enabled" && isHidden) {
      continue;
    }
    if (filter === "disabled" && !isHidden) {
      continue;
    }

    if (normalizedQuery.length > 0) {
      const title = item.title.toLowerCase();
      const subtitle = item.subtitle?.toLowerCase() ?? "";
      const id = item.id.toLowerCase();
      const groupLabel = item.groupLabel.toLowerCase();
      const keywordMatch = item.keywords.some((keyword) =>
        keyword.toLowerCase().includes(normalizedQuery),
      );

      const matches =
        title.includes(normalizedQuery) ||
        subtitle.includes(normalizedQuery) ||
        id.includes(normalizedQuery) ||
        groupLabel.includes(normalizedQuery) ||
        keywordMatch;

      if (!matches) {
        continue;
      }
    }

    filteredItems.push(item);
  }

  const hiddenCount = hiddenCommandIds.size;

  return (
    <SettingsSection
      title="Command Items"
      description="Toggle which commands appear in launcher search results."
      icon={ListFilter}
      iconVariant="purple"
      headerAction={
        <span className="rounded-full border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2.5 py-0.5 text-launcher-2xs font-medium tabular-nums text-muted-foreground">
          {hiddenCount} disabled
        </span>
      }
    >
      {/* Search + filter bar */}
      <div className="space-y-2 px-5 pt-4 pb-2">
        <div className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands..."
            leftIcon={<Search className="size-3.5" />}
            minimal
            className="h-9 border-none bg-transparent px-0 py-0 text-launcher-sm"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-[var(--launcher-card-bg)] p-1 ring-1 ring-[var(--launcher-card-border)]">
          {(["all", "enabled", "disabled"] as CommandItemsFilter[]).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setFilter(value)}
              className={cn(
                "h-7 flex-1 rounded-lg text-launcher-xs font-medium tracking-[-0.01em]",
                filter === value
                  ? "bg-[var(--launcher-card-hover-bg)] text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {FILTER_LABELS[value]}
            </Button>
          ))}
        </div>
      </div>

      {/* Command list */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <IconChip variant="neutral" size="lg" className="mb-4 size-12 rounded-2xl">
            <Search className="size-5" />
          </IconChip>
          <p className="mb-1 text-launcher-sm font-medium text-muted-foreground">
            No commands found
          </p>
          <p className="max-w-[230px] text-launcher-xs leading-relaxed text-muted-foreground">
            Try a different search query or filter.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--launcher-card-border)]/60">
          {filteredItems.map((item) => {
            const isHidden = hiddenCommandIds.has(item.id);
            const isLocked = isNonHideableCommandId(item.id);
            const isEnabled = !isHidden || isLocked;

            return (
              <div
                key={item.id}
                className="group flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-[var(--launcher-card-bg)]/30"
              >
                <CommandIcon icon={item.icon} commandId={item.id} className="size-8 rounded-xl" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-launcher-sm font-medium tracking-[-0.01em] text-foreground capitalize">
                    {item.title}
                  </p>
                  <p className="truncate text-launcher-xs text-muted-foreground">
                    {item.subtitle || item.groupLabel}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pl-2">
                  <span className="hidden text-launcher-2xs font-medium uppercase tracking-[0.06em] text-muted-foreground sm:block">
                    {isLocked ? "Required" : isEnabled ? "Enabled" : "Disabled"}
                  </span>
                  {isLocked ? (
                    <Lock className="size-3.5 text-muted-foreground" />
                  ) : isEnabled ? (
                    <Eye className="size-3.5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="size-3.5 text-muted-foreground" />
                  )}
                  <Switch
                    checked={isEnabled}
                    disabled={isLocked}
                    onCheckedChange={(checked) => {
                      onSetHidden(item.id, !checked);
                    }}
                    aria-label={`Toggle ${item.title}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SettingsHint>
        Disabled commands are removed from results and blocked from command hotkeys.
      </SettingsHint>
    </SettingsSection>
  );
}
