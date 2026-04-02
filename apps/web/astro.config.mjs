// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  image: {
    domains: ["liqgcawbf9.ufs.sh"],
  },

  vite: {
    // Astro and the workspace root can resolve different Vite types during checks.
    // The plugin itself is valid at runtime, so we narrow the type here.
    // @ts-expect-error Vite plugin types resolve from different package trees in astro check.
    plugins: [tailwindcss()],
  },
});
