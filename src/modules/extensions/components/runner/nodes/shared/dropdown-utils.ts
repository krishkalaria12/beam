import type { ExtensionUiNode } from "@/modules/extensions/runtime/store";
import { asString } from "@/modules/extensions/components/runner/utils";

interface DropdownItemDescriptor {
  nodeId: number;
  value: string;
  title: string;
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
  const items: DropdownItemDescriptor[] = [];

  const walk = (childIds: number[]) => {
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
        });
        continue;
      }

      if (isDropdownSectionType(childNode.type)) {
        walk(childNode.children);
      }
    }
  };

  walk(node.children);
  return items;
}
