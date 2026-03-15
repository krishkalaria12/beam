import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/api/**/*.ts",
    "src/commands/**/*.ts",
    "src/schemas/**/*.ts",
    "src/utils/**/*.ts",
  ],
  outDir: "dist",
  root: ".",
  unbundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  clean: true,
  dts: false,
  minify: false,
  treeshake: false,
  deps: {
    skipNodeModulesBundle: true,
  },
  outExtensions: () => ({
    js: ".js",
  }),
});
