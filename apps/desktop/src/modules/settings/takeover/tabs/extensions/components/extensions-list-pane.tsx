import { CommandIcon } from "@/components/icons/command-icon";
import { ChevronDown, ChevronRight, Loader2, Puzzle } from "lucide-react";

import { EmptyView } from "@/components/module";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import type { ExtensionGroupEntry, SelectedExtensionEntry } from "../types";
import { ExtensionsEntryIcon } from "./extensions-entry-icon";

interface ExtensionsListPaneProps {
  isLoading: boolean;
  query: string;
  groups: ExtensionGroupEntry[];
  expandedGroupIds: Set<string>;
  hiddenCommandIds: ReadonlySet<string>;
  aliasesById: Record<string, string[]>;
  selected: SelectedExtensionEntry | null;
  onQueryChange: (value: string) => void;
  onToggleGroup: (groupId: string) => void;
  onSelect: (selection: SelectedExtensionEntry) => void;
  onSetHidden: (commandId: string, hidden: boolean) => void;
  onSetAliases: (commandId: string, aliases: readonly string[]) => void;
}

export function ExtensionsListPane({
  isLoading,
  query,
  groups,
  expandedGroupIds,
  hiddenCommandIds,
  aliasesById,
  selected,
  onQueryChange,
  onToggleGroup,
  onSelect,
  onSetHidden,
  onSetAliases,
}: ExtensionsListPaneProps) {
  return (
    <div className="flex h-full min-h-0 flex-col border-r border-[var(--launcher-card-border)]">
      <div className="border-b border-[var(--launcher-card-border)] p-3">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search extensions..."
          className="h-10 rounded-lg border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] font-mono text-launcher-md"
        />
      </div>

      <div className="grid grid-cols-[1fr_116px_120px_72px] border-b border-[var(--launcher-card-border)] px-4 py-2 font-mono text-launcher-xs uppercase tracking-[0.14em] text-muted-foreground">
        <div>Name</div>
        <div>Type</div>
        <div>Alias</div>
        <div>On</div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div className="flex items-center gap-2 px-6 py-10 text-launcher-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading installed extensions...
          </div>
        ) : groups.length === 0 ? (
          <div className="px-6 py-14">
            <EmptyView
              icon={<Puzzle />}
              title="No extensions found"
              description="Installed extension commands show up here."
            />
          </div>
        ) : (
          groups.map((group) => {
            const expanded = group.sourceKind === "beam" || expandedGroupIds.has(group.id);
            const enabledCount = group.commands.filter(
              (command) => !hiddenCommandIds.has(command.commandId),
            ).length;
            const groupEnabled = enabledCount === group.commands.length;
            const groupSelected = selected?.kind === "group" && selected.groupId === group.id;

            return (
              <div key={group.id}>
                <div
                  className={cn(
                    "grid grid-cols-[1fr_116px_120px_72px] items-center border-b border-[var(--launcher-card-border)]/70 px-4 py-3",
                    groupSelected
                      ? "bg-[var(--command-item-selected-bg)]"
                      : "hover:bg-[var(--launcher-card-hover-bg)]",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {group.sourceKind === "beam" ? (
                      <div className="flex size-6 items-center justify-center">
                        <CommandIcon icon={group.iconReference} className="size-6 rounded-md" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggleGroup(group.id)}
                        className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--launcher-card-bg)]"
                      >
                        {expanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelect({ kind: "group", groupId: group.id })}
                      className="flex min-w-0 items-center gap-3 text-left"
                    >
                      <ExtensionsEntryIcon
                        sourceKind={group.sourceKind}
                        iconReference={group.iconReference}
                        title={group.title}
                        commandId={group.sourceKind === "beam" ? "settings.panel.open" : undefined}
                        className="size-8 rounded-lg"
                      />
                      <div className="min-w-0">
                        <div className="truncate font-mono text-launcher-md text-foreground">
                          {group.title}
                        </div>
                        <div className="truncate text-launcher-xs text-muted-foreground">
                          {group.owner}
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="font-mono text-launcher-sm text-muted-foreground">
                    {group.sourceKind === "beam" ? "Built-in" : "Extension"}
                  </div>
                  <div className="font-mono text-launcher-sm text-muted-foreground">--</div>
                  <div className="flex justify-center">
                    <Switch
                      checked={groupEnabled}
                      onCheckedChange={(checked) => {
                        for (const command of group.commands) {
                          onSetHidden(command.commandId, !checked);
                        }
                      }}
                      aria-label={`Toggle ${group.title}`}
                    />
                  </div>
                </div>

                {expanded
                  ? group.commands.map((command) => {
                      const commandSelected =
                        selected?.kind === "command" && selected.commandId === command.commandId;
                      const aliasValue = aliasesById[command.commandId]?.[0] ?? "";

                      return (
                        <div
                          key={`${command.key}:${aliasValue}`}
                          className={cn(
                            "grid grid-cols-[1fr_116px_120px_72px] items-center border-b border-[var(--launcher-card-border)]/50 px-4 py-3",
                            commandSelected
                              ? "bg-[var(--command-item-selected-bg)]"
                              : "hover:bg-[var(--launcher-card-hover-bg)]",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onSelect({
                                kind: "command",
                                groupId: group.id,
                                commandId: command.commandId,
                              })
                            }
                            className={cn(
                              "flex min-w-0 items-center gap-3 text-left",
                              group.sourceKind === "beam" ? "pl-3" : "pl-9",
                            )}
                          >
                            <ExtensionsEntryIcon
                              sourceKind={command.sourceKind}
                              iconReference={command.iconReference}
                              title={command.title}
                              commandId={command.commandId}
                              className="size-8 rounded-lg"
                            />
                            <div className="min-w-0">
                              <div className="truncate font-mono text-launcher-md text-foreground">
                                {command.title}
                              </div>
                              <div className="truncate text-launcher-xs text-muted-foreground">
                                {command.commandName}
                              </div>
                            </div>
                          </button>

                          <div className="font-mono text-launcher-sm text-muted-foreground">
                            {command.sourceKind === "beam" ? "Built-in" : "Command"}
                          </div>

                          <div className="pr-2">
                            <Input
                              defaultValue={aliasValue}
                              placeholder="Add alias"
                              className="h-9 rounded-md border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2.5 font-mono text-launcher-sm"
                              onClick={(event) => event.stopPropagation()}
                              onBlur={(event) => {
                                const nextAlias = event.currentTarget.value.trim();
                                onSetAliases(command.commandId, nextAlias ? [nextAlias] : []);
                              }}
                              onKeyDown={(event) => {
                                event.stopPropagation();
                                if (event.key === "Enter") {
                                  const nextAlias = event.currentTarget.value.trim();
                                  onSetAliases(command.commandId, nextAlias ? [nextAlias] : []);
                                  event.currentTarget.blur();
                                }
                              }}
                            />
                          </div>

                          <div className="flex justify-center">
                            <Switch
                              checked={!hiddenCommandIds.has(command.commandId)}
                              onCheckedChange={(checked) => {
                                onSetHidden(command.commandId, !checked);
                              }}
                              aria-label={`Toggle ${command.title}`}
                            />
                          </div>
                        </div>
                      );
                    })
                  : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
