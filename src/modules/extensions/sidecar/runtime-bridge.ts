import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ManagerRequest, ManagerResponse } from "@beam/extension-protocol";

import { decodeManagerResponse, encodeManagerRequest } from "@/modules/extensions/sidecar/manager-protocol";

export const FOREGROUND_EXTENSION_RUNTIME_ID = "foreground";

interface RuntimeMessageEnvelope {
  runtimeId?: string;
  message?: unknown;
}

interface RuntimeStderrEnvelope {
  runtimeId?: string;
  line?: string;
}

interface RuntimeExitEnvelope {
  runtimeId?: string;
}

function normalizeRuntimeId(runtimeId: string | undefined): string {
  const value = runtimeId?.trim();
  return value && value.length > 0 ? value : FOREGROUND_EXTENSION_RUNTIME_ID;
}

export async function startExtensionRuntime(runtimeId?: string): Promise<void> {
  await invoke("extension_runtime_start", {
    runtimeId: normalizeRuntimeId(runtimeId),
  });
}

export async function stopExtensionRuntime(runtimeId?: string): Promise<void> {
  await invoke("extension_runtime_stop", {
    runtimeId: normalizeRuntimeId(runtimeId),
  });
}

export async function sendExtensionRuntimeMessage(
  runtimeId: string | undefined,
  action: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await invoke("extension_runtime_send_message", {
    runtimeId: normalizeRuntimeId(runtimeId),
    action,
    payload,
  });
}

export async function sendExtensionRuntimeManagerRequest(
  runtimeId: string | undefined,
  request: ManagerRequest,
): Promise<ManagerResponse> {
  const response = await invoke<number[]>("extension_runtime_send_manager_request", {
    runtimeId: normalizeRuntimeId(runtimeId),
    request: encodeManagerRequest(request),
  });

  return decodeManagerResponse(response);
}

export async function listenToExtensionRuntimeMessages(
  handler: (runtimeId: string, message: unknown) => void,
): Promise<UnlistenFn> {
  return listen<RuntimeMessageEnvelope>("extension-runtime-message", (event) => {
    const runtimeId = normalizeRuntimeId(event.payload.runtimeId);
    handler(runtimeId, event.payload.message);
  });
}

export async function listenToExtensionRuntimeStderr(
  handler: (runtimeId: string, line: string) => void,
): Promise<UnlistenFn> {
  return listen<RuntimeStderrEnvelope>("extension-runtime-stderr", (event) => {
    const line = typeof event.payload.line === "string" ? event.payload.line : "";
    if (line.trim().length === 0) {
      return;
    }

    const runtimeId = normalizeRuntimeId(event.payload.runtimeId);
    handler(runtimeId, line);
  });
}

export async function listenToExtensionRuntimeExit(
  handler: (runtimeId: string) => void,
): Promise<UnlistenFn> {
  return listen<RuntimeExitEnvelope>("extension-runtime-exit", (event) => {
    const runtimeId = normalizeRuntimeId(event.payload.runtimeId);
    handler(runtimeId);
  });
}
