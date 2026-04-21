import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

// ─── BDD Config per Aplikasi ─────────────────────────────────────────────────

const backofficeTestDir = defineBddConfig({
  features: "tests/backoffice/features/**/*.feature",
  steps: ["tests/backoffice/steps/**/*.ts"],
  outputDir: ".features-gen/backoffice",
});

const feBuyerTestDir = defineBddConfig({
  features: "tests/fe-buyer/features/**/*.feature",
  steps: ["tests/fe-buyer/steps/**/*.ts"],
  outputDir: ".features-gen/fe-buyer",
});

const feConductorTestDir = defineBddConfig({
  features: "tests/fe-conductor/features/**/*.feature",
  steps: ["tests/fe-conductor/steps/**/*.ts"],
  outputDir: ".features-gen/fe-conductor",
});

const e2eTestDir = defineBddConfig({
  features: "tests/e2e/features/**/*.feature",
  // E2E memuat SEMUA steps agar bisa reuse modul lain
  steps: [
    "tests/backoffice/steps/**/*.ts",
    "tests/fe-buyer/steps/**/*.ts",
    "tests/fe-conductor/steps/**/*.ts",
    "tests/e2e/steps/**/*.ts",
  ],
  outputDir: ".features-gen/e2e",
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
    headless: false,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: { width: 1920, height: 1080 },
  },
  projects: [
    // ── Setup: Simpan session masing-masing aplikasi ──────────────────────────
    {
      name: "setup-backoffice",
      testDir: "./tests/setup",
      testMatch: "backoffice.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "setup-auction",
      testDir: "./tests/setup",
      testMatch: "auction.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "setup-conductor",
      testDir: "./tests/setup",
      testMatch: "conductor.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    // ── E2E (Full Flow across apps) ────────────────────────────────────────────
    // Mencakup: backoffice setup → live auction (conductor + buyer).
    // fullyParallel: false agar 01_backoffice_setup selesai sebelum 02_auction_live.
    {
      name: "e2e",
      testDir: e2eTestDir,
      fullyParallel: false,
      workers: 1,
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup-backoffice"],
    },
  ],
});
