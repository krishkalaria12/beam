import React from "react";
import type { ComponentType, ParentInstance } from "./types";
import { root, instances } from "./state";
import type { RuntimeCommand } from "@beam/extension-protocol";

export const getComponentDisplayName = (type: ComponentType): string => {
  if (typeof type === "string") {
    return type;
  }
  return type.displayName ?? type.name ?? "Anonymous";
};

export function serializeProps(props: Record<string, unknown>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};

  for (const key in props) {
    // part 1: we don't need to serialize children because they are handled by the reconciler
    // refs can hold circular objects (current -> instance -> fiber -> ...), so they must never be serialized
    if (key === "children" || key === "ref") {
      continue;
    }

    const value = props[key];

    if (typeof value === "function") {
      serialized[key] = true;
      continue;
    }

    // part 2: deep-serialize react elements if they appear in props
    if (React.isValidElement(value)) {
      serialized[key] = {
        $$typeof: "react.element.serialized",
        type: getComponentDisplayName(value.type as ComponentType),
        props: serializeProps(value.props as Record<string, unknown>),
      };
      continue;
    }

    // part 3: recursively serialize arrays because they might contain elements
    if (Array.isArray(value)) {
      serialized[key] = value.map((item) =>
        React.isValidElement(item)
          ? {
              $$typeof: "react.element.serialized",
              type: getComponentDisplayName(item.type as ComponentType),
              props: serializeProps(item.props as Record<string, unknown>),
            }
          : item,
      );
      continue;
    }

    // part 4: we don't need to serialize the value, just copy it directly
    serialized[key] = value;
  }

  return serialized;
}

function createStableFingerprint(
  props: Record<string, unknown>,
  namedChildren?: Record<string, number>,
): string {
  let result = "";

  const propKeys = Object.keys(props).sort();
  for (const key of propKeys) {
    if (key === "ref") continue;
    result += `${key}=${String(props[key])};`;
  }

  if (namedChildren) {
    const childKeys = Object.keys(namedChildren).sort();
    if (childKeys.length > 0) {
      result += "::nc::"; // named children
      for (const key of childKeys) {
        result += `${key}=${String(namedChildren[key])};`;
      }
    }
  }
  return result;
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
  const idToPayloadMap = new Map<number, Extract<RuntimeCommand, { type: "UPDATE_PROPS" }>["payload"]>();

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
