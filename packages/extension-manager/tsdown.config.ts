import { defineConfig } from "tsdown";

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
  outExtensions: () => ({
    js: ".cjs",
  }),
});
