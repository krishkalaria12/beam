import {
  CommandMode,
  LaunchType,
  ManagerRequest,
  ManagerResponse,
  type GetPreferencesResponse,
  type RuntimeEvent,
} from "@beam/extension-protocol";

export type LaunchMode = "view" | "no-view" | "menu-bar";
export type RuntimeLaunchType = "background" | "userInitiated";

export function parseManagerRequestPayload(payload: unknown): ManagerRequest {
  return ManagerRequest.fromJSON(payload);
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
  type: "manager-response";
  payload: ReturnType<typeof ManagerResponse.toJSON>;
} {
  return {
    type: "manager-response",
    payload: ManagerResponse.toJSON(response),
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
