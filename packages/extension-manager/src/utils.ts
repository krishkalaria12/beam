import React from "./shared-react";
import type { ComponentType, ParentInstance } from "./types";
import { root, instances } from "./state";
import type { RuntimeCommand } from "@beam/extension-protocol";

const OMIT_SERIALIZED_VALUE = Symbol("omit-serialized-value");

const getComponentDisplayName = (type: ComponentType): string => {
  if (typeof type === "string") {
    return type;
  }
  return type.displayName ?? type.name ?? "Anonymous";
};

type NormalizeOptions = {
  functionValue?: unknown;
};

function normalizeSerializableValue(
  value: unknown,
  seen: WeakSet<object>,
  options: NormalizeOptions = {},
): unknown | typeof OMIT_SERIALIZED_VALUE {
  if (value === undefined || typeof value === "symbol") {
    return OMIT_SERIALIZED_VALUE;
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "function") {
    return options.functionValue ?? OMIT_SERIALIZED_VALUE;
  }

  if (React.isValidElement(value)) {
    const serializedProps = serializeProps(value.props as Record<string, unknown>);
    return {
      $$typeof: "react.element.serialized",
      type: getComponentDisplayName(value.type as ComponentType),
      props: serializedProps,
    };
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (value instanceof URL) {
    return value.toString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => {
      const normalizedEntry = normalizeSerializableValue(entry, seen, options);
      return normalizedEntry === OMIT_SERIALIZED_VALUE ? null : normalizedEntry;
    });
  }

  if (ArrayBuffer.isView(value)) {
    return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  }

  if (value instanceof ArrayBuffer) {
    return Array.from(new Uint8Array(value));
  }

  if (value instanceof Set) {
    return Array.from(value, (entry) => {
      const normalizedEntry = normalizeSerializableValue(entry, seen, options);
      return normalizedEntry === OMIT_SERIALIZED_VALUE ? null : normalizedEntry;
    });
  }

  if (value instanceof Map) {
    const normalizedRecord: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of value.entries()) {
      const normalizedEntry = normalizeSerializableValue(entryValue, seen, options);
      if (normalizedEntry === OMIT_SERIALIZED_VALUE) {
        continue;
      }
      normalizedRecord[String(entryKey)] = normalizedEntry;
    }
    return normalizedRecord;
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);
    try {
      const normalizedRecord: Record<string, unknown> = {};

      for (const [entryKey, entryValue] of Object.entries(value)) {
        const normalizedEntry = normalizeSerializableValue(entryValue, seen, options);
        if (normalizedEntry === OMIT_SERIALIZED_VALUE) {
          continue;
        }
        normalizedRecord[entryKey] = normalizedEntry;
      }

      return normalizedRecord;
    } finally {
      seen.delete(value);
    }
  }

  return String(value);
}

function stableStringify(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function serializeProps(props: Record<string, unknown>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};

  for (const key in props) {
    // part 1: we don't need to serialize children because they are handled by the reconciler
    // refs can hold circular objects (current -> instance -> fiber -> ...), so they must never be serialized
    if (key === "children" || key === "ref") {
      continue;
    }

    const value = props[key];
    const normalizedValue = normalizeSerializableValue(value, new WeakSet<object>(), {
      functionValue: true,
    });
    if (normalizedValue !== OMIT_SERIALIZED_VALUE) {
      serialized[key] = normalizedValue;
    }
  }

  return serialized;
}

export function normalizeTransportValue(value: unknown): unknown {
  const normalizedValue = normalizeSerializableValue(value, new WeakSet<object>());
  return normalizedValue === OMIT_SERIALIZED_VALUE ? null : normalizedValue;
}

function createStableFingerprint(
  props: Record<string, unknown>,
  namedChildren?: Record<string, number>,
): string {
  const normalizedProps = normalizeTransportValue(props);
  const normalizedChildren = namedChildren ? normalizeTransportValue(namedChildren) : undefined;
  return `${stableStringify(normalizedProps)}::${stableStringify(normalizedChildren ?? null)}`;
}

export function optimizeCommitBuffer(buffer: RuntimeCommand[]): RuntimeCommand[] {
  const CHILD_OP_THRESHOLD = 10;
  const PROPS_TEMPLATE_THRESHOLD = 5;

  const childOpsByParent = new Map<ParentInstance["id"], RuntimeCommand[]>();
  const updatePropsOps: Extract<RuntimeCommand, { type: "UPDATE_PROPS" }>[] = [];
  const otherNonUpdateOps: RuntimeCommand[] = [];

  for (const op of buffer) {
    if (op.type === "UPDATE_PROPS") {
      updatePropsOps.push(op);
    } else if (
      op.type === "APPEND_CHILD" ||
      op.type === "REMOVE_CHILD" ||
      op.type === "INSERT_BEFORE"
    ) {
      const parentId = op.payload.parentId;
      childOpsByParent.set(parentId, (childOpsByParent.get(parentId) ?? []).concat(op));
    } else {
      otherNonUpdateOps.push(op);
    }
  }

  const finalOps: RuntimeCommand[] = [...otherNonUpdateOps];

  for (const [parentId, ops] of childOpsByParent.entries()) {
    if (ops.length <= CHILD_OP_THRESHOLD) {
      finalOps.push(...ops);
    } else {
      const parentInstance = parentId === "root" ? root : instances.get(parentId as number);
      if (parentInstance && "children" in parentInstance) {
        const childrenIds = parentInstance.children.map(({ id }) => id);
        finalOps.push({ type: "REPLACE_CHILDREN", payload: { parentId, childrenIds } });
      } else {
        finalOps.push(...ops);
      }
    }
  }

  if (updatePropsOps.length < PROPS_TEMPLATE_THRESHOLD * 2) {
    finalOps.push(...updatePropsOps);
    return finalOps;
  }

  const propsToIdMap = new Map<string, number[]>();
  const idToPayloadMap = new Map<
    number,
    Extract<RuntimeCommand, { type: "UPDATE_PROPS" }>["payload"]
  >();

  for (const op of updatePropsOps) {
    const payload = op.payload;
    idToPayloadMap.set(payload.id, payload);
    const fingerprint = createStableFingerprint(payload.props, payload.namedChildren);

    const ids = propsToIdMap.get(fingerprint);
    if (ids) {
      ids.push(payload.id);
    } else {
      propsToIdMap.set(fingerprint, [payload.id]);
    }
  }

  const handledIds = new Set<number>();

  for (const ids of propsToIdMap.values()) {
    if (ids.length > PROPS_TEMPLATE_THRESHOLD) {
      const templateId = ids[0];
      if (templateId === undefined) {
        continue;
      }
      const prototypePayload = idToPayloadMap.get(templateId)!;

      finalOps.push({
        type: "DEFINE_PROPS_TEMPLATE",
        payload: {
          templateId,
          props: prototypePayload.props,
          namedChildren: prototypePayload.namedChildren,
        },
      });

      finalOps.push({
        type: "APPLY_PROPS_TEMPLATE",
        payload: {
          templateId,
          targetIds: ids,
        },
      });

      ids.forEach((id) => handledIds.add(id));
    }
  }

  const remainingUpdateProps = updatePropsOps.filter((op) => !handledIds.has(op.payload.id));
  finalOps.push(...remainingUpdateProps);

  return finalOps;
}
