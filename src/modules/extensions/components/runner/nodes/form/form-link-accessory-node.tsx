import { asString } from "@/modules/extensions/components/runner/utils";
import { Button } from "@/components/ui/button";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function FormLinkAccessoryNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Form.LinkAccessory") {
    return null;
  }

  const text = asString(node.props.text).trim() || "Open";
  const target = asString(node.props.target).trim();

  if (!target) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="link"
      size="xs"
      className="w-fit text-xs text-primary underline-offset-4 hover:underline"
      onClick={() => {
        window.open(target, "_blank", "noopener,noreferrer");
      }}
    >
      {text}
    </Button>
  );
}
