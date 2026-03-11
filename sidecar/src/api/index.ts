import React from "react";
import * as crypto from "crypto";
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
import { writeOutput } from "../io";
import { sendRequest } from "./rpc";
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

const preferences = new Proxy({} as Record<string, unknown>, {
  get(_target, property: string) {
    const values =
      currentPluginName
        ? preferencesStore.getPreferenceValues(currentPluginName, currentPluginPreferences)
        : {};
    return values[property];
  },
});

Object.assign(MenuBarExtra, {
  isSupported: true,
  open: async (): Promise<void> => {
    writeOutput({
      type: "log",
      payload: {
        tag: "raycast-menubar-extra",
        message: "MenuBarExtra.open requested",
      },
    });
  },
});

const randomId = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return `beam-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

export const getRaycastApi = () => {
  const raycastUtils = getRaycastUtils();
  const clearSearchBar = async () => {
    writeOutput({ type: "clear-search-bar", payload: {} });
  };
  const popToRoot = async (options?: { clearSearchBar?: boolean; popToRootType?: string }) => {
    if (options?.popToRootType === PopToRootType.Suspended) {
      return;
    }

    popToRootView();
    if (options?.clearSearchBar) {
      await clearSearchBar();
    }
  };
  const closeMainWindow = async (options?: {
    clearRootSearch?: boolean;
    popToRootType?: string;
  }) => {
    if (options?.popToRootType === PopToRootType.Suspended) {
      if (options?.clearRootSearch) {
        await clearSearchBar();
      }
    } else {
      await popToRoot({
        clearSearchBar: options?.clearRootSearch,
        popToRootType: options?.popToRootType,
      });
    }

    writeOutput({ type: "go-back-to-plugin-list", payload: {} });
  };
  const confirmAlert = async (options?: {
    title?: string;
    message?: string;
    primaryAction?: { title?: string };
  }): Promise<boolean> => {
    const result = await sendRequest<boolean>("confirm-alert", {
      title: options?.title,
      message: options?.message,
      primaryActionTitle: options?.primaryAction?.title,
    });
    return Boolean(result);
  };
  const launchCommand = async (options: {
    name: string;
    type?: string;
    context?: Record<string, unknown>;
    arguments?: Record<string, unknown>;
  }): Promise<void> => {
    await sendRequest("launch-command", {
      name: options?.name,
      type: options?.type,
      context: options?.context,
      arguments: options?.arguments,
      extensionName: currentPluginName || environment.extensionName,
    });
  };
  const updateCommandMetadata = async (metadata: { subtitle?: string | null }): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(metadata, "subtitle")) {
      payload.subtitle = metadata.subtitle ?? null;
    }
    writeOutput({
      type: "update-command-metadata",
      payload,
    });
  };
  const openExtensionPreferences = async (): Promise<void> => {
    writeOutput({
      type: "open-extension-preferences",
      payload: {
        extensionName: currentPluginName || environment.extensionName,
      },
    });
  };
  const openCommandPreferences = async (): Promise<void> => {
    writeOutput({
      type: "open-command-preferences",
      payload: {
        extensionName: currentPluginName || environment.extensionName,
        commandName: environment.commandName,
      },
    });
  };
  const captureException = (exception: unknown): void => {
    writeOutput({
      type: "log",
      payload: {
        tag: "raycast-capture-exception",
        message: exception instanceof Error ? exception.message : String(exception),
      },
    });
  };

  return {
    ...raycastUtils,
    LocalStorage,
    allLocalStorageItems: LocalStorage.allItems,
    getLocalStorageItem: LocalStorage.getItem,
    setLocalStorageItem: LocalStorage.setItem,
    removeLocalStorageItem: LocalStorage.removeItem,
    clearLocalStorage: LocalStorage.clear,
    randomId,
    Alert,
    MenuBarExtra,
    Color,
    Cache,
    Icon,
    Image,
    LaunchType,
    PopToRootType,
    Toast,
    OAuth,
    AI: {
      ...AI,
      ...AIConstant,
    },
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
    getPreferenceValues: () => {
      if (currentPluginName) {
        return preferencesStore.getPreferenceValues(currentPluginName, currentPluginPreferences);
      }
      return {};
    },
    preferences,
    getSelectedFinderItems,
    getSelectedText,
    closeMainWindow,
    popToRoot,
    open,
    showInFinder,
    showInFileBrowser: showInFinder,
    showToast,
    showHUD,
    captureException,
    trash,
    confirmAlert,
    launchCommand,
    updateCommandMetadata,
    openExtensionPreferences,
    openCommandPreferences,
    clearSearchBar,
    useNavigation,
    usePersistentState: <T>(
      key: string,
      initialValue: T,
    ): [T, React.Dispatch<React.SetStateAction<T>>, boolean] => {
      const [state, setState] = React.useState(initialValue);
      const [isLoading, setIsLoading] = React.useState(true);
      const storageKey = React.useMemo(() => `usePersistentState:${key}`, [key]);

      React.useEffect(() => {
        let isDisposed = false;

        void LocalStorage.getItem(storageKey)
          .then((stored) => {
            if (isDisposed || stored === undefined) {
              return;
            }

            if (typeof stored === "string") {
              try {
                setState(JSON.parse(stored) as T);
                return;
              } catch {
                setState(stored as T);
                return;
              }
            }

            setState(stored as T);
          })
          .finally(() => {
            if (!isDisposed) {
              setIsLoading(false);
            }
          });

        return () => {
          isDisposed = true;
        };
      }, [storageKey]);

      const persistentSetState = React.useCallback<React.Dispatch<React.SetStateAction<T>>>(
        (nextValue) => {
          setState((previous) => {
            const resolved =
              typeof nextValue === "function"
                ? (nextValue as (value: T) => T)(previous)
                : nextValue;
            void LocalStorage.setItem(storageKey, JSON.stringify(resolved));
            return resolved;
          });
        },
        [storageKey],
      );

      return [state, persistentSetState, isLoading];
    },
    BrowserExtension: BrowserExtensionAPI,
    WindowManagement,
    FileSearch,
    Keyboard,
  };
};
