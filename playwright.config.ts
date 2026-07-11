/**
 * Playwright config for the e2e smoke suite (docs/ci.md). Only *.spec.ts
 * files run under this runner; the exploratory drive scripts (e2e/drive-*.mjs)
 * stay standalone. The dev server is started automatically (reused locally).
 */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.spec\.ts/,
  timeout: 30_000,
  retries: 0, // フレーキーは隠さず直す (docs/ci.md 失敗時の運用)
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
