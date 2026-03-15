import type { ExtensionUiNode } from "@/modules/extensions/runtime/store";
import { asString } from "@/modules/extensions/components/runner/utils";

export interface DropdownItemDescriptor {
  nodeId: number;
  value: string;
  title: string;
  icon?: unknown;
}

export interface DropdownSectionDescriptor {
  title?: string;
  items: DropdownItemDescriptor[];
}

function isDropdownItemType(type: string): boolean {
  return (
    type === "List.Dropdown.Item" || type === "Grid.Dropdown.Item" || type === "Form.Dropdown.Item"
  );
}

function isDropdownSectionType(type: string): boolean {
  return (
    type === "List.Dropdown.Section" ||
    type === "Grid.Dropdown.Section" ||
    type === "Form.Dropdown.Section"
  );
}

export function getDropdownItems(
  node: ExtensionUiNode,
  uiTree: Map<number, ExtensionUiNode>,
): DropdownItemDescriptor[] {
  return getDropdownSections(node, uiTree).flatMap((section) => section.items);
}

export function getDropdownSections(
  node: ExtensionUiNode,
  uiTree: Map<number, ExtensionUiNode>,
): DropdownSectionDescriptor[] {
  const rootItems: DropdownItemDescriptor[] = [];
  const sections: DropdownSectionDescriptor[] = [];

  const collectItems = (childIds: number[]): DropdownItemDescriptor[] => {
    const items: DropdownItemDescriptor[] = [];

    for (const childId of childIds) {
      const childNode = uiTree.get(childId);
      if (!childNode) {
        continue;
      }

      if (isDropdownItemType(childNode.type)) {
        const title = asString(childNode.props.title, "Option").trim() || "Option";
        const value = asString(childNode.props.value, title).trim() || title;
        items.push({
          nodeId: childNode.id,
          value,
          title,
          icon: childNode.props.icon,
        });
        continue;
      }

      if (isDropdownSectionType(childNode.type)) {
        const sectionItems = collectItems(childNode.children);
        if (sectionItems.length > 0) {
          sections.push({
            title: asString(childNode.props.title).trim() || undefined,
            items: sectionItems,
          });
        }
      }
    }
    return items;
  };

  rootItems.push(...collectItems(node.children));
  return rootItems.length > 0 ? [{ items: rootItems }, ...sections] : sections;
}
