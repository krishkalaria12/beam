import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function MetadataTagListItemNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || !node.type.endsWith(".TagList.Item")) {
    return null;
  }

  const text = asString(node.props.text).trim();
  if (!text) {
    return null;
  }

  return <span className="rounded bg-muted px-2 py-0.5 text-xs">{text}</span>;
}
