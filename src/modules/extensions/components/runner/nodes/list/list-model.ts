import type { ListEntry } from "@/modules/extensions/components/runner/types";
import type { ExtensionUiNode } from "@/modules/extensions/runtime/store";
import { asBoolean, asString, asStringArray } from "@/modules/extensions/components/runner/utils";

export interface ListModel {
  entries: ListEntry[];
  emptyViewNodeId?: number;
  rootActionsNodeId?: number;
}

export function collectListEntries(
  tree: Map<number, ExtensionUiNode>,
  root: ExtensionUiNode,
): ListModel {
  const entries: ListEntry[] = [];
  let emptyViewNodeId: number | undefined;

  const visitItemNode = (
    nodeId: number,
    section?: { title?: string; nodeId?: number },
  ) => {
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
      sectionTitle: section?.title,
      sectionNodeId: section?.nodeId,
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
        visitItemNode(sectionChildId, {
          title: sectionTitle,
          nodeId: child.id,
        });
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
