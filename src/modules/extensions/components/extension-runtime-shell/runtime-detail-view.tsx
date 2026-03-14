import { DetailView } from "@/components/module";
import { cn } from "@/lib/utils";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { asString } from "@/modules/extensions/components/runner/utils";

import { RuntimeActionFooter } from "./runtime-action-footer";
import { collectMetadataItems, readClassName, readStyle } from "./utils";

interface RuntimeDetailViewProps {
  state: UseExtensionRunnerStateResult;
  nodeId: number;
  nested?: boolean;
}

export function RuntimeDetailView({ state, nodeId, nested = false }: RuntimeDetailViewProps) {
  const node = state.uiTree.get(nodeId);
  if (!node) {
    return null;
  }

  const markdown = asString(node.props.markdown).trim();
  const metadataNodeId = node.namedChildren?.metadata;
  const metadataItems = metadataNodeId ? collectMetadataItems(metadataNodeId, state) : [];
  const className = readClassName(node.props.className);
  const style = readStyle(node.props.style);
  const contentClassName = readClassName(node.props.contentClassName);
  const contentStyle = readStyle(node.props.contentStyle);
  const metadataClassName = readClassName(node.props.metadataClassName);
  const metadataStyle = readStyle(node.props.metadataStyle);
  const markdownClassName = readClassName(node.props.markdownClassName);

  const content = (
    <div
      className={cn(
        "ext-detail-page min-h-0 flex-1 overflow-hidden",
        nested ? "ext-detail-page-nested p-4" : "ext-detail-page-root px-6 py-5",
      )}
    >
      <DetailView
        markdown={markdown}
        metadata={metadataItems}
        emptyTitle="No detail available"
        className={cn("ext-detail-view mx-auto h-full w-full max-w-5xl", className)}
        style={style}
        contentClassName={cn("ext-detail-content pr-4", contentClassName)}
        contentStyle={contentStyle}
        metadataClassName={cn("ext-detail-metadata-pane", metadataClassName)}
        metadataStyle={metadataStyle}
        markdownClassName={cn("ext-markdown", markdownClassName)}
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
