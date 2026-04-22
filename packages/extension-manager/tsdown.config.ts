import { createRequire } from "node:module";
import { defineConfig } from "tsdown";

const require = createRequire(import.meta.url);

function resolveSharedReactEntry(specifiers: string[]): string {
  for (const specifier of specifiers) {
    try {
      return require.resolve(specifier);
    } catch {}
  }

  throw new Error(`Unable to resolve a shared React entry from: ${specifiers.join(", ")}`);
}

const sharedReactEntry = resolveSharedReactEntry([
  "react-reconciler/node_modules/react",
  "react",
]);
const sharedReactJsxRuntimeEntry = resolveSharedReactEntry([
  "react-reconciler/node_modules/react/jsx-runtime",
  "react/jsx-runtime",
]);

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
    react: sharedReactEntry,
    "react/jsx-runtime": sharedReactJsxRuntimeEntry,
    "react-reconciler/node_modules/react": sharedReactEntry,
    "react-reconciler/node_modules/react/jsx-runtime": sharedReactJsxRuntimeEntry,
  },
  outExtensions: () => ({
    js: ".cjs",
  }),
});
