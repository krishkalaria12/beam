import { runnerNodeComponentMap } from "@/modules/extensions/components/runner/nodes/node-component-map";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function RunnerNodeRenderer({ nodeId, state, renderContext }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node) {
    return null;
  }

  const Component = runnerNodeComponentMap.get(node.type);
  if (!Component) {
    return (
      <div className="rounded border border-dashed border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
        Unsupported component: <span className="font-mono">{node.type}</span>
      </div>
    );
  }

  return <Component nodeId={nodeId} state={state} renderContext={renderContext} />;
}
