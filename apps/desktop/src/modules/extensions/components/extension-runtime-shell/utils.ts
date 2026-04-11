import type { CSSProperties, KeyboardEvent } from "react";
import { formatDistanceToNowStrict } from "date-fns";

import { normalizeIconToken } from "@/components/icons/icon-registry";
import type { MetadataBarItem } from "@/components/module";
import type { ExtensionActionPanelPage } from "@/modules/extensions/components/runner/types";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { asString } from "@/modules/extensions/components/runner/utils";

const FAILURE_EMPTY_DESCRIPTION_MAX_LENGTH = 320;

export interface AccessoryDescriptor {
  key: string;
  text?: string;
  tooltip?: string;
  icon?: unknown;
  color?: string;
}

function readIconToken(icon: unknown): string {
  if (typeof icon === "string") {
    return icon;
  }

  if (!icon || typeof icon !== "object") {
    return "";
  }

  const record = icon as Record<string, unknown>;
  if (typeof record.source === "string" && record.source.trim().length > 0) {
    return record.source;
  }
  if (typeof record.fallback === "string" && record.fallback.trim().length > 0) {
    return record.fallback;
  }
  return "";
}

export function isAnimatedEmptyViewIcon(icon: unknown): boolean {
  const token = normalizeIconToken(readIconToken(icon));

  return [
    "loader2",
    "circleprogress",
    "circleprogress100",
    "circleprogress75",
    "circleprogress50",
    "circleprogress25",
    "refresh",
    "arrowclockwise",
    "arrowcounterclockwise",
    "hourglass",
  ].includes(token);
}

export function getEmptyViewIconClassName(icon: unknown): string {
  return isAnimatedEmptyViewIcon(icon) ? "size-16 animate-spin" : "size-12";
}

export function stopFieldKeyPropagation(event: KeyboardEvent<HTMLElement>): void {
  event.stopPropagation();
}

function formatRuntimeRelativeDate(value: Date): string {
  const distance = formatDistanceToNowStrict(value, { roundingMethod: "round" });

  return distance
    .replace(/^less than a minute$/, "now")
    .replace(/^1 second$/, "1s")
    .replace(/^(\d+) seconds$/, "$1s")
    .replace(/^1 minute$/, "1m")
    .replace(/^(\d+) minutes$/, "$1m")
    .replace(/^1 hour$/, "1h")
    .replace(/^(\d+) hours$/, "$1h")
    .replace(/^1 day$/, "1d")
    .replace(/^(\d+) days$/, "$1d")
    .replace(/^1 week$/, "1w")
    .replace(/^(\d+) weeks$/, "$1w")
    .replace(/^1 month$/, "1mo")
    .replace(/^(\d+) months$/, "$1mo")
    .replace(/^1 year$/, "1y")
    .replace(/^(\d+) years$/, "$1y");
}

function parseTransportDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}(?:[T\s].+)?$/.test(trimmed)) {
    return null;
  }

  const timestamp = Date.parse(trimmed);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

export function readAccessory(
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
    const parsedDate = parseTransportDate(value);
    return value.length > 0
      ? {
          key: `${nodeId}:${index}:tag`,
          text: parsedDate ? formatRuntimeRelativeDate(parsedDate) : value,
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
        text: formatRuntimeRelativeDate(value),
        tooltip,
        icon,
        color: asString((tag as { color?: unknown }).color).trim() || undefined,
      };
    }
    if (typeof value === "string") {
      const textValue = value.trim();
      const parsedDate = parseTransportDate(textValue);
      return textValue.length > 0
        ? {
            key: `${nodeId}:${index}:tag-value`,
            text: parsedDate ? formatRuntimeRelativeDate(parsedDate) : textValue,
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
      text: formatRuntimeRelativeDate(date),
      tooltip,
      icon,
    };
  }
  if (typeof date === "string") {
    const textValue = date.trim();
    const parsedDate = parseTransportDate(textValue);
    return textValue.length > 0
      ? {
          key: `${nodeId}:${index}:date-text`,
          text: parsedDate ? formatRuntimeRelativeDate(parsedDate) : textValue,
          tooltip,
          icon,
        }
      : null;
  }

  return null;
}

export function toInsetClass(value: unknown): string {
  const inset = asString(value).trim().toLowerCase();
  if (inset === "small") return "p-1.5";
  if (inset === "medium") return "p-2.5";
  if (inset === "large") return "p-4";
  return "p-1";
}

export function resolveColorContent(content: unknown): string | undefined {
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

export function resolveContentValue(content: unknown): unknown {
  if (content && typeof content === "object" && "value" in (content as Record<string, unknown>)) {
    return (content as { value?: unknown }).value;
  }
  return content;
}

function compactInlineErrorText(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return undefined;
  }

  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length === 0) {
    return undefined;
  }

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

export function readRuntimeFailureEmptyState(state: UseExtensionRunnerStateResult): {
  title: string;
  description?: string;
} | null {
  const failureToast =
    state.activeToast?.style === "FAILURE" &&
    (state.activeToast.title.trim() || state.activeToast.message?.trim())
      ? state.activeToast
      : null;

  if (!failureToast) {
    return null;
  }

  return {
    title: compactInlineErrorText(failureToast.title, 120) || "Extension request failed",
    description:
      compactInlineErrorText(failureToast.message, FAILURE_EMPTY_DESCRIPTION_MAX_LENGTH) ||
      "The extension could not load any rows because its latest request failed.",
  };
}

export function selectedActions(state: UseExtensionRunnerStateResult): ExtensionActionPanelPage {
  return state.selectedEntryActions.sections.length > 0
    ? state.selectedEntryActions
    : state.rootActions;
}

export function readClassName(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function readStyle(value: unknown): CSSProperties | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as CSSProperties;
}

export function collectMetadataItems(
  nodeId: number,
  state: UseExtensionRunnerStateResult,
): MetadataBarItem[] {
  const node = state.uiTree.get(nodeId);
  if (!node) {
    return [];
  }

  if (node.type.endsWith(".Metadata")) {
    return node.children.flatMap((childId) => collectMetadataItems(childId, state));
  }

  if (node.type.endsWith(".Label")) {
    const title = asString(node.props.title).trim();
    const text =
      typeof node.props.text === "object" && node.props.text
        ? asString((node.props.text as { value?: unknown }).value).trim()
        : asString(node.props.text).trim();

    return [
      {
        label: title || "Value",
        value: text || "-",
        className: readClassName(node.props.className),
        style: readStyle(node.props.style),
        labelClassName: readClassName(node.props.labelClassName),
        valueClassName: readClassName(node.props.valueClassName),
        valueStyle: readStyle(node.props.valueStyle),
      },
    ];
  }

  if (node.type.endsWith(".Link")) {
    const title = asString(node.props.title).trim();
    const target = asString(node.props.target).trim();
    const text = asString(node.props.text).trim() || target;

    return target
      ? [
          {
            type: "link",
            label: title || "Link",
            value: text || "-",
            url: target,
            className: readClassName(node.props.className),
            style: readStyle(node.props.style),
            labelClassName: readClassName(node.props.labelClassName),
            valueClassName: readClassName(node.props.valueClassName),
            valueStyle: readStyle(node.props.valueStyle),
          },
        ]
      : [
          {
            label: title || "Link",
            value: text || "-",
            className: readClassName(node.props.className),
            style: readStyle(node.props.style),
            labelClassName: readClassName(node.props.labelClassName),
            valueClassName: readClassName(node.props.valueClassName),
            valueStyle: readStyle(node.props.valueStyle),
          },
        ];
  }

  if (node.type.endsWith(".Separator")) {
    return [{ type: "separator" }];
  }

  if (node.type.endsWith(".TagList")) {
    return [
      {
        type: "tags",
        label: asString(node.props.title).trim() || "Tags",
        className: readClassName(node.props.className),
        style: readStyle(node.props.style),
        labelClassName: readClassName(node.props.labelClassName),
        tagsClassName: readClassName(node.props.tagsClassName),
        tags: node.children
          .map((childId) => {
            const child = state.uiTree.get(childId);
            if (!child || !child.type.endsWith(".TagList.Item")) {
              return null;
            }

            const text = asString(child.props.text).trim();
            if (!text) {
              return null;
            }

            return { text };
          })
          .filter((value): value is { text: string } => value !== null),
      },
    ];
  }

  return [];
}
