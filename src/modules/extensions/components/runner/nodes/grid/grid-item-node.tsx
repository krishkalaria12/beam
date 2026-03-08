import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RunnerIcon } from "@/modules/extensions/components/runner/nodes/shared/runner-icon";
import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

function toInsetClass(value: unknown): string {
  const inset = asString(value).trim().toLowerCase();
  if (inset === "small") return "p-1.5";
  if (inset === "medium") return "p-2.5";
  if (inset === "large") return "p-4";
  return "p-1";
}

function resolveColorContent(content: unknown): string | undefined {
  if (!content || typeof content !== "object") {
    return undefined;
  }

  if ("color" in (content as Record<string, unknown>)) {
    const color = (content as { color?: unknown }).color;
    if (typeof color === "string") {
      return color;
    }
    if (
      color &&
      typeof color === "object" &&
      typeof (color as { light?: unknown }).light === "string" &&
      typeof (color as { dark?: unknown }).dark === "string"
    ) {
      const prefersDark =
        typeof window !== "undefined"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
          : false;
      return prefersDark ? (color as { dark: string }).dark : (color as { light: string }).light;
    }
  }

  return undefined;
}

function resolveContentValue(content: unknown): unknown {
  if (content && typeof content === "object" && "value" in (content as Record<string, unknown>)) {
    return (content as { value?: unknown }).value;
  }
  return content;
}

export function GridItemNode({ nodeId, state, renderContext }: RunnerNodeComponentProps) {
  const node = state.uiTree.get(nodeId);
  if (!node || node.type !== "Grid.Item") {
    return null;
  }

  const selected = Boolean(renderContext?.selected);
  const title = asString(node.props.title).trim() || undefined;
  const subtitle = asString(node.props.subtitle).trim() || undefined;
  const accessory =
    node.props.accessory && typeof node.props.accessory === "object"
      ? (node.props.accessory as Record<string, unknown>)
      : null;
  const entry = state.currentEntries.find((candidate) => candidate.nodeId === node.id);

  const contentValue = resolveContentValue(node.props.content);
  const colorContent = resolveColorContent(contentValue);
  const aspectRatio = entry?.gridAspectRatio ?? (asString(node.props.aspectRatio).trim() || "1");
  const fit = entry?.gridFit ?? (asString(node.props.fit).trim() || "fill");
  const insetClass = toInsetClass(entry?.gridInset ?? node.props.inset);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "flex h-auto w-full flex-col text-left focus:outline-none p-2 rounded-xl transition-all duration-150",
        selected
          ? "bg-[var(--launcher-card-selected-bg)] ring-1 ring-[var(--launcher-card-selected-border)]"
          : "hover:bg-[var(--launcher-card-hover-bg)]"
      )}
      onMouseEnter={renderContext?.onSelect}
      onClick={renderContext?.onSelect}
      onDoubleClick={renderContext?.onActivate}
    >
      <div
        className={cn(
          "mb-2 w-full overflow-hidden rounded-lg bg-[var(--launcher-card-bg)] border border-[var(--launcher-card-border)] ring-1 ring-transparent",
          insetClass
        )}
        style={{ aspectRatio }}
        title={asString((contentValue as { tooltip?: unknown })?.tooltip).trim() || undefined}
      >
        {colorContent ? (
          <div className="h-full w-full rounded-md" style={{ backgroundColor: colorContent }} />
        ) : (
          <RunnerIcon
            icon={contentValue}
            className={cn("h-full w-full", fit === "contain" ? "object-contain" : "object-cover")}
          />
        )}
      </div>

      {title ? <span className="truncate w-full text-[13px] font-medium tracking-[-0.01em] text-foreground">{title}</span> : null}
      {subtitle ? <span className="truncate w-full text-[11px] text-muted-foreground">{subtitle}</span> : null}

      {accessory ? (
        <div
          className="mt-1 w-full flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
          title={asString(accessory.tooltip).trim() || undefined}
        >
          {accessory.icon ? <RunnerIcon icon={accessory.icon} className="size-3.5" /> : null}
          {asString(accessory.text).trim() ? (
            <span className="truncate">{asString(accessory.text).trim()}</span>
          ) : null}
        </div>
      ) : null}
    </Button>
  );
}

