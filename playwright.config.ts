import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

// ─── BDD Config per modul ────────────────────────────────────────────────────
// Setiap modul baru: tambahkan defineBddConfig di sini dan project-nya di bawah

const loginTestDir = defineBddConfig({
  features: "tests/login/*.feature",
  steps: ["tests/login/*.steps.ts"],
  outputDir: ".features-gen/login",
});

const userTestDir = defineBddConfig({
  features: "tests/user/*.feature",
  steps: ["tests/user/*.steps.ts"],
  outputDir: ".features-gen/user",
});

const membershipTestDir = defineBddConfig({
  features: "tests/membership/*.feature",
  steps: ["tests/membership/*.steps.ts"],
  outputDir: ".features-gen/membership",
});

// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  fullyParallel: process.env.TEST_SEQUENTIAL !== "true",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  globalSetup: "./global-setup.ts",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results.json" }],
    ["allure-playwright", { outputFolder: "allure-results", detail: true }],
  ],
  use: {
    baseURL: process.env.BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: { width: 1920, height: 1080 },
  },
  projects: [
    // ── Setup: simpan session ke .auth/user.json ──────────────────────────
    {
      name: "setup",
      testDir: "./tests/setup",
      testMatch: "**/*.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    // ── Login: tidak butuh session, fresh browser ─────────────────────────
    {
      name: "login",
      testDir: loginTestDir,
      use: { ...devices["Desktop Chrome"] },
    },

    // ── User Management (authenticated) ───────────────────────────────────
    {
      name: "user",
      testDir: userTestDir,
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },

    // ── Membership Management ─────────────────────────────────────────────
    {
      name: "membership",
      testDir: membershipTestDir,
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },

    // ── Modul lain (authenticated): tambahkan di bawah sini ───────────────
  ],
});
