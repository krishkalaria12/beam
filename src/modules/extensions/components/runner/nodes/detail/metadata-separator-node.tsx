import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function MetadataSeparatorNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || !node.type.endsWith(".Separator")) {
    return null;
  }

  return <div className="h-px w-full bg-[var(--ui-divider)] my-2" />;
}

