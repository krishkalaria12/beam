import * as crypto from "crypto";
import { createBeamRuntimeApi } from "../runtime/create-api";
import { Color } from "./colors";
import { Cache } from "./cache";
import { Icon } from "./icon";
import { LaunchType, Toast } from "./types";
import { popToRootView, useNavigation } from "./navigation";
import { Action, ActionPanel, Detail, Form, Grid, List, MenuBarExtra } from "./components";
import {
  environment,
  getDesktopContext,
  getSelectedFinderItems,
  getSelectedText,
  open,
  getApplications,
  getDefaultApplication,
  getFrontmostApplication,
  showInFinder,
  trash,
  AI as AIConstant,
} from "./environment";
import { preferencesStore } from "../preferences";
import { showToast } from "./toast";
import { showHUD } from "./hud";
import { BrowserExtensionAPI } from "./browserExtension";
import { Clipboard } from "./clipboard";
import * as OAuth from "./oauth";
import { AI } from "./ai";
import { Keyboard } from "./keyboard";
import { currentPluginName, currentPluginPreferences } from "../state";
import { writeLog } from "../io";
import { writeRuntimeOutput } from "../protocol/runtime-output";
import { sendRuntimeRpcRequest } from "./rpc";
import { LocalStorage } from "./localStorage";
import { WindowManagement } from "./windowManagement";
import { FileSearch } from "./fileSearch";
import { getRaycastUtils } from "./raycastUtils";

const Image = {
  Mask: {
    Circle: "circle",
    RoundedRectangle: "roundedRectangle",
  },
};

const PopToRootType = {
  Default: "default",
  Immediate: "immediate",
  Suspended: "suspended",
} as const;

const Alert = {
  ActionStyle: {
    Default: "default",
    Cancel: "cancel",
    Destructive: "destructive",
  },
} as const;

export const preferences = new Proxy({} as Record<string, unknown>, {
  get(_target, property: string) {
    const values = currentPluginName
      ? preferencesStore.getPreferenceValues(currentPluginName, currentPluginPreferences)
      : {};
    return values[property];
  },
});

const randomId = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return `beam-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

const clearSearchBar = async () => {
  writeRuntimeOutput({ clearSearchBar: {} });
};

const goBackToPluginList = () => {
  writeRuntimeOutput({ goBackToPluginList: {} });
};

const menuBarExtraOpen = async (): Promise<void> => {
  writeLog({
    tag: "raycast-menubar-extra",
    message: "MenuBarExtra.open requested",
  });
};

const confirmAlert = async (options?: {
  title?: string;
  message?: string;
  primaryAction?: { title?: string };
}): Promise<boolean> => {
  const result = await sendRuntimeRpcRequest<{ confirmed?: boolean } | boolean>(
    {
      confirmAlert: {
        requestId: "",
        title: options?.title ?? "",
        message: options?.message ?? "",
        primaryActionTitle: options?.primaryAction?.title ?? "",
      },
    },
    "confirm-alert",
  );
  return Boolean(
    typeof result === "boolean"
      ? result
      : result && typeof result === "object" && "confirmed" in result
        ? (result as { confirmed?: unknown }).confirmed
        : false,
  );
};

const launchCommand = async (options: {
  name: string;
  type?: string;
  context?: Record<string, unknown>;
  arguments?: Record<string, unknown>;
}): Promise<void> => {
  await sendRuntimeRpcRequest(
    {
      launchCommand: {
        requestId: "",
        name: options?.name,
        type: options?.type ?? "",
        context: options?.context,
        arguments: options?.arguments,
        extensionName: currentPluginName || environment.extensionName,
      },
    },
    "launch-command",
  );
};

const updateCommandMetadata = async (metadata: { subtitle?: string | null }): Promise<void> => {
  writeRuntimeOutput({
    updateCommandMetadata:
      typeof metadata.subtitle === "string" ? { subtitle: metadata.subtitle } : {},
  });
};

const openExtensionPreferences = async (): Promise<void> => {
  writeRuntimeOutput({
    openExtensionPreferences: {
      extensionName: currentPluginName || environment.extensionName,
    },
  });
};

const openCommandPreferences = async (): Promise<void> => {
  writeRuntimeOutput({
    openCommandPreferences: {
      extensionName: currentPluginName || environment.extensionName,
      commandName: environment.commandName,
    },
  });
};

const captureException = (exception: unknown): void => {
  writeLog({
    tag: "raycast-capture-exception",
    message: exception instanceof Error ? exception.message : String(exception),
  });
};

const getPreferenceValues = () => {
  if (currentPluginName) {
    return preferencesStore.getPreferenceValues(currentPluginName, currentPluginPreferences);
  }
  return {};
};

export const getBeamApi = () =>
  createBeamRuntimeApi({
    raycastUtils: getRaycastUtils(),
    LocalStorage,
    randomId,
    Alert,
    MenuBarExtra,
    menuBarExtraOpen,
    Color,
    Cache,
    Icon,
    Image,
    LaunchType,
    PopToRootType,
    Toast,
    OAuth,
    AI,
    AIConstant,
    Action,
    ActionPanel,
    Detail,
    Form,
    Grid,
    List,
    Clipboard,
    environment,
    getDesktopContext,
    getApplications,
    getDefaultApplication,
    getFrontmostApplication,
    getPreferenceValues,
    preferences,
    getSelectedFinderItems,
    getSelectedText,
    clearSearchBar,
    popToRootView,
    goBackToPluginList,
    open,
    showInFinder,
    showToast,
    showHUD,
    captureException,
    trash,
    confirmAlert,
    launchCommand,
    updateCommandMetadata,
    openExtensionPreferences,
    openCommandPreferences,
    useNavigation,
    BrowserExtension: BrowserExtensionAPI,
    WindowManagement,
    FileSearch,
    Keyboard,
  });
