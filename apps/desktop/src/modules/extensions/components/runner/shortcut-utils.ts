import type { KeyboardShortcutDefinition } from "@/modules/extensions/components/runner/types";

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /mac/i.test(navigator.platform);
}

export function keyMatchesShortcut(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
  shortcut: KeyboardShortcutDefinition,
): boolean {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  const required = new Set(shortcut.modifiers);
  const isMac = isMacPlatform();
  const expectMeta = isMac ? required.has("cmd") : false;
  const expectCtrl = isMac ? required.has("ctrl") : required.has("cmd") || required.has("ctrl");
  const expectAlt = required.has("opt");
  const expectShift = required.has("shift");

  return (
    event.metaKey === expectMeta &&
    event.ctrlKey === expectCtrl &&
    event.altKey === expectAlt &&
    event.shiftKey === expectShift
  );
}

export function parseShortcutTokens(shortcut?: string): string[] {
  if (!shortcut) {
    return [];
  }

  return shortcut
    .split("+")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
