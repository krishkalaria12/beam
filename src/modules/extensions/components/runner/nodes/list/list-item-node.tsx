import { cn } from "@/lib/utils";
import { ListItem } from "@/components/module";
import { RunnerIcon } from "@/modules/extensions/components/runner/nodes/shared/runner-icon";
import { asString } from "@/modules/extensions/components/runner/utils";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

interface AccessoryDescriptor {
  key: string;
  text?: string;
  tooltip?: string;
  icon?: unknown;
  color?: string;
}

function formatRelativeDate(value: Date): string {
  const now = Date.now();
  const deltaSeconds = Math.round((now - value.getTime()) / 1000);
  if (deltaSeconds < 60) return "now";
  const minutes = Math.round(deltaSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.round(days / 30.44);
  if (months < 12) return `${months}mo`;
  const years = Math.round(days / 365.25);
  return `${years}y`;
}

function readAccessory(
  accessory: unknown,
  nodeId: number,
  index: number,
): AccessoryDescriptor | null {
  if (!accessory || typeof accessory !== "object") {
    return null;
  }

  const record = accessory as Record<string, unknown>;
  const tooltip = asString(record.tooltip).trim() || undefined;
  const icon = record.icon;

  const text = record.text;
  if (typeof text === "string" && text.trim().length > 0) {
    return {
      key: `${nodeId}:${index}:text`,
      text: text.trim(),
      tooltip,
      icon,
    };
  }

  if (text && typeof text === "object" && "value" in text) {
    const value = asString((text as { value?: unknown }).value).trim();
    if (value.length > 0) {
      return {
        key: `${nodeId}:${index}:text-value`,
        text: value,
        tooltip,
        icon,
        color: asString((text as { color?: unknown }).color).trim() || undefined,
      };
    }
  }

  const tag = record.tag;
  if (typeof tag === "string") {
    const value = tag.trim();
    return value.length > 0
      ? {
          key: `${nodeId}:${index}:tag`,
          text: value,
          tooltip,
          icon,
        }
      : null;
  }

  if (tag && typeof tag === "object" && "value" in tag) {
    const value = (tag as { value?: unknown }).value;
    if (value instanceof Date) {
      return {
        key: `${nodeId}:${index}:tag-date`,
        text: formatRelativeDate(value),
        tooltip,
        icon,
        color: asString((tag as { color?: unknown }).color).trim() || undefined,
      };
    }
    if (typeof value === "string") {
      const textValue = value.trim();
      return textValue.length > 0
        ? {
            key: `${nodeId}:${index}:tag-value`,
            text: textValue,
            tooltip,
            icon,
            color: asString((tag as { color?: unknown }).color).trim() || undefined,
          }
        : null;
    }
  }

  const date = record.date;
  if (date instanceof Date) {
    return {
      key: `${nodeId}:${index}:date`,
      text: formatRelativeDate(date),
      tooltip,
      icon,
    };
  }
  if (typeof date === "string") {
    const textValue = date.trim();
    return textValue.length > 0
      ? {
          key: `${nodeId}:${index}:date-text`,
          text: textValue,
          tooltip,
          icon,
        }
      : null;
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
  const icon = node.props.icon;
  const accessories = Array.isArray(node.props.accessories)
    ? node.props.accessories
        .map((entry, index) => readAccessory(entry, node.id, index))
        .filter((entry): entry is AccessoryDescriptor => Boolean(entry))
    : [];

  const isSelected = Boolean(renderContext?.selected);

  return (
    <ListItem
      selected={isSelected}
      onSelect={renderContext?.onSelect}
      onMouseEnter={renderContext?.onSelect}
      onDoubleClick={renderContext?.onActivate}
      className={cn("mb-1")}
      showAccentBar={true}
      leftSlot={
        icon ? (
          <div className="flex items-center justify-center">
            <RunnerIcon icon={icon} className="size-[22px] shrink-0" />
          </div>
        ) : (
          <span className="size-[22px] shrink-0" />
        )
      }
      rightSlot={
        accessories.length > 0 ? (
          <div className="flex shrink-0 items-center gap-3">
            {accessories.map((entry) => (
              <div
                key={entry.key}
                className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
                title={entry.tooltip}
                style={entry.color ? { color: entry.color } : undefined}
              >
                {entry.icon ? <RunnerIcon icon={entry.icon} className="size-3.5 shrink-0" /> : null}
                {entry.text ? <span className="truncate">{entry.text}</span> : null}
              </div>
            ))}
          </div>
        ) : null
      }
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
        <ListItem.Title className="shrink-0">{title}</ListItem.Title>
        {subtitle ? (
          <ListItem.Description className="truncate">{subtitle}</ListItem.Description>
        ) : null}
      </div>
    </ListItem>
  );
}

