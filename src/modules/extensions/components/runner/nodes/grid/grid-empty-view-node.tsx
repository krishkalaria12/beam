import { extractText } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function GridEmptyViewNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Grid.EmptyView") {
    return null;
  }

  const title =
    (typeof node.props.title === "string" && node.props.title.trim()) ||
    extractText(state.uiTree, node.id) ||
    "No results.";

  return (
    <div className="rounded-xl border border-dashed border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4 text-center text-[12px] text-muted-foreground/50 m-2">
      {title}
    </div>
  );
}

