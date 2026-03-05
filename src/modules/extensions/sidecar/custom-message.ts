export interface ConfirmAlertRequest {
  requestId: string;
  title?: string;
  message?: string;
  primaryActionTitle?: string;
}

export interface LaunchCommandRequest {
  requestId: string;
  name: string;
  type?: string;
  context?: Record<string, unknown>;
  arguments?: Record<string, unknown>;
  extensionName?: string;
}

export interface AiAskRequest {
  requestId: string;
  streamRequestId: string;
  prompt: string;
  options?: Record<string, unknown>;
}

function toRecordPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as Record<string, unknown>;
}

export function parseConfirmAlertRequest(raw: unknown): ConfirmAlertRequest | null {
  if (!raw || typeof raw !== "object" || !("type" in raw)) {
    return null;
  }

  const message = raw as { type?: unknown; payload?: unknown };
  if (message.type !== "confirm-alert") {
    return null;
  }

  const payload = toRecordPayload(message.payload);
  const requestId = typeof payload.requestId === "string" ? payload.requestId : "";
  if (!requestId) {
    return null;
  }

  return {
    requestId,
    title: typeof payload.title === "string" ? payload.title : undefined,
    message: typeof payload.message === "string" ? payload.message : undefined,
    primaryActionTitle:
      typeof payload.primaryActionTitle === "string" ? payload.primaryActionTitle : undefined,
  };
}

export function parseLaunchCommandRequest(raw: unknown): LaunchCommandRequest | null {
  if (!raw || typeof raw !== "object" || !("type" in raw)) {
    return null;
  }

  const message = raw as { type?: unknown; payload?: unknown };
  if (message.type !== "launch-command") {
    return null;
  }

  const payload = toRecordPayload(message.payload);
  const requestId = typeof payload.requestId === "string" ? payload.requestId : "";
  const name = typeof payload.name === "string" ? payload.name : "";
  if (!requestId || !name) {
    return null;
  }

  return {
    requestId,
    name,
    type: typeof payload.type === "string" ? payload.type : undefined,
    arguments:
      payload.arguments && typeof payload.arguments === "object"
        ? (payload.arguments as Record<string, unknown>)
        : undefined,
    context:
      payload.context && typeof payload.context === "object"
        ? (payload.context as Record<string, unknown>)
        : undefined,
    extensionName: typeof payload.extensionName === "string" ? payload.extensionName : undefined,
  };
}

export function parseAiAskRequest(raw: unknown): AiAskRequest | null {
  if (!raw || typeof raw !== "object" || !("type" in raw)) {
    return null;
  }

  const message = raw as { type?: unknown; payload?: unknown };
  if (message.type !== "ai-ask") {
    return null;
  }

  const payload = toRecordPayload(message.payload);
  const requestId = typeof payload.requestId === "string" ? payload.requestId : "";
  const streamRequestId =
    typeof payload.streamRequestId === "string" ? payload.streamRequestId : "";
  const prompt = typeof payload.prompt === "string" ? payload.prompt : "";

  if (!requestId || !streamRequestId || !prompt) {
    return null;
  }

  return {
    requestId,
    streamRequestId,
    prompt,
    options:
      payload.options && typeof payload.options === "object"
        ? (payload.options as Record<string, unknown>)
        : undefined,
  };
}
