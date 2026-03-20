import React from "../shared-react";

type CompatKey = string | number;

const AUTO_KEY_PROP_NAMES = ["id", "value", "title", "name", "label", "path", "url"] as const;

function getCompatTypeName(type: unknown): string {
  if (typeof type === "string") {
    return type;
  }

  if (type && typeof type === "function") {
    const componentType = type as { displayName?: string; name?: string };
    return componentType.displayName || componentType.name || "";
  }

  return "";
}

function readAutoKeyValue(value: unknown): CompatKey | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

function collectChildKeyParts(children: React.ReactNode, limit = 3): string[] {
  const parts: string[] = [];

  const visit = (node: React.ReactNode) => {
    if (parts.length >= limit || node == null || typeof node === "boolean") {
      return;
    }

    if (typeof node === "string" || typeof node === "number") {
      const candidate = readAutoKeyValue(node);
      if (candidate !== undefined) {
        parts.push(String(candidate));
      }
      return;
    }

    if (Array.isArray(node)) {
      for (const child of node) {
        visit(child);
        if (parts.length >= limit) {
          break;
        }
      }
      return;
    }

    if (!React.isValidElement(node)) {
      return;
    }

    const elementProps = toCompatProps(node.props);
    if (!elementProps) {
      return;
    }

    for (const propName of AUTO_KEY_PROP_NAMES) {
      const candidate = readAutoKeyValue(elementProps[propName]);
      if (candidate !== undefined) {
        parts.push(String(candidate));
        return;
      }
    }

    const elementKey =
      typeof node.key === "string" || typeof node.key === "number" ? node.key : undefined;
    if (elementKey !== undefined) {
      parts.push(String(elementKey));
      return;
    }

    visit(elementProps.children as React.ReactNode);
  };

  visit(children);
  return parts;
}

function inferCompatKey(type: unknown, props: Record<string, unknown> | null): CompatKey | undefined {
  if (!props) {
    return undefined;
  }

  const typeName = getCompatTypeName(type);
  if (!/(?:^|\.)(?:Item|Section)$/.test(typeName)) {
    return undefined;
  }

  for (const propName of AUTO_KEY_PROP_NAMES) {
    const candidate = readAutoKeyValue(props[propName]);
    if (candidate !== undefined) {
      return `${typeName}:${candidate}`;
    }
  }

  if (typeName.endsWith("Section")) {
    const childKeyParts = collectChildKeyParts(props.children as React.ReactNode);
    if (childKeyParts.length > 0) {
      return `${typeName}:${childKeyParts.join("|")}`;
    }
  }

  return undefined;
}

const toCompatProps = (props: unknown): Record<string, unknown> | null => {
  if (props == null || typeof props !== "object") {
    return null;
  }

  return props as Record<string, unknown>;
};

const normalizeCompatProps = (
  props: unknown,
): { key?: CompatKey; props: Record<string, unknown> | null } => {
  const normalizedProps = toCompatProps(props);
  if (!normalizedProps) {
    return { props: null };
  }

  const nextProps = { ...normalizedProps };
  const propKey = nextProps.key;
  if (typeof propKey === "string" || typeof propKey === "number") {
    delete nextProps.key;
  }

  if (Array.isArray(nextProps.children)) {
    nextProps.children = React.Children.toArray(nextProps.children);
  }

  return {
    key: typeof propKey === "string" || typeof propKey === "number" ? propKey : undefined,
    props: nextProps,
  };
};

export const createCompatElement = (
  type: unknown,
  props: unknown,
  ...rest: unknown[]
): React.ReactElement => {
  const normalized = normalizeCompatProps(props);
  const maybeKey = rest[0];
  const resolvedKey =
    typeof maybeKey === "string" || typeof maybeKey === "number"
      ? maybeKey
      : normalized.key ?? inferCompatKey(type, normalized.props);

  if (resolvedKey !== undefined) {
    return React.createElement(type as React.ElementType, {
      ...normalized.props,
      key: resolvedKey as CompatKey,
    });
  }

  return React.createElement(type as React.ElementType, normalized.props);
};

export const createCompatElementDev = (
  type: unknown,
  props: unknown,
  key?: unknown,
): React.ReactElement => {
  const normalized = normalizeCompatProps(props);
  const resolvedKey =
    typeof key === "string" || typeof key === "number"
      ? key
      : normalized.key ?? inferCompatKey(type, normalized.props);
  if (resolvedKey == null) {
    return React.createElement(type as React.ElementType, normalized.props);
  }

  return React.createElement(type as React.ElementType, {
    ...normalized.props,
    key: resolvedKey as CompatKey,
  });
};
