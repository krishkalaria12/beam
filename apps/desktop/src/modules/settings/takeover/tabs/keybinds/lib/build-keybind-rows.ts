import { staticCommandRegistry } from "@/command-registry/registry";
import type { CommandDescriptor } from "@/command-registry/types";
import type { HotkeySettings } from "@/modules/settings/api/hotkeys";

import type { KeybindRow } from "../types";

function isCommandHotkeyCandidate(command: CommandDescriptor): boolean {
  if (command.hidden || command.requiresQuery || !command.action) {
    return false;
  }

  return command.scope.includes("all") || command.scope.includes("normal");
}

export function buildKeybindRows(settings: HotkeySettings | null): KeybindRow[] {
  const rows: KeybindRow[] = [
    {
      id: "__global__",
      title: "Open Beam",
      icon: "settings",
      description: "Global launcher shortcut used to show the Beam window.",
      shortcut: settings?.globalShortcut ?? "",
      keywords: ["launcher", "global", "beam", "window"],
      kind: "global",
    },
  ];

  const commandHotkeys = settings?.commandHotkeys ?? {};
  const commands = staticCommandRegistry
    .getAll()
    .filter(isCommandHotkeyCandidate)
    .toSorted((left, right) => left.title.localeCompare(right.title));

  for (const command of commands) {
    rows.push({
      id: command.id,
      title: command.title,
      icon: command.icon,
      description: command.subtitle?.trim() || `Command id: ${command.id}`,
      shortcut: commandHotkeys[command.id] ?? "",
      keywords: [...command.keywords, command.id],
      kind: "command",
    });
  }

  return rows;
}

export function filterKeybindRows(rows: KeybindRow[], query: string): KeybindRow[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((row) =>
    [row.title, row.description, row.id, ...row.keywords].join(" ").toLowerCase().includes(normalizedQuery),
  );
}

export function formatShortcutLabel(value: string): string {
  return value.trim().length > 0 ? value : "Record shortcut";
}
