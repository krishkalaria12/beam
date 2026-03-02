import { EXTENSIONS_RUNNER_ACTION_CONTAINER_TYPE_SET } from "@/modules/extensions/constants";
import type { FlattenedAction } from "@/modules/extensions/components/runner/types";
import type { ExtensionUiNode } from "@/modules/extensions/runtime/store";
import { asBoolean, asString } from "@/modules/extensions/components/runner/utils";

type ShortcutModifier = "cmd" | "ctrl" | "opt" | "shift";

function parseShortcutModifiers(value: unknown): ShortcutModifier[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim().toLowerCase() : ""))
    .filter(
      (entry): entry is ShortcutModifier =>
        entry === "cmd" || entry === "ctrl" || entry === "opt" || entry === "shift",
    );
}

function formatShortcutLabel(key: string, modifiers: ShortcutModifier[]): string {
  const modifierOrder: ShortcutModifier[] = ["cmd", "ctrl", "opt", "shift"];
  const parts: string[] = modifierOrder
    .filter((modifier) => modifiers.includes(modifier))
    .map((modifier) => {
      if (modifier === "cmd") {
        return "Cmd";
      }
      if (modifier === "ctrl") {
        return "Ctrl";
      }
      if (modifier === "opt") {
        return "Alt";
      }
      return "Shift";
    });

  const normalizedKey = key.trim();
  if (normalizedKey.length > 0) {
    parts.push(normalizedKey.length === 1 ? normalizedKey.toUpperCase() : normalizedKey);
  }

  return parts.join("+");
}

export function collectActions(
  tree: Map<number, ExtensionUiNode>,
  rootActionNodeId?: number,
): FlattenedAction[] {
  if (!rootActionNodeId) {
    return [];
  }

  const results: FlattenedAction[] = [];
  const visited = new Set<number>();
  const stack = [rootActionNodeId];

  while (stack.length > 0) {
    const nodeId = stack.pop();
    if (!nodeId || visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);

    const node = tree.get(nodeId);
    if (!node) {
      continue;
    }

    if (node.type === "Action" || node.type.startsWith("Action.")) {
      const shortcut = node.props.shortcut;
      const shortcutKey =
        shortcut && typeof shortcut === "object"
          ? asString((shortcut as { key?: unknown }).key).trim()
          : "";
      const shortcutModifiers =
        shortcut && typeof shortcut === "object"
          ? parseShortcutModifiers((shortcut as { modifiers?: unknown }).modifiers)
          : [];
      const shortcutLabel =
        shortcutKey.length > 0 ? formatShortcutLabel(shortcutKey, shortcutModifiers) : undefined;

      results.push({
        nodeId: node.id,
        type: node.type,
        title: asString(node.props.title, node.type.replace("Action.", "")).trim() || "Action",
        shortcut: shortcutLabel,
        shortcutDefinition:
          shortcutKey.length > 0
            ? {
                key: shortcutKey,
                modifiers: shortcutModifiers,
              }
            : undefined,
        style: asString(node.props.style).toLowerCase(),
        hasOnAction: asBoolean(node.props.onAction),
        hasOnSubmit: asBoolean(node.props.onSubmit),
        props: node.props,
      });
    }

    if (
      EXTENSIONS_RUNNER_ACTION_CONTAINER_TYPE_SET.has(node.type) ||
      node.type === "Action" ||
      node.type.startsWith("Action.")
    ) {
      for (const childId of node.children) {
        stack.push(childId);
      }
      if (node.namedChildren) {
        for (const childId of Object.values(node.namedChildren)) {
          stack.push(childId);
        }
      }
    }
  }

  return results;
}
