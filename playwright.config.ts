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

const feAuctionTestDir = defineBddConfig({
  features: "tests/fe-auction/features/**/*.feature",
  steps: ["tests/fe-auction/steps/**/*.ts"],
  outputDir: ".features-gen/fe-auction",
});

const feConductorTestDir = defineBddConfig({
  features: "tests/fe-conductor/features/**/*.feature",
  steps: ["tests/fe-conductor/steps/**/*.ts"],
  outputDir: ".features-gen/fe-conductor",
});

const regressionTestDir = defineBddConfig({
  features: "tests/regression/features/**/*.feature",
  // KUNCI: Regression memuat SEMUA steps agar bisa reuse modul lain
  steps: [
    "tests/backoffice/steps/**/*.ts",
    "tests/fe-auction/steps/**/*.ts",
    "tests/fe-conductor/steps/**/*.ts",
    "tests/regression/steps/**/*.ts",
  ],
  outputDir: ".features-gen/regression",
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

    // ── Backoffice App (Authenticated) ─────────────────────────────────────────
    {
      name: "backoffice",
      testDir: backofficeTestDir,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.BACKOFFICE_URL,
        storageState: ".auth/backoffice.json",
      },
      dependencies: ["setup-backoffice"],
    },

    // ── FE Auction App (Authenticated) ─────────────────────────────────────────
    {
      name: "fe-auction",
      testDir: feAuctionTestDir,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.FE_AUCTION_URL,
        storageState: ".auth/auction.json",
      },
      dependencies: ["setup-auction"],
    },

    // ── FE Conductor App (Authenticated) ───────────────────────────────────────
    {
      name: "fe-conductor",
      testDir: feConductorTestDir,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.FE_CONDUCTOR_URL,
        storageState: ".auth/conductor.json",
      },
      dependencies: ["setup-conductor"],
    },

    // ── Regression (E2E Flow across apps) ──────────────────────────────────────
    // Dependencies disesuaikan bertahap sesuai step yang aktif di e2e_flow.feature.
    // Saat ini hanya step backoffice yang aktif, tambahkan setup-auction & setup-conductor
    // saat step login customer/conductor sudah diimplementasi.
    {
      name: "regression",
      testDir: regressionTestDir,
      fullyParallel: false, // E2E harus selesai dulu sebelum auction flow
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup-backoffice"],
    },
  ],
});
