import { RunnerNodeRenderer } from "@/modules/extensions/components/runner/nodes/node-renderer";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function MetadataNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || !node.type.endsWith(".Metadata")) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-card p-3">
      {node.children.map((childId) => (
        <RunnerNodeRenderer key={childId} nodeId={childId} state={state} />
      ))}
    </div>
  );
}
