import {
  BridgeMessageKind,
  RuntimeRender,
  decodeRuntimeRenderMessage,
  readBridgeMessageEnvelope,
  type RuntimeRenderEnvelope,
} from "@beam/extension-protocol";

export function parseRuntimeRender(raw: unknown): RuntimeRenderEnvelope | null {
  const envelope = readBridgeMessageEnvelope(raw);
  if (!envelope || envelope.kind !== BridgeMessageKind.RuntimeRender) {
    return null;
  }

  if (!envelope.payload || typeof envelope.payload !== "object") {
    return null;
  }

  try {
    return decodeRuntimeRenderMessage(RuntimeRender.fromJSON(envelope.payload));
  } catch {
    return null;
  }
}
