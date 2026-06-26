import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

const faviconsDir = fileURLToPath(new URL("../../favicons", import.meta.url));

export default defineConfig({
  plugins: [react()],
  publicDir: faviconsDir,
  resolve: {
    alias: {
      "@orchid/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3005",
        changeOrigin: true
      },
      "/health": "http://localhost:3005"
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
});
