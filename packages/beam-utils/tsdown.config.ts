import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  outDir: "dist",
  format: ["esm", "cjs"],
  platform: "node",
  target: "node18",
  clean: true,
  dts: true,
  sourcemap: true,
  minify: false,
  treeshake: false,
  deps: {
    skipNodeModulesBundle: true,
  },
  outExtensions({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
    };
  },
});
