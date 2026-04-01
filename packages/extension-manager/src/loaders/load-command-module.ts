import React, { ReactJsxRuntime } from "../shared-react";
import { inspect } from "util";
import { environment } from "../api/environment";
import { loadBeamGlobals } from "../globals";
import { writeLog } from "../io";
import { patchRequire, withGlobalReact } from "../patch-require";
import { createCompatElement, createCompatElementDev } from "../runtime/jsx-runtime";
import { createRuntimeLaunchPlan, type LaunchMode, type LaunchProps } from "../runtime/launch";

export interface CommandLoadOptions {
  pluginPath: string;
  mode: LaunchMode;
  aiAccessStatus: boolean;
  launchArguments?: Record<string, unknown>;
  launchContext?: Record<string, unknown>;
  launchType?: string;
  commandName?: string;
}

const createMockConsole = () => ({
  log: (...args: unknown[]) => {
    writeLog("[plugin] log: " + args.map((arg) => inspect(arg, { depth: null })).join(" "));
  },
  warn: (...args: unknown[]) => {
    writeLog("[plugin] warn: " + args.map((arg) => inspect(arg, { depth: null })).join(" "));
  },
  error: (...args: unknown[]) => {
    writeLog("[plugin] error: " + args.map((arg) => inspect(arg, { depth: null })).join(" "));
  },
});

export const loadCommandModule = async ({
  aiAccessStatus,
  commandName,
  launchArguments,
  launchContext,
  launchType,
  mode,
  pluginPath,
}: CommandLoadOptions) => {
  const { launchProps, metadata, scriptText } = await createRuntimeLaunchPlan({
    aiAccessStatus,
    commandName,
    launchArguments,
    launchContext,
    launchType,
    mode,
    pluginPath,
  });

  loadBeamGlobals();
  writeLog(`[runtime-launch] ${metadata.extensionId} (${environment.commandName})`);

  const pluginModule = {
    exports: {} as {
      default: React.ComponentType<LaunchProps> | ((props: LaunchProps) => Promise<void>) | null;
    },
  };

  const scriptFunction = new Function(
    "require",
    "module",
    "exports",
    "console",
    "_jsx",
    "_jsxs",
    "_Fragment",
    "_jsxFragment",
    "_jsxDEV",
    scriptText,
  );

  withGlobalReact(() => {
    scriptFunction(
      patchRequire(pluginPath),
      pluginModule,
      pluginModule.exports,
      createMockConsole(),
      createCompatElement,
      createCompatElement,
      React.Fragment,
      ReactJsxRuntime.Fragment,
      createCompatElementDev,
    );
  });

  return {
    launchProps,
    pluginRoot: pluginModule.exports.default,
  };
};
