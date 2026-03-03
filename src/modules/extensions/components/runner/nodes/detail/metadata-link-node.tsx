import { asString } from "@/modules/extensions/components/runner/utils";
import { Button } from "@/components/ui/button";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function MetadataLinkNode({ nodeId, state }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || !node.type.endsWith(".Link")) {
    return null;
  }

  const title = asString(node.props.title).trim();
  const target = asString(node.props.target).trim();
  const text = asString(node.props.text).trim() || target;

  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{title || "Link"}</span>
      {target ? (
        <Button
          type="button"
          variant="link"
          size="xs"
          className="truncate text-right text-primary underline-offset-4 hover:underline"
          onClick={() => {
            window.open(target, "_blank", "noopener,noreferrer");
          }}
        >
          {text}
        </Button>
      ) : (
        <span className="text-right">{text || "-"}</span>
      )}
    </div>
  );
}
