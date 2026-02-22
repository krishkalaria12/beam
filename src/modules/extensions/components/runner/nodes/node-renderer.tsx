import { runnerNodeComponentMap } from "@/modules/extensions/components/runner/nodes/node-component-map";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function RunnerNodeRenderer({ nodeId, state, renderContext }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node) {
    return null;
  }

  const Component = runnerNodeComponentMap.get(node.type);
  if (!Component) {
    return null;
  }

  return <Component nodeId={nodeId} state={state} renderContext={renderContext} />;
}
