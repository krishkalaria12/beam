import type { ReactNode } from "react";

import type { ExtensionUiNode } from "@/modules/extensions/runtime/store";
import type {
  FlattenedAction,
  FormDescriptionEntry,
  FormField,
  FormValue,
  ListEntry,
} from "@/modules/extensions/components/runner/types";

const ACTION_CONTAINER_TYPES = new Set([
  "ActionPanel",
  "ActionPanel.Section",
  "ActionPanel.Submenu",
]);

const FORM_FIELD_TYPES = new Set([
  "Form.TextField",
  "Form.TextArea",
  "Form.Dropdown",
  "Form.Checkbox",
]);

export interface ListModel {
  entries: ListEntry[];
  emptyViewNodeId?: number;
  rootActionsNodeId?: number;
}

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

export function findNode(
  tree: Map<number, ExtensionUiNode>,
  nodeId?: number,
): ExtensionUiNode | undefined {
  if (!nodeId) {
    return undefined;
  }
  return tree.get(nodeId);
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
      const shortcutLabel =
        shortcut && typeof shortcut === "object"
          ? `${asString((shortcut as { key?: unknown }).key).toUpperCase()}`
          : undefined;
      results.push({
        nodeId: node.id,
        type: node.type,
        title: asString(node.props.title, node.type.replace("Action.", "")).trim() || "Action",
        shortcut: shortcutLabel,
        style: asString(node.props.style).toLowerCase(),
        hasOnAction: asBoolean(node.props.onAction),
        hasOnSubmit: asBoolean(node.props.onSubmit),
        props: node.props,
      });
    }

    if (ACTION_CONTAINER_TYPES.has(node.type) || node.type === "Action" || node.type.startsWith("Action.")) {
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

export function collectListEntries(tree: Map<number, ExtensionUiNode>, root: ExtensionUiNode): ListModel {
  const entries: ListEntry[] = [];
  let emptyViewNodeId: number | undefined;

  const visitItemNode = (nodeId: number, sectionTitle?: string) => {
    const node = tree.get(nodeId);
    if (!node || node.type !== "List.Item") {
      return;
    }

    const title = asString(node.props.title, "Untitled");
    const subtitle = asString(node.props.subtitle).trim() || undefined;
    const keywords = [
      title,
      subtitle ?? "",
      ...asStringArray(node.props.keywords),
    ]
      .join(" ")
      .toLowerCase();

    entries.push({
      nodeId: node.id,
      sectionTitle,
      title,
      subtitle,
      keywords,
      itemId: asString(node.props.id, String(node.id)),
      actionsNodeId: node.namedChildren?.actions,
      detailNodeId: node.namedChildren?.detail,
      hasOnAction: asBoolean(node.props.onAction),
    });
  };

  for (const childId of root.children) {
    const child = tree.get(childId);
    if (!child) {
      continue;
    }

    if (child.type === "List.Item") {
      visitItemNode(child.id);
      continue;
    }

    if (child.type === "List.Section") {
      const sectionTitle = asString(child.props.title).trim() || undefined;
      for (const sectionChildId of child.children) {
        visitItemNode(sectionChildId, sectionTitle);
      }
      continue;
    }

    if (child.type === "List.EmptyView") {
      emptyViewNodeId = child.id;
    }
  }

  return {
    entries,
    emptyViewNodeId,
    rootActionsNodeId: root.namedChildren?.actions,
  };
}

export function collectGridEntries(tree: Map<number, ExtensionUiNode>, root: ExtensionUiNode): ListEntry[] {
  const entries: ListEntry[] = [];

  const visitGridItem = (nodeId: number, sectionTitle?: string) => {
    const node = tree.get(nodeId);
    if (!node || node.type !== "Grid.Item") {
      return;
    }
    const title = asString(node.props.title, "Untitled");
    const subtitle = asString(node.props.subtitle).trim() || undefined;
    entries.push({
      nodeId: node.id,
      sectionTitle,
      title,
      subtitle,
      keywords: [title, subtitle ?? ""].join(" ").toLowerCase(),
      itemId: asString(node.props.id, String(node.id)),
      actionsNodeId: node.namedChildren?.actions,
      detailNodeId: node.namedChildren?.detail,
      hasOnAction: asBoolean(node.props.onAction),
    });
  };

  for (const childId of root.children) {
    const child = tree.get(childId);
    if (!child) {
      continue;
    }
    if (child.type === "Grid.Item") {
      visitGridItem(child.id);
      continue;
    }
    if (child.type === "Grid.Section") {
      const sectionTitle = asString(child.props.title).trim() || undefined;
      for (const sectionChildId of child.children) {
        visitGridItem(sectionChildId, sectionTitle);
      }
    }
  }

  return entries;
}

export function extractText(tree: Map<number, ExtensionUiNode>, nodeId?: number): string {
  const node = findNode(tree, nodeId);
  if (!node) {
    return "";
  }
  if (node.type === "TEXT") {
    return asString(node.text);
  }
  return node.children.map((childId) => extractText(tree, childId)).join(" ").trim();
}

export function renderMetadataBlock(tree: Map<number, ExtensionUiNode>, nodeId?: number): ReactNode {
  const metadataNode = findNode(tree, nodeId);
  if (!metadataNode) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-card p-3">
      {metadataNode.children.map((childId) => {
        const child = tree.get(childId);
        if (!child) {
          return null;
        }

        if (child.type.endsWith(".Separator")) {
          return <div key={childId} className="h-px w-full bg-border/60" />;
        }

        if (child.type.endsWith(".TagList")) {
          const tags = child.children
            .map((tagId) => tree.get(tagId))
            .filter((tag): tag is ExtensionUiNode => Boolean(tag))
            .map((tag) => asString(tag.props.text).trim())
            .filter(Boolean);
          return (
            <div key={childId} className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={`${childId}:${tag}`} className="rounded bg-muted px-2 py-0.5 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          );
        }

        const title = asString(child.props.title).trim();
        const text =
          asString(child.props.text).trim() ||
          asString(child.props.target).trim() ||
          extractText(tree, child.id);

        return (
          <div key={childId} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{title || "Value"}</span>
            <span className="text-right">{text || "-"}</span>
          </div>
        );
      })}
    </div>
  );
}

export function renderDetailNode(tree: Map<number, ExtensionUiNode>, nodeId?: number): ReactNode {
  const node = findNode(tree, nodeId);
  if (!node) {
    return null;
  }

  if (node.type === "Detail" || node.type === "List.Item.Detail" || node.type === "Grid.Item.Detail") {
    const markdown = asString(node.props.markdown).trim();
    const metadataNodeId = node.namedChildren?.metadata;
    return (
      <div className="space-y-3">
        {markdown ? (
          <pre className="whitespace-pre-wrap rounded-md border border-border/60 bg-card p-3 text-sm leading-relaxed">
            {markdown}
          </pre>
        ) : null}
        {renderMetadataBlock(tree, metadataNodeId)}
      </div>
    );
  }

  return renderMetadataBlock(tree, nodeId);
}

export function collectFormFields(tree: Map<number, ExtensionUiNode>, root: ExtensionUiNode): FormField[] {
  const fields: FormField[] = [];

  const walk = (nodeId: number) => {
    const node = tree.get(nodeId);
    if (!node) {
      return;
    }

    if (FORM_FIELD_TYPES.has(node.type)) {
      const key = asString(node.props.id, String(node.id));
      const title = asString(node.props.title, key);
      const placeholder = asString(node.props.placeholder).trim() || undefined;
      let defaultValue: FormValue = "";
      let controlledValue: FormValue | undefined;
      const options: Array<{ value: string; title: string }> = [];

      if (node.type === "Form.Checkbox") {
        defaultValue = asBoolean(node.props.value, asBoolean(node.props.defaultValue));
        if (typeof node.props.value === "boolean") {
          controlledValue = node.props.value;
        }
      } else if (node.type === "Form.Dropdown") {
        const collectOptions = (candidateId: number) => {
          const candidate = tree.get(candidateId);
          if (!candidate) {
            return;
          }
          if (candidate.type === "Form.Dropdown.Item") {
            const value = asString(candidate.props.value, asString(candidate.props.title, String(candidate.id)));
            const optionTitle = asString(candidate.props.title, value);
            options.push({ value, title: optionTitle });
            return;
          }
          for (const nestedId of candidate.children) {
            collectOptions(nestedId);
          }
        };

        for (const childId of node.children) {
          collectOptions(childId);
        }

        defaultValue =
          asString(node.props.value).trim() ||
          asString(node.props.defaultValue).trim() ||
          options[0]?.value ||
          "";
        if (typeof node.props.value === "string") {
          controlledValue = node.props.value.trim();
        }
      } else {
        defaultValue =
          asString(node.props.value).trim() ||
          asString(node.props.defaultValue).trim() ||
          "";
        if (typeof node.props.value === "string") {
          controlledValue = node.props.value.trim();
        }
      }

      fields.push({
        nodeId: node.id,
        key,
        type: node.type,
        title,
        placeholder,
        options,
        defaultValue,
        controlledValue,
        hasOnChange: asBoolean(node.props.onChange),
      });
    }

    for (const childId of node.children) {
      walk(childId);
    }
  };

  for (const childId of root.children) {
    walk(childId);
  }

  return fields;
}

export function collectFormDescriptions(
  tree: Map<number, ExtensionUiNode>,
  root: ExtensionUiNode,
): FormDescriptionEntry[] {
  const descriptions: FormDescriptionEntry[] = [];

  const walk = (nodeId: number) => {
    const node = tree.get(nodeId);
    if (!node) {
      return;
    }

    if (node.type === "Form.Description") {
      const title = asString(node.props.title, "Description").trim() || "Description";
      const text = asString(node.props.text).trim() || undefined;
      descriptions.push({
        nodeId: node.id,
        title,
        text,
      });
    }

    for (const childId of node.children) {
      walk(childId);
    }
  };

  for (const childId of root.children) {
    walk(childId);
  }

  return descriptions;
}
