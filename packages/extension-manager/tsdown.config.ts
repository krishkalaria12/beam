import { createRequire } from "node:module";
import { defineConfig } from "tsdown";

const require = createRequire(import.meta.url);
const sharedReactEntry = require.resolve("react-reconciler/node_modules/react");
const sharedReactJsxRuntimeEntry = require.resolve("react-reconciler/node_modules/react/jsx-runtime");

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  outDir: "dist",
  format: "cjs",
  platform: "node",
  target: "node20",
  clean: true,
  minify: "dce-only",
  deps: {
    alwaysBundle: [/.*/],
    onlyBundle: false,
  },
  alias: {
    "react-reconciler/node_modules/react": sharedReactEntry,
    "react-reconciler/node_modules/react/jsx-runtime": sharedReactJsxRuntimeEntry,
  },
  outExtensions: () => ({
    js: ".cjs",
  }),
});
