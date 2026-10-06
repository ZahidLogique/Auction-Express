import type { Locator } from "@playwright/test";

// locator.isVisible({ timeout }) mengabaikan timeout (cek instan, tidak menunggu).
// Pakai ini kalau butuh menunggu elemen muncul tanpa melempar error.
export async function appears(locator: Locator, timeout: number): Promise<boolean> {
  return locator.first().waitFor({ state: "visible", timeout }).then(() => true).catch(() => false);
}
