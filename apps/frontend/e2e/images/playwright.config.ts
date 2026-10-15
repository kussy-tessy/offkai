import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
export default defineConfig({
  testDir: ".",
  testMatch: "images.check.ts",
  use: { baseURL: "http://127.0.0.1:4176" },
  webServer: {
    command: "node apps/frontend/e2e/images/server.mjs",
    cwd: resolve(__dirname, "../../../.."),
    url: "http://127.0.0.1:4176",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
