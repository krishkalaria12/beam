import {
  BridgeMessageKind,
  CommandMode,
  LaunchType,
  ManagerRequest,
  ManagerResponse,
  type GetPreferencesResponse,
  type RuntimeEvent,
} from "@beam/extension-protocol";

type LaunchMode = "view" | "no-view" | "menu-bar";
type RuntimeLaunchType = "background" | "userInitiated";

type ProtobufBridgePayload = {
  requestId?: string;
  messageBase64?: string;
};

function encodeBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, "base64"));
}

export function parseManagerRequestPayload(payload: unknown): ManagerRequest {
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as ProtobufBridgePayload).messageBase64 !== "string"
  ) {
    throw new Error("manager request bridge payload is missing messageBase64");
  }

  return ManagerRequest.decode(decodeBase64((payload as ProtobufBridgePayload).messageBase64!));
}

export function toLaunchMode(mode: CommandMode): LaunchMode {
  switch (mode) {
    case CommandMode.COMMAND_MODE_NO_VIEW:
      return "no-view";
    case CommandMode.COMMAND_MODE_MENU_BAR:
      return "menu-bar";
    case CommandMode.COMMAND_MODE_VIEW:
    case CommandMode.COMMAND_MODE_UNSPECIFIED:
    case CommandMode.UNRECOGNIZED:
    default:
      return "view";
  }
}

export function toLaunchType(value: LaunchType): RuntimeLaunchType {
  switch (value) {
    case LaunchType.LAUNCH_TYPE_BACKGROUND:
      return "background";
    case LaunchType.LAUNCH_TYPE_USER_INITIATED:
    case LaunchType.LAUNCH_TYPE_UNSPECIFIED:
    case LaunchType.UNRECOGNIZED:
    default:
      return "userInitiated";
  }
}

export function createManagerResponseOutput(response: ManagerResponse): {
  kind: "manager-response";
  payload: ProtobufBridgePayload;
} {
  return {
    kind: BridgeMessageKind.ManagerResponse,
    payload: {
      requestId: response.requestId,
      messageBase64: encodeBase64(ManagerResponse.encode(response).finish()),
    },
  };
}

export function createAckResponse(): ManagerResponse {
  return {
    requestId: "",
    ack: {
      ok: true,
    },
  };
}

export function createErrorResponse(message: string): ManagerResponse {
  return {
    requestId: "",
    error: {
      message,
    },
  };
}

export function createGetPreferencesResponse(response: GetPreferencesResponse): ManagerResponse {
  return {
    requestId: "",
    getPreferences: response,
  };
}

export function createSetPreferencesResponse(extensionId: string): ManagerResponse {
  return {
    requestId: "",
    setPreferences: {
      extensionId,
      ok: true,
    },
  };
}

export function isPopViewEvent(event: RuntimeEvent | undefined): boolean {
  return Boolean(event?.popView);
}

export function withRequestId(response: ManagerResponse, requestId: string): ManagerResponse {
  return {
    ...response,
    requestId,
  };
}
