import Reconciler from "react-reconciler";
import type React from "react";
import { root, setCurrentRootElement } from "./state";
import { hostConfig } from "./hostConfig";
import { writeLog } from "./io";

const reconciler = Reconciler(hostConfig);

const onRecoverableError = (error: Error) => {
  writeLog(`--- REACT RECOVERABLE ERROR ---`);
  writeLog(`Error: ${error.message}`);
  writeLog(`Stack: ${error.stack}`);
};

const onUncaughtError = (error: Error) => {
  writeLog(`--- REACT UNCAUGHT ERROR ---`);
  writeLog(`Error: ${error.message}`);
  writeLog(`Stack: ${error.stack}`);
};

const onCaughtError = (error: Error) => {
  writeLog(`--- REACT CAUGHT ERROR ---`);
  writeLog(`Error: ${error.message}`);
  writeLog(`Stack: ${error.stack}`);
};

const container = reconciler.createContainer(
  root,
  0, // LegacyRoot
  null,
  false,
  null,
  "",
  onUncaughtError,
  onCaughtError,
  onRecoverableError,
  () => {},
  null,
);

export const updateContainer = (element: React.ReactElement, callback?: () => void) => {
  setCurrentRootElement(element);
  reconciler.updateContainer(element as any, container, null, callback);
};

export const batchedUpdates = (callback: () => void) => {
  reconciler.batchedUpdates(callback, null);
};
