import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({}),
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
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
          if (
            id.includes("react/") ||
            id.includes("react-dom") ||
            id.includes("scheduler") ||
            id.includes("use-sync-external-store") ||
            id.includes("zustand") ||
            id.includes("lucide-react") ||
            id.includes("cmdk") ||
            id.includes("@base-ui") ||
            id.includes("sonner") ||
            id.includes("class-variance-authority") ||
            id.includes("tailwind-merge") ||
            id.includes("clsx") ||
            id.includes("date-fns") ||
            id.includes("next-themes")
          ) {
            return "framework-vendor";
          }
          // Let Rollup auto-place remaining dependencies to avoid forced
          // cross-chunk cycles from over-manualized vendor grouping.
          return;
        },
      },
    },
  },
});
