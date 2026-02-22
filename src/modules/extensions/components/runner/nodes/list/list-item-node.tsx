import { cn } from "@/lib/utils";
import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

function readAccessoryLabel(accessory: unknown): string | null {
  if (!accessory || typeof accessory !== "object") {
    return null;
  }

  const record = accessory as Record<string, unknown>;
  if (typeof record.text === "string") {
    return record.text.trim() || null;
  }

  const tag = record.tag;
  if (typeof tag === "string") {
    return tag.trim() || null;
  }

  if (tag && typeof tag === "object" && "value" in tag) {
    const value = (tag as { value?: unknown }).value;
    if (typeof value === "string") {
      return value.trim() || null;
    }
  }

  const date = record.date;
  if (date instanceof Date) {
    return date.toLocaleString();
  }
  if (typeof date === "string") {
    return date.trim() || null;
  }

  return null;
}

export function ListItemNode({ nodeId, state, renderContext }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "List.Item") {
    return null;
  }

  const title = asString(node.props.title, "Untitled");
  const subtitle = asString(node.props.subtitle).trim() || undefined;
  const accessories = Array.isArray(node.props.accessories)
    ? node.props.accessories.map(readAccessoryLabel).filter((entry): entry is string => Boolean(entry))
    : [];

  const isSelected = Boolean(renderContext?.selected);

  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-md border px-3 py-2 text-left transition-colors",
        isSelected
          ? "border-primary/40 bg-primary/10"
          : "border-transparent bg-card hover:border-border/70",
      )}
      onMouseEnter={renderContext?.onSelect}
      onClick={renderContext?.onSelect}
      onDoubleClick={renderContext?.onActivate}
    >
      <p className="truncate text-sm font-medium">{title}</p>
      {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      {accessories.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {accessories.map((entry) => (
            <span
              key={`${node.id}:${entry}`}
              className="rounded-sm border border-border/70 bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {entry}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
