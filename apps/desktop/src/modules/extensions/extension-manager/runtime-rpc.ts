import {
  BridgeMessageKind,
  RuntimeRpc,
  readBridgeMessageEnvelope,
  type RuntimeRpc as RuntimeRpcMessage,
} from "@beam/extension-protocol";

export function parseRuntimeRpc(raw: unknown): RuntimeRpcMessage | null {
  const envelope = readBridgeMessageEnvelope(raw);
  if (!envelope || envelope.kind !== BridgeMessageKind.RuntimeRpc) {
    return null;
  }

  if (!envelope.payload || typeof envelope.payload !== "object") {
    return null;
  }

  try {
    return RuntimeRpc.fromJSON(envelope.payload);
  } catch {
    return null;
  }
}
