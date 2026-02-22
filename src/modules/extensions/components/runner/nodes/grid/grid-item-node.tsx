import { cn } from "@/lib/utils";
import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export function GridItemNode({ nodeId, state, renderContext }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Grid.Item") {
    return null;
  }

  const title = asString(node.props.title, "Untitled");
  const subtitle = asString(node.props.subtitle).trim() || undefined;
  const isSelected = Boolean(renderContext?.selected);

  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-md border p-2 text-left transition-colors",
        isSelected
          ? "border-primary/40 bg-primary/10"
          : "border-border/50 bg-card hover:border-border",
      )}
      onMouseEnter={renderContext?.onSelect}
      onClick={renderContext?.onSelect}
      onDoubleClick={renderContext?.onActivate}
    >
      <div className="mb-2 aspect-square w-full rounded-sm border border-border/50 bg-background/60" />
      <p className="truncate text-xs font-medium">{title}</p>
      {subtitle ? <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p> : null}
    </button>
  );
}
