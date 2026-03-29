import {
  BridgeMessageKind,
  RuntimeOutput,
  readBridgeMessageEnvelope,
  type RuntimeOutput as RuntimeOutputMessage,
} from "@beam/extension-protocol";

export function parseRuntimeOutput(raw: unknown): RuntimeOutputMessage | null {
  const envelope = readBridgeMessageEnvelope(raw);
  if (!envelope || envelope.kind !== BridgeMessageKind.RuntimeOutput) {
    return null;
  }

  if (!envelope.payload || typeof envelope.payload !== "object") {
    return null;
  }

  try {
    return RuntimeOutput.fromJSON(envelope.payload);
  } catch {
    return null;
  }
}
