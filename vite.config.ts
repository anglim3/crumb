/// <reference types="node" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Loopback only. Set CRUMB_DEV_HOST=0.0.0.0 to listen on another interface.
const devHost = process.env.CRUMB_DEV_HOST || "localhost";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { host: devHost, port: 5173 },
  preview: { host: devHost, port: 5173 },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        examples: fileURLToPath(new URL("./examples/index.html", import.meta.url)),
        howItWorks: fileURLToPath(new URL("./how-it-works/index.html", import.meta.url)),
      },
    },
  },
});
