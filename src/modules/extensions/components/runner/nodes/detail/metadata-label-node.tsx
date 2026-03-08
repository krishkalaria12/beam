import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function MetadataLabelNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || !node.type.endsWith(".Label")) {
    return null;
  }

  const title = asString(node.props.title).trim();
  const text =
    typeof node.props.text === "object" && node.props.text
      ? asString((node.props.text as { value?: unknown }).value).trim()
      : asString(node.props.text).trim();

  return (
    <div className="flex items-start justify-between gap-3 text-[13px]">
      <span className="font-medium text-muted-foreground">{title || "Value"}</span>
      <span className="text-right text-foreground">{text || "-"}</span>
    </div>
  );
}

