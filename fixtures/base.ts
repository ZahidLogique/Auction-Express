import { test as bddTest } from "playwright-bdd";
import { expect } from "@playwright/test";

const RETRY_DELAY_MS = 10_000;

// Auto fixture (bukan test.beforeEach di module ini): hook yang didaftarkan dari
// file import hanya menempel di file pertama yang memuatnya, fixture berlaku untuk semua test.
export const test = bddTest.extend<{ retryDelay: void }>({
  retryDelay: [
    async ({}, use, testInfo) => {
      if (testInfo.retry > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
      await use();
    },
    { auto: true },
  ],
});

export { expect };
