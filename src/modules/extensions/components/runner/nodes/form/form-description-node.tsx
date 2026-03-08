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
    <div className="space-y-1.5 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-3">
      {title ? <p className="text-[12px] font-medium text-muted-foreground">{title}</p> : null}
      {text ? <p className="text-[13px] text-foreground leading-relaxed">{text}</p> : null}
    </div>
  );
}

