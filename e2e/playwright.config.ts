import { defineConfig } from "@playwright/test";

// Run browser tests against the local app, using one worker and a shared database.
export default defineConfig({
  testDir: "./tests",
  // Tests share one database, so they cannot run in parallel.
  workers: 1,
  // The helpers pace auth posts under the backend's 10-per-minute budget,
  // and one paced wait can exceed the 30s default.
  timeout: 180_000,
  globalSetup: "./global-setup.ts",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
});
