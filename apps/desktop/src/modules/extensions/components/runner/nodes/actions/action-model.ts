import type {
  ExtensionAction,
  ExtensionActionNode,
  ExtensionActionPanelPage,
  ExtensionActionSection,
  ExtensionActionSubmenu,
} from "@/modules/extensions/components/runner/types";
import { emptyExtensionActionPanelPage } from "@/modules/extensions/components/runner/types";
import { asBoolean, asString } from "@/modules/extensions/components/runner/utils";
import type { ExtensionUiNode } from "@/modules/extensions/runtime/store";

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

function readShortcut(node: ExtensionUiNode) {
  const shortcut = node.props.shortcut;
  const shortcutKey =
    shortcut && typeof shortcut === "object"
      ? asString((shortcut as { key?: unknown }).key).trim()
      : "";
  const shortcutModifiers =
    shortcut && typeof shortcut === "object"
      ? parseShortcutModifiers((shortcut as { modifiers?: unknown }).modifiers)
      : [];

  return {
    shortcut:
      shortcutKey.length > 0 ? formatShortcutLabel(shortcutKey, shortcutModifiers) : undefined,
    shortcutDefinition:
      shortcutKey.length > 0
        ? {
            key: shortcutKey,
            modifiers: shortcutModifiers,
          }
        : undefined,
  };
}

function buildActionNode(node: ExtensionUiNode): ExtensionAction {
  const { shortcut, shortcutDefinition } = readShortcut(node);

  return {
    kind: "action",
    key: `action:${node.id}`,
    nodeId: node.id,
    type: node.type,
    title: asString(node.props.title, node.type.replace("Action.", "")).trim() || "Action",
    icon: node.props.icon,
    shortcut,
    shortcutDefinition,
    style: asString(node.props.style).toLowerCase() || undefined,
    autoFocus: asBoolean(node.props.autoFocus),
    hasOnAction: asBoolean(node.props.onAction),
    hasOnSubmit: asBoolean(node.props.onSubmit),
    props: node.props,
  };
}

function buildSubmenuNode(
  tree: Map<number, ExtensionUiNode>,
  node: ExtensionUiNode,
  visited: Set<number>,
): ExtensionActionSubmenu {
  const { shortcut, shortcutDefinition } = readShortcut(node);
  const title = asString(node.props.title, "Submenu").trim() || "Submenu";

  return {
    kind: "submenu",
    key: `submenu:${node.id}`,
    nodeId: node.id,
    type: node.type,
    title,
    icon: node.props.icon,
    shortcut,
    shortcutDefinition,
    autoFocus: asBoolean(node.props.autoFocus),
    hasOnOpen: asBoolean(node.props.onOpen),
    props: node.props,
    page: buildActionPage(tree, node.id, visited),
  };
}

function buildSectionItems(
  tree: Map<number, ExtensionUiNode>,
  childIds: number[],
  visited: Set<number>,
): ExtensionActionNode[] {
  const items: ExtensionActionNode[] = [];

  for (const childId of childIds) {
    const child = tree.get(childId);
    if (!child) {
      continue;
    }

    if (child.type === "Action" || child.type.startsWith("Action.")) {
      items.push(buildActionNode(child));
      continue;
    }

    if (child.type === "ActionPanel.Submenu") {
      items.push(buildSubmenuNode(tree, child, visited));
    }
  }

  return items;
}

function buildSections(
  tree: Map<number, ExtensionUiNode>,
  node: ExtensionUiNode,
  visited: Set<number>,
): ExtensionActionSection[] {
  const sections: ExtensionActionSection[] = [];
  let outsideItems: ExtensionActionNode[] = [];
  let syntheticSectionIndex = 0;

  const flushOutsideItems = () => {
    if (outsideItems.length === 0) {
      return;
    }

    sections.push({
      key: `${node.id}:section:auto:${syntheticSectionIndex}`,
      items: outsideItems,
    });
    syntheticSectionIndex += 1;
    outsideItems = [];
  };

  for (const childId of node.children) {
    const child = tree.get(childId);
    if (!child) {
      continue;
    }

    if (child.type === "ActionPanel.Section") {
      flushOutsideItems();
      const items = buildSectionItems(tree, child.children, visited);
      if (items.length > 0) {
        sections.push({
          key: `section:${child.id}`,
          title: asString(child.props.title).trim() || undefined,
          items,
        });
      }
      continue;
    }

    if (child.type === "Action" || child.type.startsWith("Action.")) {
      outsideItems.push(buildActionNode(child));
      continue;
    }

    if (child.type === "ActionPanel.Submenu") {
      outsideItems.push(buildSubmenuNode(tree, child, visited));
    }
  }

  flushOutsideItems();
  return sections;
}

function buildActionPage(
  tree: Map<number, ExtensionUiNode>,
  rootActionNodeId: number,
  visited: Set<number>,
): ExtensionActionPanelPage {
  if (visited.has(rootActionNodeId)) {
    return emptyExtensionActionPanelPage(`panel:cycle:${rootActionNodeId}`);
  }

  const node = tree.get(rootActionNodeId);
  if (!node) {
    return emptyExtensionActionPanelPage(`panel:missing:${rootActionNodeId}`);
  }

  visited.add(rootActionNodeId);

  try {
    return {
      key: `panel:${rootActionNodeId}`,
      title: asString(node.props.title).trim() || undefined,
      sections: buildSections(tree, node, visited),
    };
  } finally {
    visited.delete(rootActionNodeId);
  }
}

export function collectActions(
  tree: Map<number, ExtensionUiNode>,
  rootActionNodeId?: number,
): ExtensionActionPanelPage {
  if (!rootActionNodeId) {
    return emptyExtensionActionPanelPage();
  }

  return buildActionPage(tree, rootActionNodeId, new Set<number>());
}
