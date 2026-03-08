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
    <div className="flex items-start justify-between gap-3 text-[13px]">
      <span className="font-medium text-muted-foreground">{title || "Link"}</span>
      {target ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 truncate text-right font-medium text-[var(--ring)] underline-offset-4 hover:underline"
          onClick={() => {
            window.open(target, "_blank", "noopener,noreferrer");
          }}
        >
          {text}
        </Button>
      ) : (
        <span className="text-right text-foreground">{text || "-"}</span>
      )}
    </div>
  );
}

