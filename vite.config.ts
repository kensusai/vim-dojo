/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // core is pure TypeScript (ADR-0005), so the default node environment is
    // enough; switch per-file to jsdom when UI component tests arrive.
    environment: "node",
  },
});
