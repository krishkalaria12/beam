import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function ListSectionNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "List.Section") {
    return null;
  }

  const title = asString(node.props.title).trim();
  if (!title) {
    return null;
  }

  return (
    <h3 className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {title}
    </h3>
  );
}

