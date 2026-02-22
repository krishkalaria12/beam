import { RunnerNodeRenderer } from "@/modules/extensions/components/runner/nodes/node-renderer";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function MetadataTagListNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || !node.type.endsWith(".TagList")) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {node.children.map((childId) => (
        <RunnerNodeRenderer key={childId} nodeId={childId} state={state} />
      ))}
    </div>
  );
}
