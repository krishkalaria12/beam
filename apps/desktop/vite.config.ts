import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const VENDOR_CHUNK_GROUPS = [
  {
    name: "emoji-data",
    test: (id: string) => id.includes("emojibase"),
  },
  {
    name: "charts-vendor",
    test: (id: string) =>
      id.includes("recharts") || /[\\/]node_modules[\\/](d3-|victory-vendor)/.test(id),
  },
  {
    name: "graph-vendor",
    test: (id: string) => id.includes("cytoscape") || id.includes("cose-bilkent"),
  },
  {
    name: "speedtest-vendor",
    test: (id: string) => id.includes("@cloudflare/speedtest"),
  },
  {
    name: "ai-vendor",
    test: (id: string) => /[\\/]node_modules[\\/]ai[\\/]/.test(id) || id.includes("@ai-sdk"),
  },
  {
    name: "tanstack-vendor",
    test: (id: string) => id.includes("@tanstack"),
  },
  {
    name: "icons-phosphor",
    test: (id: string) => id.includes("@phosphor-icons/react"),
  },
  {
    name: "icons-lucide",
    test: (id: string) => id.includes("lucide-react"),
  },
  {
    name: "tauri-vendor",
    test: (id: string) => id.includes("@tauri-apps"),
  },
  {
    name: "react-vendor",
    test: (id: string) =>
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
      id.includes("sonner") ||
      id.includes("@dnd-kit") ||
      id.includes("motion") ||
      id.includes("framer-motion"),
  },
] as const;

function manualVendorChunks(id: string) {
  if (!id.includes("node_modules")) {
    return;
  }

  for (const group of VENDOR_CHUNK_GROUPS) {
    if (group.test(id)) {
      return group.name;
    }
  }
}

const reactCompiler = reactCompilerPreset();

if (!reactCompiler.rolldown?.filter) {
  throw new Error("reactCompilerPreset() must provide a Rolldown filter");
}

reactCompiler.rolldown.filter.id = {
  include: ["src/**"],
  exclude: ["**/*.d.ts", "src/assets/**", "src/routeTree.gen.ts", "src/styles/**", "src/types/**"],
};

export default defineConfig({
  plugins: [tailwindcss(), tanstackRouter({}), react(), babel({ presets: [reactCompiler] })],
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
    modulePreload: {
      polyfill: false,
    },
    chunkSizeWarningLimit: 850,
    rolldownOptions: {
      output: {
        manualChunks: manualVendorChunks,
      },
    },
  },
});
