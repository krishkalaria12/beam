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
      <div className="rounded-md border border-dashed border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2 py-1 text-[11px] font-medium text-muted-foreground">
        Unsupported component: <span className="font-mono text-[var(--icon-red-fg)]">{node.type}</span>
      </div>
    );
  }

  return <Component nodeId={nodeId} state={state} renderContext={renderContext} />;
}

