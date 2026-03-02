import type { ListEntry } from "@/modules/extensions/components/runner/types";
import type { ExtensionUiNode } from "@/modules/extensions/runtime/store";
import { asBoolean, asString, asStringArray } from "@/modules/extensions/components/runner/utils";

export function collectGridEntries(
  tree: Map<number, ExtensionUiNode>,
  root: ExtensionUiNode,
): ListEntry[] {
  const entries: ListEntry[] = [];

  const visitGridItem = (
    nodeId: number,
    section?: {
      title?: string;
      nodeId?: number;
      columns?: number;
      aspectRatio?: string;
      fit?: string;
      inset?: string;
    },
  ) => {
    const node = tree.get(nodeId);
    if (!node || node.type !== "Grid.Item") {
      return;
    }

    const title = asString(node.props.title, "Untitled");
    const subtitle = asString(node.props.subtitle).trim() || undefined;
    const keywords = [title, subtitle ?? "", ...asStringArray(node.props.keywords)]
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
      gridColumns: section?.columns,
      gridAspectRatio: section?.aspectRatio,
      gridFit: section?.fit,
      gridInset: section?.inset,
    });
  };

  const rootColumnsRaw = root.props.columns;
  const defaultColumns =
    typeof rootColumnsRaw === "number" && Number.isFinite(rootColumnsRaw) && rootColumnsRaw > 0
      ? Math.max(1, Math.floor(rootColumnsRaw))
      : 6;
  const defaultAspectRatio = asString(root.props.aspectRatio).trim() || undefined;
  const defaultFit = asString(root.props.fit).trim() || undefined;
  const defaultInset = asString(root.props.inset).trim() || undefined;

  for (const childId of root.children) {
    const child = tree.get(childId);
    if (!child) {
      continue;
    }

    if (child.type === "Grid.Item") {
      visitGridItem(child.id, {
        columns: defaultColumns,
        aspectRatio: defaultAspectRatio,
        fit: defaultFit,
        inset: defaultInset,
      });
      continue;
    }

    if (child.type === "Grid.Section") {
      const sectionTitle = asString(child.props.title).trim() || undefined;
      const sectionColumnsRaw = child.props.columns;
      const sectionColumns =
        typeof sectionColumnsRaw === "number" &&
        Number.isFinite(sectionColumnsRaw) &&
        sectionColumnsRaw > 0
          ? Math.max(1, Math.floor(sectionColumnsRaw))
          : defaultColumns;
      const sectionAspectRatio = asString(child.props.aspectRatio).trim() || defaultAspectRatio;
      const sectionFit = asString(child.props.fit).trim() || defaultFit;
      const sectionInset = asString(child.props.inset).trim() || defaultInset;

      for (const sectionChildId of child.children) {
        visitGridItem(sectionChildId, {
          title: sectionTitle,
          nodeId: child.id,
          columns: sectionColumns,
          aspectRatio: sectionAspectRatio,
          fit: sectionFit,
          inset: sectionInset,
        });
      }
    }
  }

  return entries;
}
