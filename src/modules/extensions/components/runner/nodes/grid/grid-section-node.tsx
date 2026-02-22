import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function GridSectionNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Grid.Section") {
    return null;
  }

  const title = asString(node.props.title).trim();
  if (!title) {
    return null;
  }

  return (
    <div className="col-span-full pb-1 pt-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
    </div>
  );
}
