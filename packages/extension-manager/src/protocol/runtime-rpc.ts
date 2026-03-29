import {
  BridgeMessageKind,
  RuntimeRpc,
  createBridgeMessageEnvelope,
  readBridgeMessageEnvelope,
  type RuntimeRpc as RuntimeRpcMessage,
} from "@beam/extension-protocol";

import { writeOutput } from "../io";

export function writeRuntimeRpc(message: RuntimeRpcMessage): void {
  writeOutput(
    createBridgeMessageEnvelope(
      BridgeMessageKind.RuntimeRpc,
      RuntimeRpc.toJSON(message),
    ),
  );
}

export function parseRuntimeRpcInput(raw: unknown): RuntimeRpcMessage | null {
  const envelope = readBridgeMessageEnvelope(raw);
  if (!envelope || envelope.kind !== BridgeMessageKind.RuntimeRpc) {
    return null;
  }

  const payload = envelope.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }

  try {
    return RuntimeRpc.fromJSON(payload);
  } catch {
    return null;
  }
}
