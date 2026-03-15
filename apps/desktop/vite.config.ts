import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({}),
    react(),
    babel({
      exclude: [/node_modules/],
      babelConfig: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "../../node_modules/react"),
      "react-dom": path.resolve(__dirname, "../../node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "../../node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(
        __dirname,
        "../../node_modules/react/jsx-dev-runtime.js",
      ),
    },
    dedupe: ["react", "react-dom"],
    extensions: [".ts", ".tsx", ".js", ".json"],
  },
  server: {
    port: 3001,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: "lightningcss",
    chunkSizeWarningLimit: 850,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) {
            return;
          }
          if (id.includes("emojibase")) {
            return "emoji-data";
          }
          if (id.includes("zod")) {
            return "zod-vendor";
          }
          if (id.includes("@tanstack")) {
            return "tanstack-vendor";
          }
          if (id.includes("@phosphor-icons/react")) {
            return "icons-phosphor";
          }
          if (id.includes("lucide-react")) {
            return "icons-lucide";
          }
          if (id.includes("@tauri-apps")) {
            return "tauri-vendor";
          }
          if (
            id.includes("react/") ||
            id.includes("react-dom") ||
            id.includes("scheduler") ||
            id.includes("use-sync-external-store") ||
            id.includes("zustand") ||
            id.includes("class-variance-authority") ||
            id.includes("tailwind-merge") ||
            id.includes("clsx") ||
            id.includes("date-fns") ||
            id.includes("next-themes") ||
            id.includes("cmdk") ||
            id.includes("@base-ui") ||
            id.includes("sonner")
          ) {
            return "react-vendor";
          }
          // Let Rollup auto-place remaining dependencies to avoid forced
          // cross-chunk cycles from over-manualized vendor grouping.
          return;
        },
      },
    },
  },
});
