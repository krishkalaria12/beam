import { DetailView } from "@/components/module";
import { cn } from "@/lib/utils";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { asString } from "@/modules/extensions/components/runner/utils";

import { RuntimeActionFooter } from "./runtime-action-footer";
import { collectMetadataItems } from "./utils";

interface RuntimeDetailViewProps {
  state: UseExtensionRunnerStateResult;
  nodeId: number;
  nested?: boolean;
}

export function RuntimeDetailView({
  state,
  nodeId,
  nested = false,
}: RuntimeDetailViewProps) {
  const node = state.uiTree.get(nodeId);
  if (!node) {
    return null;
  }

  const markdown = asString(node.props.markdown).trim();
  const metadataNodeId = node.namedChildren?.metadata;
  const metadataItems = metadataNodeId ? collectMetadataItems(metadataNodeId, state) : [];

  const content = (
    <div className={cn("min-h-0 flex-1", nested ? "p-4" : "px-6 py-5")}>
      <DetailView
        markdown={markdown}
        metadata={metadataItems}
        emptyTitle="No detail available"
        className="mx-auto max-w-5xl"
        contentClassName="pr-4"
      />
    </div>
  );

  if (nested) {
    return content;
  }

  return (
    <>
      {content}
      <RuntimeActionFooter state={state} actions={state.rootActions} />
    </>
  );
}
