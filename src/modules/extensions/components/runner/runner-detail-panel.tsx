import type { ExtensionUiNode } from "@/modules/extensions/runtime/store";
import type { FlattenedAction } from "@/modules/extensions/components/runner/types";
import { RunnerActionBar } from "@/modules/extensions/components/runner/runner-action-bar";
import { renderMetadataBlock } from "@/modules/extensions/components/runner/utils";
import type { ExtensionToast } from "@/modules/extensions/runtime/store";

interface RunnerDetailPanelProps {
  rootNode: ExtensionUiNode;
  uiTree: Map<number, ExtensionUiNode>;
  rootActions: FlattenedAction[];
  toast?: ExtensionToast;
  onToastAction: (toastId: number, actionType: "primary" | "secondary") => void;
  onToastHide: (toastId: number) => void;
  onExecuteAction: (action: FlattenedAction) => void;
}

export function RunnerDetailPanel({
  rootNode,
  uiTree,
  rootActions,
  toast,
  onToastAction,
  onToastHide,
  onExecuteAction,
}: RunnerDetailPanelProps) {
  const markdown = typeof rootNode.props.markdown === "string" ? rootNode.props.markdown.trim() : "";
  const metadataNodeId = rootNode.namedChildren?.metadata;

  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {markdown ? (
          <pre className="whitespace-pre-wrap rounded-md border border-border/60 bg-card p-3 text-sm leading-relaxed">
            {markdown}
          </pre>
        ) : (
          <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
            No detail content.
          </div>
        )}
        {renderMetadataBlock(uiTree, metadataNodeId)}
      </div>
      <RunnerActionBar
        actions={rootActions}
        toast={toast}
        onToastAction={onToastAction}
        onToastHide={onToastHide}
        onExecuteAction={onExecuteAction}
      />
    </>
  );
}
