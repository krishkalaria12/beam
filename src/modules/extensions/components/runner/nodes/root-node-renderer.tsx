import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { rootNodeComponentMap } from "@/modules/extensions/components/runner/nodes/root-node-component-map";

interface RootNodeRendererProps {
  state: UseExtensionRunnerStateResult;
}

export function RootNodeRenderer({ state }: RootNodeRendererProps) {
  const Component = rootNodeComponentMap.get(state.rootType);
  if (!Component) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm text-muted-foreground">
        Unsupported root component:{" "}
        <span className="font-mono text-foreground">{state.rootType || "unknown"}</span>
      </div>
    );
  }

  return <Component state={state} />;
}
