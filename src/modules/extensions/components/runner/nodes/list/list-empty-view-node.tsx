import { extractText } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function ListEmptyViewNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "List.EmptyView") {
    return null;
  }

  const title =
    (typeof node.props.title === "string" && node.props.title.trim()) ||
    extractText(state.uiTree, node.id) ||
    "No results.";

  return (
    <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
      {title}
    </div>
  );
}
