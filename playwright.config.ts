import { defineConfig, devices } from "@playwright/test"

const PORT = 3100

// Browser tests for the chat, /compare and /evals. They run against the
// production build, so run `pnpm build` first. Model calls are mocked in the
// browser, so no API key is needed and nothing is spent.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
