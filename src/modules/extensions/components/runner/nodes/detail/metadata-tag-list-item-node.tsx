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

  return (
    <span className="rounded-md border border-[var(--launcher-chip-border)] bg-[var(--launcher-chip-bg)] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {text}
    </span>
  );
}

