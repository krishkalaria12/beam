import { RunnerActionBar } from "@/modules/extensions/components/runner/runner-action-bar";
import { RunnerNodeRenderer } from "@/modules/extensions/components/runner/nodes/node-renderer";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";
import { asString } from "@/modules/extensions/components/runner/utils";

export function DetailRootNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node) {
    return null;
  }

  if (
    node.type !== "Detail" &&
    node.type !== "List.Item.Detail" &&
    node.type !== "Grid.Item.Detail"
  ) {
    return null;
  }

  const markdown = asString(node.props.markdown).trim();
  const metadataNodeId = node.namedChildren?.metadata;

  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {markdown ? (
          <pre className="whitespace-pre-wrap rounded-md border border-border/60 bg-card p-3 text-sm leading-relaxed">
            {markdown}
          </pre>
        ) : null}
        {metadataNodeId ? <RunnerNodeRenderer nodeId={metadataNodeId} state={state} /> : null}
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
