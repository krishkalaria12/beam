import {
  RuntimeRender,
  decodeRuntimeRenderMessage,
  type RuntimeRenderEnvelope,
} from "@beam/extension-protocol";

export function parseRuntimeRender(raw: unknown): RuntimeRenderEnvelope | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = (raw as { runtimeRender?: unknown }).runtimeRender;
  if (!payload || typeof payload !== "object") {
    return null;
  }

  try {
    return decodeRuntimeRenderMessage(RuntimeRender.fromJSON(payload));
  } catch {
    return null;
  }
}
