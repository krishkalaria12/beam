import {
  CommandMode,
  DesktopContextState,
  LaunchType as ProtocolLaunchType,
  type DesktopContextSnapshot,
  type EnvironmentSnapshot,
  type GetEnvironmentResponse,
} from "@beam/extension-protocol";
import type { DesktopContext } from "../api/environment";
import { LaunchType as RuntimeLaunchType, type Application } from "../api/types";

type RuntimeEnvironmentSnapshot = {
  appearance: "light" | "dark";
  assetsPath: string;
  beamVersion?: {
    tag: string;
    commit: string;
  };
  commandMode: "view" | "no-view" | "menu-bar";
  commandName: string;
  extensionName: string;
  isDevelopment: boolean;
  isRaycast?: boolean;
  launchType: string;
  ownerOrAuthorName: string;
  raycastVersion: string;
  supportPath: string;
  textSize: "medium" | "large";
  theme: "light" | "dark";
};

function toProtocolCommandMode(mode: RuntimeEnvironmentSnapshot["commandMode"]): CommandMode {
  switch (mode) {
    case "view":
      return CommandMode.COMMAND_MODE_VIEW;
    case "no-view":
      return CommandMode.COMMAND_MODE_NO_VIEW;
    case "menu-bar":
      return CommandMode.COMMAND_MODE_MENU_BAR;
    default:
      return CommandMode.COMMAND_MODE_UNSPECIFIED;
  }
}

function toProtocolLaunchType(value: string): ProtocolLaunchType {
  switch (value) {
    case RuntimeLaunchType.Background:
      return ProtocolLaunchType.LAUNCH_TYPE_BACKGROUND;
    case RuntimeLaunchType.UserInitiated:
      return ProtocolLaunchType.LAUNCH_TYPE_USER_INITIATED;
    default:
      return ProtocolLaunchType.LAUNCH_TYPE_UNSPECIFIED;
  }
}

function toProtocolDesktopContextState(
  value: DesktopContext["selectedText"]["state"],
): DesktopContextState {
  switch (value) {
    case "supported":
      return DesktopContextState.DESKTOP_CONTEXT_STATE_SUPPORTED;
    case "unavailable":
      return DesktopContextState.DESKTOP_CONTEXT_STATE_UNAVAILABLE;
    case "unsupported":
      return DesktopContextState.DESKTOP_CONTEXT_STATE_UNSUPPORTED;
    default:
      return DesktopContextState.DESKTOP_CONTEXT_STATE_UNSPECIFIED;
  }
}

function toProtocolApplication(value: Application | undefined) {
  if (!value) {
    return undefined;
  }

  return {
    name: value.name,
    path: value.path,
    bundleId: value.bundleId ?? "",
    localizedName: value.localizedName ?? "",
  };
}

export function createEnvironmentSnapshot(
  environment: RuntimeEnvironmentSnapshot,
  options: {
    aiAccess: boolean;
    browserExtensionAccess: boolean;
  },
): EnvironmentSnapshot {
  return {
    ownerOrAuthorName: environment.ownerOrAuthorName,
    extensionName: environment.extensionName,
    commandName: environment.commandName,
    commandMode: toProtocolCommandMode(environment.commandMode),
    assetsPath: environment.assetsPath,
    supportPath: environment.supportPath,
    isDevelopment: environment.isDevelopment,
    isRaycast: Boolean(environment.isRaycast),
    appearance: environment.appearance,
    theme: environment.theme,
    textSize: environment.textSize,
    raycastVersion: environment.raycastVersion,
    beamVersion: environment.beamVersion
      ? {
          tag: environment.beamVersion.tag,
          commit: environment.beamVersion.commit,
        }
      : undefined,
    launchType: toProtocolLaunchType(environment.launchType),
    aiAccess: options.aiAccess,
    browserExtensionAccess: options.browserExtensionAccess,
  };
}

export function createDesktopContextSnapshot(context: DesktopContext): DesktopContextSnapshot {
  return {
    selectedText: {
      state: toProtocolDesktopContextState(context.selectedText.state),
      value: context.selectedText.value ?? "",
      reason: context.selectedText.reason ?? "",
    },
    selectedFiles: {
      state: toProtocolDesktopContextState(context.selectedFiles.state),
      value: (context.selectedFiles.value ?? []).map((item) => ({ path: item.path })),
      reason: context.selectedFiles.reason ?? "",
    },
    focusedWindow: {
      state: toProtocolDesktopContextState(context.focusedWindow.state),
      value: context.focusedWindow.value
        ? {
            id: context.focusedWindow.value.id,
            title: context.focusedWindow.value.title,
            appName: context.focusedWindow.value.appName,
            className: context.focusedWindow.value.className,
            appId: context.focusedWindow.value.appId ?? "",
            pid: context.focusedWindow.value.pid ?? 0,
            workspace: context.focusedWindow.value.workspace,
            isFocused: context.focusedWindow.value.isFocused,
          }
        : undefined,
      reason: context.focusedWindow.reason ?? "",
    },
    frontmostApplication: {
      state: toProtocolDesktopContextState(context.frontmostApplication.state),
      value: toProtocolApplication(context.frontmostApplication.value),
      reason: context.frontmostApplication.reason ?? "",
    },
    sources: {
      selectedTextBackend: context.sources.selectedTextBackend,
      selectedFilesBackend: context.sources.selectedFilesBackend,
      windowBackend: context.sources.windowBackend,
      applicationBackend: context.sources.applicationBackend,
    },
    capabilities: {
      selectedText: context.capabilities.selectedText,
      selectedFiles: context.capabilities.selectedFiles,
      focusedWindow: context.capabilities.focusedWindow,
      frontmostApplication: context.capabilities.frontmostApplication,
    },
  };
}

export function createEnvironmentResponse(
  environment: RuntimeEnvironmentSnapshot,
  context: DesktopContext,
  options: {
    aiAccess: boolean;
    browserExtensionAccess: boolean;
  },
): GetEnvironmentResponse {
  return {
    environment: createEnvironmentSnapshot(environment, options),
    desktopContext: createDesktopContextSnapshot(context),
  };
}
