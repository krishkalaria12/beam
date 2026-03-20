import Module from "module";
import * as DequalLite from "dequal/lite";
import React, { ReactJsxRuntime } from "../shared-react";
import { getBeamApi } from "../api";
import { createCompatElement, createCompatElementDev } from "../runtime/jsx-runtime";
import { BEAM_UTILS_MAIN } from "../vendor/beam-utils-main";

type BeamUtilsModule = Record<string, unknown>;

let cachedBeamUtils: BeamUtilsModule | null = null;

export function loadBeamUtils(pluginPath: string): BeamUtilsModule {
  if (cachedBeamUtils) {
    return cachedBeamUtils;
  }

  const pluginRequire = Module.createRequire(pluginPath);
  const module = { exports: {} as BeamUtilsModule };

  const scriptFunction = new Function("require", "module", "exports", BEAM_UTILS_MAIN);
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

      if (moduleName === "@beam-launcher/api") {
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

  cachedBeamUtils = module.exports;
  return cachedBeamUtils;
}
