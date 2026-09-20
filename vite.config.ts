import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cryptoPlugin } from "./server/crypto";
import { nexusPixPlugin } from "./server/nexus";

export default defineConfig({
  plugins: [react(), cryptoPlugin(), nexusPixPlugin()],
  server: {
    port: 5273,
    host: true,
  },
});
