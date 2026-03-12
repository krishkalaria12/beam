import { RuntimeOutput, type RuntimeOutput as RuntimeOutputMessage } from "@beam/extension-protocol";

export function parseRuntimeOutput(raw: unknown): RuntimeOutputMessage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = (raw as { runtimeOutput?: unknown }).runtimeOutput;
  if (!payload || typeof payload !== "object") {
    return null;
  }

  try {
    return RuntimeOutput.fromJSON(payload);
  } catch {
    return null;
  }
}
