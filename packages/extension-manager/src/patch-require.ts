import Module from "module";
import * as beamApi from "@beam/api";
import * as raycastApiCompat from "@beam/raycast-api-compat";
import React from "react";
import * as ReactJsxRuntime from "react/jsx-runtime";
import { getRaycastUtils } from "./api/raycastUtils";
import { createCompatElement, createCompatElementDev } from "./runtime/jsx-runtime";

const injectJsxGlobals = () => {
  const globalScope = globalThis as Record<string, unknown>;
  globalScope._jsx = createCompatElement;
  globalScope._jsxs = createCompatElement;
  globalScope._jsxFragment = ReactJsxRuntime.Fragment;
  globalScope._jsxDEV = createCompatElementDev;
};

export const patchRequire = (pluginPath: string) => {
  const pluginRequire = Module.createRequire(pluginPath);

  injectJsxGlobals();

  return (moduleName: string): unknown => {
    if (moduleName === "react") {
      return React;
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

    if (moduleName.startsWith("@beam/api")) {
      return beamApi;
    }

    if (moduleName.startsWith("@raycast/api")) {
      return raycastApiCompat;
    }

    if (moduleName.startsWith("@raycast/utils")) {
      return getRaycastUtils();
    }

    return pluginRequire(moduleName);
  };
};

export const withGlobalReact = <T>(run: () => T): T => {
  const globalScope = globalThis as Record<string, unknown>;
  const hadGlobalReact = Object.prototype.hasOwnProperty.call(globalScope, "React");
  const previousGlobalReact = globalScope.React;
  globalScope.React = React;

  try {
    return run();
  } finally {
    if (hadGlobalReact) {
      globalScope.React = previousGlobalReact;
    } else {
      delete globalScope.React;
    }
  }
};
