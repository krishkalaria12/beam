import React from "react";
import * as ReactJsxRuntime from "react/jsx-runtime";
import { inspect } from "util";
import { environment } from "./api/environment";
import { writeLog, writeOutput } from "./io";
import { updateContainer } from "./reconciler";
import { createRuntimeRequire, ensureBeamGlobal, withGlobalReact } from "./runtime/bootstrap";
import { createCompatElement, createCompatElementDev } from "./runtime/jsx-runtime";
import { createRuntimeLaunchPlan, type LaunchMode, type LaunchProps } from "./runtime/launch";

export const runPlugin = (
  pluginPath?: string,
  mode: LaunchMode = "view",
  aiAccessStatus = false,
  launchArguments?: Record<string, unknown>,
  launchContext?: Record<string, unknown>,
  launchType?: string,
  commandName?: string,
): Promise<void> => {
  if (!pluginPath) {
    return Promise.reject(new Error("No plugin specified."));
  }

  return createRuntimeLaunchPlan({
    aiAccessStatus,
    commandName,
    launchArguments,
    launchContext,
    launchType,
    mode,
    pluginPath,
  }).then(({ launchProps, payload, scriptText }) => {
    ensureBeamGlobal();
    writeLog(
      `[runtime-launch] ${payload.extensionId} (${payload.environment?.commandName ?? environment.commandName})`,
    );

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

    const mockConsole = {
      log: (...args: unknown[]) => {
        writeLog("[plugin] log: " + args.map((arg) => inspect(arg, { depth: null })).join(" "));
      },
      warn: (...args: unknown[]) => {
        writeLog("[plugin] warn: " + args.map((arg) => inspect(arg, { depth: null })).join(" "));
      },
      error: (...args: unknown[]) => {
        writeLog("[plugin] error: " + args.map((arg) => inspect(arg, { depth: null })).join(" "));
      },
    };

    withGlobalReact(() => {
      scriptFunction(
        createRuntimeRequire(pluginPath),
        pluginModule,
        pluginModule.exports,
        mockConsole,
        createCompatElement,
        createCompatElement,
        React.Fragment,
        ReactJsxRuntime.Fragment,
        createCompatElementDev,
      );
    });

    const PluginRoot = pluginModule.exports.default;

    if (!PluginRoot) {
      throw new Error("Plugin did not export a default component.");
    }

    if (mode === "no-view") {
      if (typeof PluginRoot === "function") {
        return (PluginRoot as (props: LaunchProps) => Promise<void>)(launchProps)
          .then(() => {
            writeLog("No-view command finished.");
            writeOutput({ type: "go-back-to-plugin-list", payload: {} });
          })
          .catch((e) => {
            writeLog(`No-view command failed: ${e}`);
            writeOutput({ type: "go-back-to-plugin-list", payload: {} });
          });
      }

      throw new Error("No-view command did not export a default function.");
    } else {
      writeLog("Plugin loaded. Initializing React render...");
      const ViewComponent = PluginRoot as unknown as React.ComponentType<LaunchProps>;
      const AppElement = React.createElement(ViewComponent, launchProps);
      updateContainer(AppElement, () => {
        writeLog("Initial render complete");
      });
    }
  });
};
