import { Page, TestInfo } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Ambil screenshot pada critical step, simpan ke screenshots/<TC-ID>/
 * dan attach ke Allure report secara otomatis.
 *
 * Nomor step di-auto-detect berdasarkan jumlah screenshot yang sudah ada.
 *
 * @param page      - Playwright Page object
 * @param testInfo  - TestInfo dari Playwright (atau $testInfo dari BDD step)
 * @param stepName  - Nama deskriptif step (label di Allure & nama file)
 */
export async function takeScreenshot(
  page: Page,
  testInfo: TestInfo,
  stepName: string
): Promise<void> {
  const tcId = testInfo.title.split(":")[0].trim();
  const dir = path.join(process.cwd(), "screenshots", tcId);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const existingCount = fs.readdirSync(dir).filter((f) => f.endsWith(".png")).length;
  const stepNum = existingCount + 1;

  const slug = stepName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const fileName = `${String(stepNum).padStart(2, "0")}-${slug}.png`;
  const filePath = path.join(dir, fileName);

  await page.screenshot({ path: filePath, fullPage: false });

  await testInfo.attach(stepName, {
    body: fs.readFileSync(filePath),
    contentType: "image/png",
  });
}
