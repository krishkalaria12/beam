import Module from "module";
import React from "react";
import * as ReactJsxRuntime from "react/jsx-runtime";
import { getBeamApi, getRaycastApi, preferences } from "../api";
import { environment } from "../api/environment";
import { getRaycastUtils } from "../api/raycastUtils";
import { createCompatElement, createCompatElementDev } from "./jsx-runtime";

type BeamGlobal = typeof globalThis & {
  beam?: {
    api: ReturnType<typeof getBeamApi>;
    environ: typeof environment;
    preferences: Record<string, unknown>;
  };
};

export const createRuntimeRequire = (pluginPath: string) => {
  const pluginRequire = Module.createRequire(pluginPath);

  return (moduleName: string): unknown => {
    if (moduleName === "react") {
      return React;
    }

    if (moduleName.startsWith("@raycast/api")) {
      return getRaycastApi();
    }

    if (moduleName.startsWith("@beam/api")) {
      return getBeamApi();
    }

    if (moduleName.startsWith("@raycast/utils")) {
      return getRaycastUtils();
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

export const ensureBeamGlobal = (): void => {
  const globalBeam = globalThis as BeamGlobal;

  globalBeam.beam = {
    api: getBeamApi(),
    environ: environment,
    preferences,
  };
};

export const withGlobalReact = <T>(run: () => T): T => {
  const globalWithReact = globalThis as Record<string, unknown>;
  const hadGlobalReact = Object.prototype.hasOwnProperty.call(globalWithReact, "React");
  const previousGlobalReact = globalWithReact.React;
  globalWithReact.React = React;

  try {
    return run();
  } finally {
    if (hadGlobalReact) {
      globalWithReact.React = previousGlobalReact;
    } else {
      delete globalWithReact.React;
    }
  }
};
