import { SelectGroup, SelectLabel } from "@/components/ui/select";
import { RunnerNodeRenderer } from "@/modules/extensions/components/runner/nodes/node-renderer";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";
import { asString } from "@/modules/extensions/components/runner/utils";

function isDropdownSectionType(type: string): boolean {
  return (
    type === "List.Dropdown.Section" ||
    type === "Grid.Dropdown.Section" ||
    type === "Form.Dropdown.Section"
  );
}

export function DropdownSectionNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || !isDropdownSectionType(node.type)) {
    return null;
  }

  const title = asString(node.props.title).trim();

  return (
    <SelectGroup>
      {title ? <SelectLabel>{title}</SelectLabel> : null}
      {node.children.map((childId) => (
        <RunnerNodeRenderer key={childId} nodeId={childId} state={state} />
      ))}
    </SelectGroup>
  );
}
