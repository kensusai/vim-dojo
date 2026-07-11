/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // GitHub Pages serves the app under /vim-dojo/; the deploy workflow sets
  // BASE_PATH. Local dev and tests stay at /.
  base: process.env.BASE_PATH ?? "/",
  plugins: [
    react(),
    tailwindcss(),
    // Service-worker cache for instant revisit start (非機能要件: 起動サクサク)
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "vim-dojo",
        short_name: "vim-dojo",
        description:
          "vim が苦手な人が、楽しく・飽きずに・継続的に vim 操作を鍛えられるブラウザゲーム",
        theme_color: "#12100b",
        background_color: "#12100b",
        display: "standalone",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  test: {
    // core is pure TypeScript (ADR-0005), so the default node environment is
    // enough; switch per-file to jsdom when UI component tests arrive.
    environment: "node",
    // e2e/*.spec.ts belongs to Playwright, not Vitest.
    include: ["src/**/*.test.ts"],
  },
});
