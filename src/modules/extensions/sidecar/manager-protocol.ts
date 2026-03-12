import {
  CommandMode,
  LaunchType,
  ManagerRequest,
  ManagerResponse,
  RuntimeEvent,
} from "@beam/extension-protocol";
import type { ExtensionMode } from "@/modules/extensions/sidecar/discovery";

export interface ManagerRequestEnvelope {
  action: "manager-request";
  payload: ReturnType<typeof ManagerRequest.toJSON>;
}

export function toManagerRequestEnvelope(
  request: ManagerRequest,
): ManagerRequestEnvelope {
  return {
    action: "manager-request",
    payload: ManagerRequest.toJSON(request),
  };
}

function toProtocolCommandMode(mode: ExtensionMode): CommandMode {
  switch (mode) {
    case "no-view":
      return CommandMode.COMMAND_MODE_NO_VIEW;
    case "menu-bar":
      return CommandMode.COMMAND_MODE_MENU_BAR;
    case "view":
    default:
      return CommandMode.COMMAND_MODE_VIEW;
  }
}

function toProtocolLaunchType(value: string | undefined): LaunchType {
  switch (value) {
    case "background":
      return LaunchType.LAUNCH_TYPE_BACKGROUND;
    case "userInitiated":
    default:
      return LaunchType.LAUNCH_TYPE_USER_INITIATED;
  }
}

export function buildLaunchPluginManagerRequest(payload: {
  pluginPath: string;
  mode: ExtensionMode;
  aiAccessStatus: boolean;
  arguments?: Record<string, unknown>;
  launchContext?: Record<string, unknown>;
  launchType?: string;
  commandName?: string;
}): ManagerRequest {
  return {
    requestId: "",
    launchPlugin: {
      pluginPath: payload.pluginPath,
      mode: toProtocolCommandMode(payload.mode),
      aiAccess: payload.aiAccessStatus,
      launchArguments: payload.arguments,
      launchContext: payload.launchContext,
      launchType: toProtocolLaunchType(payload.launchType),
      commandName: payload.commandName ?? "",
      fallbackText: "",
    },
  };
}

export function buildGetPreferencesManagerRequest(extensionId: string): ManagerRequest {
  return {
    requestId: "",
    getPreferences: {
      extensionId,
    },
  };
}

export function buildSetPreferencesManagerRequest(
  extensionId: string,
  values: Record<string, unknown>,
): ManagerRequest {
  return {
    requestId: "",
    setPreferences: {
      extensionId,
      values,
    },
  };
}

export function buildDispatchViewEventManagerRequest(payload: {
  instanceId: number;
  handlerName: string;
  args?: unknown[];
}): ManagerRequest {
  return {
    requestId: "",
    dispatchViewEvent: {
      instanceId: payload.instanceId,
      handlerName: payload.handlerName,
      args: payload.args ?? [],
    },
  };
}

export function buildPopViewManagerRequest(): ManagerRequest {
  return {
    requestId: "",
    runtimeEvent: RuntimeEvent.create({
      popView: {},
    }),
  };
}

export function buildDispatchToastActionManagerRequest(payload: {
  toastId: number;
  actionType: "primary" | "secondary";
}): ManagerRequest {
  return {
    requestId: "",
    dispatchToastAction: {
      toastId: payload.toastId,
      actionType: payload.actionType,
    },
  };
}

export function buildTriggerToastHideManagerRequest(toastId: number): ManagerRequest {
  return {
    requestId: "",
    triggerToastHide: {
      toastId,
    },
  };
}

export function buildBrowserExtensionStatusManagerRequest(
  isConnected: boolean,
): ManagerRequest {
  return {
    requestId: "",
    setBrowserExtensionConnectionStatus: {
      isConnected,
    },
  };
}

export function encodeManagerRequest(request: ManagerRequest): number[] {
  return Array.from(ManagerRequest.encode(request).finish());
}

export function decodeManagerResponse(bytes: number[] | Uint8Array): ManagerResponse {
  return ManagerResponse.decode(
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
  );
}
