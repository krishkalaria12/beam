export const BridgeMessageKind = {
  ManagerRequest: "manager-request",
  ManagerResponse: "manager-response",
  RuntimeOutput: "runtime-output",
  RuntimeRender: "runtime-render",
  RuntimeRpc: "runtime-rpc",
} as const;

export type BridgeMessageKind = (typeof BridgeMessageKind)[keyof typeof BridgeMessageKind];

export type BridgeMessageEnvelope = {
  kind: BridgeMessageKind;
  payload: unknown;
  timestamp?: number;
};

const BRIDGE_MESSAGE_KINDS = new Set<string>(Object.values(BridgeMessageKind));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBridgeMessageKind(value: unknown): value is BridgeMessageKind {
  return typeof value === "string" && BRIDGE_MESSAGE_KINDS.has(value);
}

export function createBridgeMessageEnvelope(
  kind: BridgeMessageKind,
  payload: unknown,
): BridgeMessageEnvelope {
  return { kind, payload };
}

export function readBridgeMessageEnvelope(raw: unknown): BridgeMessageEnvelope | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (!isBridgeMessageKind(raw.kind)) {
    return null;
  }

  return {
    kind: raw.kind,
    payload: raw.payload,
    timestamp: typeof raw.timestamp === "number" ? raw.timestamp : undefined,
  };
}
