import { SelectItem } from "@/components/ui/select";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";
import { asString } from "@/modules/extensions/components/runner/utils";

function isDropdownItemType(type: string): boolean {
  return (
    type === "List.Dropdown.Item" || type === "Grid.Dropdown.Item" || type === "Form.Dropdown.Item"
  );
}

export function DropdownItemNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || !isDropdownItemType(node.type)) {
    return null;
  }

  const title = asString(node.props.title, "Option").trim() || "Option";
  const value = asString(node.props.value, title).trim() || title;

  return <SelectItem value={value}>{title}</SelectItem>;
}
