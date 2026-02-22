import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function GridSectionNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Grid.Section") {
    return null;
  }

  const title = asString(node.props.title).trim();
  const subtitle = asString(node.props.subtitle).trim() || undefined;
  if (!title) {
    return null;
  }

  return (
    <div className="col-start-1 -col-end-1 -mb-1 flex items-baseline gap-2 pt-2.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
