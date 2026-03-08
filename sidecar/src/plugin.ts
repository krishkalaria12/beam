import React from "react";
import { updateContainer } from "./reconciler";
import { writeLog, writeOutput } from "./io";
import { getRaycastApi } from "./api";
import { inspect } from "util";
import Module from "module";
import * as fs from "fs";
import * as path from "path";
import type { PluginInfo, Preference } from "@flare/protocol";
import { environment } from "./api/environment";
import { config } from "./config";
import * as ReactJsxRuntime from "react/jsx-runtime";
import { aiContext, setCurrentPlugin } from "./state";
import { LaunchType } from "./api/types";

type CompatKey = string | number;

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const toCompatProps = (props: unknown): Record<string, unknown> | null => {
  if (props == null) {
    return null;
  }
  if (typeof props !== "object") {
    return null;
  }
  return props as Record<string, unknown>;
};

const createCompatElement = (
  type: unknown,
  props: unknown,
  ...rest: unknown[]
): React.ReactElement => {
  const normalizedProps = toCompatProps(props);

  // Some extension bundles call _jsx(type, props, ...children), while others
  // follow jsx-runtime and pass _jsx(type, props, key). Support both forms.
  if (rest.length === 1) {
    const [maybeKey] = rest;
    const shouldTreatAsKey =
      (typeof maybeKey === "string" || typeof maybeKey === "number") &&
      (!normalizedProps || !hasOwn(normalizedProps, "children"));

    if (shouldTreatAsKey) {
      return React.createElement(type as React.ElementType, {
        ...(normalizedProps ?? {}),
        key: maybeKey as CompatKey,
      });
    }
  }

  return React.createElement(
    type as React.ElementType,
    normalizedProps,
    ...(rest as React.ReactNode[]),
  );
};

const createCompatElementDev = (
  type: unknown,
  props: unknown,
  key?: unknown,
): React.ReactElement => {
  const normalizedProps = toCompatProps(props) ?? {};
  if (key == null) {
    return React.createElement(type as React.ElementType, normalizedProps);
  }
  return React.createElement(type as React.ElementType, {
    ...normalizedProps,
    key: key as CompatKey,
  });
};

const createPluginRequire = (pluginPath: string) => {
  const pluginRequire = Module.createRequire(pluginPath);

  return (moduleName: string): unknown => {
    if (moduleName === "react") {
      return React;
    }

    if (moduleName.startsWith("@raycast/api")) {
      return getRaycastApi();
    }

    if (moduleName === "react/jsx-runtime") {
      return {
        ...ReactJsxRuntime,
        jsx: createCompatElement,
        jsxs: createCompatElement,
      };
    }

    if (moduleName === "react/jsx-dev-runtime") {
      return {
        ...ReactJsxRuntime,
        jsxDEV: createCompatElementDev,
      };
    }

    return pluginRequire(moduleName);
  };
};

export const loadPlugin = (pluginPath: string): string => {
  try {
    if (!fs.existsSync(pluginPath)) {
      throw new Error(`Plugin file not found: ${pluginPath}`);
    }
    return fs.readFileSync(pluginPath, "utf-8");
  } catch (error) {
    writeLog(`Error loading plugin from ${pluginPath}: ${error}`);
    throw error;
  }
};

interface LaunchProps {
  arguments: Record<string, unknown>;
  launchContext?: Record<string, unknown>;
  launchType: typeof environment.launchType;
}

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as Record<string, unknown>;
};

const normalizeLaunchType = (value: unknown): typeof environment.launchType => {
  if (value === LaunchType.Background) {
    return LaunchType.Background;
  }
  return LaunchType.UserInitiated;
};

export const runPlugin = (
  pluginPath?: string,
  mode: "view" | "no-view" | "menu-bar" = "view",
  aiAccessStatus = false,
  launchArguments?: Record<string, unknown>,
  launchContext?: Record<string, unknown>,
  launchType?: string,
): void => {
  let pluginName = "unknown";
  let preferences: Preference[] = [];

  if (!pluginPath) {
    throw new Error("No plugin specified.");
  }

  aiContext.hasAccess = aiAccessStatus;
  const scriptText = loadPlugin(pluginPath);

  const pluginDir = path.dirname(pluginPath);
  const packageJsonPath = path.join(pluginDir, "package.json");

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      pluginName = packageJson.name || path.basename(pluginDir);
      const pluginPreferences = packageJson.preferences || [];
      const allCommandPreferences = (packageJson.commands || []).flatMap(
        (cmd: { preferences?: Preference[] }) => cmd.preferences || [],
      );
      preferences = [...pluginPreferences, ...allCommandPreferences];
    } catch (error) {
      writeLog(`Error reading plugin package.json: ${error}`);
    }
  }

  environment.assetsPath = path.join(config.pluginsDir, pluginName, "assets");
  environment.extensionName = pluginName;

  setCurrentPlugin(pluginName, preferences);

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

  const globalWithReact = globalThis as Record<string, unknown>;
  const hadGlobalReact = Object.prototype.hasOwnProperty.call(globalWithReact, "React");
  const previousGlobalReact = globalWithReact.React;
  globalWithReact.React = React;

  try {
    scriptFunction(
      createPluginRequire(pluginPath),
      pluginModule,
      pluginModule.exports,
      mockConsole,
      createCompatElement,
      createCompatElement,
      React.Fragment,
      ReactJsxRuntime.Fragment,
      createCompatElementDev,
    );
  } finally {
    if (hadGlobalReact) {
      globalWithReact.React = previousGlobalReact;
    } else {
      delete globalWithReact.React;
    }
  }

  const PluginRoot = pluginModule.exports.default;

  if (!PluginRoot) {
    throw new Error("Plugin did not export a default component.");
  }

  environment.launchType = normalizeLaunchType(launchType);
  environment.commandMode = mode;

  const launchProps: LaunchProps = {
    arguments: toRecord(launchArguments),
    launchContext: launchContext ? toRecord(launchContext) : undefined,
    launchType: environment.launchType,
  };

  if (mode === "no-view") {
    if (typeof PluginRoot === "function") {
      (PluginRoot as (props: LaunchProps) => Promise<void>)(launchProps)
        .then(() => {
          writeLog("No-view command finished.");
          writeOutput({ type: "go-back-to-plugin-list", payload: {} });
        })
        .catch((e) => {
          writeLog(`No-view command failed: ${e}`);
          writeOutput({ type: "go-back-to-plugin-list", payload: {} });
        });
    } else {
      throw new Error("No-view command did not export a default function.");
    }
  } else {
    writeLog("Plugin loaded. Initializing React render...");
    const ViewComponent = PluginRoot as unknown as React.ComponentType<LaunchProps>;
    const AppElement = React.createElement(ViewComponent, launchProps);
    updateContainer(AppElement, () => {
      writeLog("Initial render complete");
    });
  }
};
