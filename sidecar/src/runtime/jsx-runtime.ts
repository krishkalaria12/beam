import React from "react";

type CompatKey = string | number;

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const toCompatProps = (props: unknown): Record<string, unknown> | null => {
  if (props == null || typeof props !== "object") {
    return null;
  }

  return props as Record<string, unknown>;
};

export const createCompatElement = (
  type: unknown,
  props: unknown,
  ...rest: unknown[]
): React.ReactElement => {
  const normalizedProps = toCompatProps(props);

  if (rest.length === 1) {
    const [maybeKey] = rest;
    const shouldTreatAsKey =
      (typeof maybeKey === "string" || typeof maybeKey === "number") &&
      (!normalizedProps || !hasOwn(normalizedProps, "children"));

    if (shouldTreatAsKey) {
      return React.createElement(type as React.ElementType, {
        ...normalizedProps,
        key: maybeKey as CompatKey,
      });
    }
  }

  return React.createElement(
    type as React.ElementType,
    normalizedProps,
    ...(rest as React.ReactNode[]),
  );
};

export const createCompatElementDev = (
  type: unknown,
  props: unknown,
  key?: unknown,
): React.ReactElement => {
  const normalizedProps = toCompatProps(props) ?? {};
  if (key == null) {
    return React.createElement(type as React.ElementType, normalizedProps);
  }

  return React.createElement(type as React.ElementType, {
    ...normalizedProps,
    key: key as CompatKey,
  });
};
