import Module from "module";
import * as DequalLite from "dequal/lite";
import React from "react";
import * as ReactJsxRuntime from "react/jsx-runtime";
import { getBeamApi } from "../api";
import { createCompatElement, createCompatElementDev } from "../runtime/jsx-runtime";
import { RAYCAST_UTILS_MAIN } from "../vendor/raycast-utils-main";

type RaycastUtilsModule = Record<string, unknown>;

let cachedRaycastUtils: RaycastUtilsModule | null = null;

export function loadRaycastUtils(pluginPath: string): RaycastUtilsModule {
  if (cachedRaycastUtils) {
    return cachedRaycastUtils;
  }

  const pluginRequire = Module.createRequire(pluginPath);
  const module = { exports: {} as RaycastUtilsModule };

  const scriptFunction = new Function("require", "module", "exports", RAYCAST_UTILS_MAIN);
  scriptFunction(
    (moduleName: string): unknown => {
      if (moduleName === "react") {
        return React;
      }

      if (moduleName === "react/jsx-runtime") {
        return {
          ...ReactJsxRuntime,
          jsx: createCompatElement,
          jsxs: createCompatElement,
          Fragment: ReactJsxRuntime.Fragment,
        };
      }

      if (moduleName === "react/jsx-dev-runtime") {
        return {
          ...ReactJsxRuntime,
          jsxDEV: createCompatElementDev,
          Fragment: ReactJsxRuntime.Fragment,
        };
      }

      if (moduleName === "@raycast/api") {
        return getBeamApi();
      }

      if (moduleName === "dequal/lite") {
        return DequalLite;
      }

      return pluginRequire(moduleName);
    },
    module,
    module.exports,
  );

  cachedRaycastUtils = module.exports;
  return cachedRaycastUtils;
}
