import type { AnyInstance, Container, Toast } from "./types";
import type { RuntimeCommand } from "@beam/extension-protocol";
import type React from "react";
import type { Preference } from "./manifest";

export const instances = new Map<number, AnyInstance>();
export const root: Container = { id: "root", children: [] };
export const toasts = new Map<number, Toast>();
export const browserExtensionState = {
  isConnected: false,
};
export const aiContext = { hasAccess: false };

let instanceCounter = 0;
export const getNextInstanceId = (): number => ++instanceCounter;

export let commitBuffer: RuntimeCommand[] = [];

export const clearCommitBuffer = (): void => {
  commitBuffer = [];
};

export const addToCommitBuffer = (commit: RuntimeCommand): void => {
  commitBuffer.push(commit);
};

export const navigationStack: React.ReactElement[] = [];
export let currentRootElement: React.ReactElement | null = null;

export const setCurrentRootElement = (element: React.ReactElement) => {
  currentRootElement = element;
};

export let currentPluginName: string | null = null;
export let currentPluginPreferences: Preference[] = [];

export const setCurrentPlugin = (pluginName: string, preferences?: Preference[]) => {
  currentPluginName = pluginName;
  currentPluginPreferences = preferences || [];
};
