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
            id.includes("lucide-react") ||
            id.includes("cmdk") ||
            id.includes("@base-ui") ||
            id.includes("shadcn") ||
            id.includes("sonner") ||
            id.includes("class-variance") ||
            id.includes("tailwind-merge") ||
            id.includes("clsx")
          ) {
            return "ui-vendor";
          }
          if (id.includes("react-dom") || id.includes("react/") || id.includes("scheduler")) {
            return "react-vendor";
          }
          return "vendors";
        },
      },
    },
  },
});
