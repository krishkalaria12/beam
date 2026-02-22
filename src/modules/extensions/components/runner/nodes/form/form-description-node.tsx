import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function FormDescriptionNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Form.Description") {
    return null;
  }

  const title = asString(node.props.title).trim();
  const text = asString(node.props.text).trim();

  return (
    <div className="space-y-1 rounded-md border border-border/60 bg-card px-3 py-2">
      {title ? <p className="text-xs font-medium text-muted-foreground">{title}</p> : null}
      {text ? <p className="text-sm">{text}</p> : null}
    </div>
  );
}
