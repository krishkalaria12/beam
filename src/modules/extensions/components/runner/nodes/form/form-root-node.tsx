import { RunnerActionBar } from "@/modules/extensions/components/runner/runner-action-bar";
import { RunnerNodeRenderer } from "@/modules/extensions/components/runner/nodes/node-renderer";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function FormRootNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Form") {
    return null;
  }

  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {node.children.map((childId) => (
          <RunnerNodeRenderer key={childId} nodeId={childId} state={state} />
        ))}
      </div>
      {state.rootNode?.id === node.id ? (
        <RunnerActionBar
          actions={state.rootActions}
          toast={state.activeToast}
          onToastAction={state.handleToastAction}
          onToastHide={state.handleToastHide}
          onExecuteAction={(action) => {
            void state.executeAction(action);
          }}
        />
      ) : null}
    </>
  );
}
