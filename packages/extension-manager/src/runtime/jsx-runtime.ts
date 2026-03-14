import React from "react";

type CompatKey = string | number;

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
    typeof maybeKey === "string" || typeof maybeKey === "number" ? maybeKey : normalized.key;

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
    typeof key === "string" || typeof key === "number" ? key : normalized.key;
  if (resolvedKey == null) {
    return React.createElement(type as React.ElementType, normalized.props);
  }

  return React.createElement(type as React.ElementType, {
    ...normalized.props,
    key: resolvedKey as CompatKey,
  });
};
