import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// For GitHub Pages, assets need to be served from the repo subpath.
export default defineConfig({
  plugins: [react()],
  base: "/northscape/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    target: "es2020",
    chunkSizeWarningLimit: 1500,
  },
});
