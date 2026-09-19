import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cryptoPlugin } from "./server/crypto";

export default defineConfig({
  plugins: [react(), cryptoPlugin()],
  server: {
    port: 5273,
    host: true,
  },
});
