import { RuntimeRpc, type RuntimeRpc as RuntimeRpcMessage } from "@beam/extension-protocol";

export function parseRuntimeRpc(raw: unknown): RuntimeRpcMessage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = (raw as { runtimeRpc?: unknown }).runtimeRpc;
  if (!payload || typeof payload !== "object") {
    return null;
  }

  try {
    return RuntimeRpc.fromJSON(payload);
  } catch {
    return null;
  }
}
