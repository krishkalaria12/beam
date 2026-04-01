import { staticCommandRegistry } from "@/command-registry/registry";

import type { LauncherActionItem, LauncherActionSection } from "./types";

export const HOTKEY_EXAMPLE = "CTRL+SUPER+A";

export function filterActionItems(
  items: LauncherActionItem[],
  query: string,
): LauncherActionItem[] {
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

export function filterActionSections(
  sections: LauncherActionSection[],
  query: string,
): LauncherActionSection[] {
  if (query.trim().length === 0) {
    return sections;
  }

  return sections.flatMap((section) => {
    const items = filterActionItems(section.items, query);
    if (items.length === 0) {
      return [];
    }

    return [{ ...section, items }];
  });
}

export function flattenActionSections(sections: LauncherActionSection[]): LauncherActionItem[] {
  return sections.flatMap((section) => section.items);
}

export function formatCommandName(
  commandId: string,
  targetCommandTitle?: string,
  targetCommandId?: string,
): string {
  if (targetCommandTitle && targetCommandId && commandId === targetCommandId) {
    return targetCommandTitle;
  }

  const registryCommand = staticCommandRegistry.getById(commandId);
  if (registryCommand) {
    return registryCommand.title;
  }

  return commandId;
}

export function normalizeAlias(value: string): string {
  return value.trim().toLowerCase();
}

export function findAliasConflictCommandId(
  aliasesById: Record<string, string[]>,
  commandId: string,
  alias: string,
): string | null {
  const normalizedAlias = normalizeAlias(alias);
  if (!normalizedAlias) {
    return null;
  }

  for (const [existingCommandId, aliases] of Object.entries(aliasesById)) {
    if (existingCommandId === commandId) {
      continue;
    }

    for (const existingAlias of aliases) {
      if (normalizeAlias(existingAlias) === normalizedAlias) {
        return existingCommandId;
      }
    }
  }

  return null;
}

function canonicalKeyPart(key: string): string {
  const normalized = key.trim().toLowerCase();
  if (normalized === "spacebar") return "space";
  if (normalized === "return") return "enter";
  if (normalized === "esc") return "escape";
  return normalized;
}

function canonicalHotkey(shortcut: string): string {
  const tokens = shortcut
    .split("+")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (tokens.length === 0) {
    return "";
  }

  const key = canonicalKeyPart(tokens[tokens.length - 1]);
  const modifiers = new Set<string>();
  for (const token of tokens.slice(0, -1)) {
    const normalized = token.toLowerCase();
    if (
      normalized === "super" ||
      normalized === "meta" ||
      normalized === "cmd" ||
      normalized === "command"
    ) {
      modifiers.add("super");
      continue;
    }
    if (normalized === "ctrl" || normalized === "control") {
      modifiers.add("control");
      continue;
    }
    if (normalized === "alt" || normalized === "option" || normalized === "opt") {
      modifiers.add("alt");
      continue;
    }
    if (normalized === "shift") {
      modifiers.add("shift");
    }
  }

  const parts = [
    ...(modifiers.has("super") ? ["super"] : []),
    ...(modifiers.has("control") ? ["control"] : []),
    ...(modifiers.has("alt") ? ["alt"] : []),
    ...(modifiers.has("shift") ? ["shift"] : []),
    key,
  ];

  return parts.join("+");
}

export function findHotkeyConflictCommandId(
  commandHotkeys: Record<string, string>,
  commandId: string,
  hotkey: string,
): string | null {
  const requestedCanonical = canonicalHotkey(hotkey);
  if (!requestedCanonical) {
    return null;
  }

  for (const [existingCommandId, existingHotkey] of Object.entries(commandHotkeys)) {
    if (existingCommandId === commandId) {
      continue;
    }
    if (canonicalHotkey(existingHotkey) === requestedCanonical) {
      return existingCommandId;
    }
  }

  return null;
}

export function dispatchEnterToTarget(target: HTMLElement | null): void {
  const keydownEvent = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  });

  if (target && target.isConnected) {
    target.dispatchEvent(keydownEvent);
  }

  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
}

export function dispatchKeyboardShortcutToTarget(
  target: HTMLElement | null,
  options: {
    key: string;
    code?: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
  },
): void {
  const eventInit: KeyboardEventInit = {
    key: options.key,
    code: options.code,
    metaKey: options.metaKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    altKey: options.altKey ?? false,
    shiftKey: options.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  };

  if (target && target.isConnected) {
    target.dispatchEvent(new KeyboardEvent("keydown", eventInit));
  }

  window.dispatchEvent(new KeyboardEvent("keydown", eventInit));
}
