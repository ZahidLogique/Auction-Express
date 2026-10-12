import { test as setup } from "@playwright/test";
import path from "path";
import { finishLeftoverTestAuctions } from "../../helpers/conductor-cleanup";

// Berjalan sebelum E2E: selesaikan auction test sisa run yang gagal (lihat helpers/conductor-cleanup.ts).
// Best-effort: kegagalan di sini hanya dicatat, supaya run tidak berhenti karena pembersihan.
setup("cleanup leftover test auctions", async ({ page, browser }) => {
  setup.setTimeout(900000);
  const conductorUrl = process.env.FE_CONDUCTOR_URL!;
  const backofficeUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
  const log = (message: string) => console.log(`[Cleanup] ${message}`);

  // `page` memakai sesi conductor (project setup-cleanup); sesi backoffice dibuka di context terpisah
  const backofficeContext = await browser.newContext({
    storageState: path.join(__dirname, "../../.auth/backoffice.json"),
    viewport: { width: 1920, height: 1080 },
  });
  const backofficePage = await backofficeContext.newPage();

  try {
    await page.goto(conductorUrl, { timeout: 60000 });
    await finishLeftoverTestAuctions(page, backofficePage, conductorUrl, backofficeUrl, log);
  } catch (error) {
    log(`dilewati: ${(error as Error).message.split("\n")[0]}`);
  } finally {
    await backofficeContext.close();
  }
});
