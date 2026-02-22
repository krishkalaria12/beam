import { cn } from "@/lib/utils";
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
      const prefersDark = typeof window !== "undefined"
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
    <button
      type="button"
      className={cn("flex w-full flex-col text-left focus:outline-none", insetClass)}
      onMouseEnter={renderContext?.onSelect}
      onClick={renderContext?.onSelect}
      onDoubleClick={renderContext?.onActivate}
    >
      <div
        className={cn(
          "mb-1 w-full overflow-hidden rounded-md border-2 bg-muted",
          selected ? "border-foreground" : "border-transparent hover:border-foreground/50",
        )}
        style={{ aspectRatio }}
        title={asString((contentValue as { tooltip?: unknown })?.tooltip).trim() || undefined}
      >
        {colorContent ? (
          <div className="h-full w-full" style={{ backgroundColor: colorContent }} />
        ) : (
          <RunnerIcon
            icon={contentValue}
            className={cn(
              "h-full w-full",
              fit === "contain" ? "object-contain" : "object-fill",
            )}
          />
        )}
      </div>

      {title ? <span className="truncate text-sm font-medium">{title}</span> : null}
      {subtitle ? <span className="truncate text-xs text-muted-foreground">{subtitle}</span> : null}

      {accessory ? (
        <div
          className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"
          title={asString(accessory.tooltip).trim() || undefined}
        >
          {accessory.icon ? <RunnerIcon icon={accessory.icon} className="size-3" /> : null}
          {asString(accessory.text).trim() ? (
            <span className="truncate">{asString(accessory.text).trim()}</span>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
