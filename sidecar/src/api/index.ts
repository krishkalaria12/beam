import React from "react";
import { Color } from "./colors";
import { Cache } from "./cache";
import { Icon } from "./icon";
import { LaunchType, Toast } from "./types";
import { createLocalStorage } from "./utils";
import { useNavigation } from "./navigation";
import { List } from "./components/list";
import { Grid } from "./components/grid";
import { Form } from "./components/form";
import { Action, ActionPanel } from "./components/actions";
import { Detail } from "./components/detail";
import {
  environment,
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

const Image = {
  Mask: {
    Circle: "circle",
    RoundedRectangle: "roundedRectangle",
  },
};

export const getRaycastApi = () => {
  const LocalStorage = createLocalStorage();
  const closeMainWindow = async () => {
    writeOutput({ type: "go-back-to-plugin-list", payload: {} });
  };
  const clearSearchBar = async () => {};
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
  }): Promise<void> => {
    await sendRequest("launch-command", {
      name: options?.name,
      type: options?.type,
      context: options?.context,
      extensionName: currentPluginName || environment.extensionName,
    });
  };

  return {
    LocalStorage,
    Color,
    Cache,
    Icon,
    Image,
    LaunchType,
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
    getApplications,
    getDefaultApplication,
    getFrontmostApplication,
    getPreferenceValues: () => {
      if (currentPluginName) {
        return preferencesStore.getPreferenceValues(currentPluginName, currentPluginPreferences);
      }
      return {};
    },
    getSelectedFinderItems,
    getSelectedText,
    closeMainWindow,
    open,
    showInFinder,
    showToast,
    showHUD,
    trash,
    confirmAlert,
    launchCommand,
    clearSearchBar,
    useNavigation,
    usePersistentState: <T>(
      key: string,
      initialValue: T,
    ): [T, React.Dispatch<React.SetStateAction<T>>, boolean] => {
      const [state, setState] = React.useState(initialValue);
      return [state, setState, false];
    },
    BrowserExtension: BrowserExtensionAPI,
    Keyboard,
  };
};
