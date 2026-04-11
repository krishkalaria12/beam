import type { ExtensionUiNode } from "@/modules/extensions/runtime/store";

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function findNode(
  tree: Map<number, ExtensionUiNode>,
  nodeId?: number,
): ExtensionUiNode | undefined {
  if (!nodeId) {
    return undefined;
  }
  return tree.get(nodeId);
}

function extractText(tree: Map<number, ExtensionUiNode>, nodeId?: number): string {
  const node = findNode(tree, nodeId);
  if (!node) {
    return "";
  }
  if (node.type === "TEXT") {
    return asString(node.text);
  }
  return node.children
    .map((childId) => extractText(tree, childId))
    .join(" ")
    .trim();
}
