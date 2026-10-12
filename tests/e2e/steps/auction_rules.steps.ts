import { createBdd } from "playwright-bdd";
import { expect, test } from "../../../fixtures/base";
import { step } from "allure-js-commons";
import { appears } from "../../../helpers/wait";
import { createdVehicles } from "./backoffice_setup.steps";
import {
  buyerPage,
  conductorPage,
  attachScreenshot,
  buyerJoinBidding,
  buyerOffer,
  verifyBidPrice,
  getBuyerPrice,
  getConductorPrice,
  getAuctionName,
  getCurrentLotIndex,
  gotoWithReload,
  relogBackofficeIfNeeded,
  STARTING_PRICE,
  RESERVED_PRICE,
} from "./auction_live.steps";

const { When, Then } = createBdd(test);

// Dipakai bersama step di auction_live.steps.ts (broadcast & pesan)
const BROADCAST_TEXT = "Test Broadcast";
const MESSAGE_TEXT   = "Test Message";

const formatPrice = (n: number) => n.toLocaleString("en-US");

// Teks status di room buyer selama harga belum mencapai reserved price
const reservedLabel = () => buyerPage.locator("text=Not reached reserved price >> visible=true");

// Nama buyer yang login, dari header "Hello, <nama> Deposit : ..."
async function getBuyerName(): Promise<string> {
  const text = await buyerPage.locator("body").innerText();
  const match = text.match(/Hello,\s*([^\n]+)/);
  return (match?.[1] ?? "").replace(/\s*Deposit.*$/i, "").trim();
}

// Kode member penawar, dari riwayat conductor ("AX1000947 make bid for 100,000 THB")
async function getBidderCode(): Promise<string> {
  const text = await conductorPage.locator("body").innerText();
  return text.match(/(AX\d+)\s+[Mm]ake bid/)?.[1] ?? "";
}

// ── Broadcast & pesan ─────────────────────────────────────────────────────────

Then("broadcast and message should be delivered", async ({ $testInfo }) => {
  await step("Verify broadcast from conductor is shown to buyer", async () => {
    await expect(buyerPage.locator("p.scroll-text:visible").first()).toContainText(BROADCAST_TEXT, { timeout: 15000 });
    await attachScreenshot($testInfo, buyerPage, "05e - Buyer Broadcast Shown");
  });

  await step("Verify message from buyer is shown to conductor", async () => {
    await expect(conductorPage.locator(`text=${MESSAGE_TEXT} >> visible=true`).first()).toBeVisible({ timeout: 15000 });
    await attachScreenshot($testInfo, conductorPage, "05e - Conductor Message Shown");
  });
});

// ── Reserved price ────────────────────────────────────────────────────────────

Then("reserved price should not be reached", async ({ $testInfo }) => {
  await step("Verify buyer sees 'Not reached reserved price'", async () => {
    await expect(reservedLabel().first()).toBeVisible({ timeout: 10000 });
    await attachScreenshot($testInfo, buyerPage, "05f - Buyer Reserved Not Reached");
  });
});

Then("reserved price should be reached", async ({ $testInfo }) => {
  await step("Verify 'Not reached reserved price' is gone on buyer", async () => {
    await expect(reservedLabel()).toHaveCount(0, { timeout: 10000 });
    await attachScreenshot($testInfo, buyerPage, "05f - Buyer Reserved Reached");
  });
});

// ── Bid bertahap ──────────────────────────────────────────────────────────────

When("buyer joins bidding", async ({ $testInfo }) => {
  await buyerJoinBidding($testInfo);
});

When("buyer offers {int}", async ({ $testInfo }, increment: number) => {
  await buyerOffer(increment, $testInfo);
});

Then("bid price should be {int} on both sides", async ({ $testInfo }, price: number) => {
  await verifyBidPrice(price, $testInfo);
});

// ── Reset Price ───────────────────────────────────────────────────────────────

When("conductor resets the price", async ({ $testInfo }) => {
  await step("Conductor - Reset Price (type 'confirm')", async () => {
    await conductorPage.getByRole("button", { name: "Reset Price", exact: true }).click();

    // Kontainer role="dialog" (HeadlessUI) tidak punya ukuran sendiri sehingga dianggap hidden oleh Playwright:
    // cek visibilitas lewat elemen di dalamnya.
    const dialog = conductorPage.getByRole("dialog").filter({ hasText: "All bids for this lot" });
    const confirmInput = dialog.getByPlaceholder("confirm");
    await expect(confirmInput).toBeVisible({ timeout: 10000 });

    // Tombol baru aktif setelah mengetik "confirm"
    const resetBtn = dialog.getByRole("button", { name: "Reset Price", exact: true });
    await expect(resetBtn).toBeDisabled();
    await confirmInput.fill("confirm");
    await expect(resetBtn).toBeEnabled({ timeout: 5000 });
    await attachScreenshot($testInfo, conductorPage, "07 - Conductor Reset Price Dialog");

    await resetBtn.click();
    await expect(confirmInput).toHaveCount(0, { timeout: 15000 });
    console.log("[Conductor] Reset Price confirmed");
  });
});

Then("the price should be reset to the starting price", async ({ $testInfo }) => {
  await step("Verify buyer price is back to the starting price and buyer lost the lead", async () => {
    await expect.poll(getBuyerPrice, { timeout: 15000, message: "Harga buyer kembali ke starting price" })
      .toBe(STARTING_PRICE);
    await expect.poll(getConductorPrice, { timeout: 15000, message: "Current Price conductor kembali ke starting price" })
      .toBe(STARTING_PRICE);
    await expect(buyerPage.locator("text=You are not the leader >> visible=true").first()).toBeVisible({ timeout: 10000 });
    // Setelah reset, buyer tidak boleh bisa menawar sampai Enable Bid diklik lagi dan buyer menekan Interested lagi
    for (const increment of [2000, 5000]) {
      await expect(buyerPage.locator(`button:has-text("${increment}"):visible`), `Tombol +${increment} tidak boleh ada setelah reset`)
        .toHaveCount(0, { timeout: 10000 });
    }
    await expect(buyerPage.locator('button:has-text("Interested")').first(), "Interested harus nonaktif setelah reset")
      .toBeDisabled({ timeout: 10000 });
    console.log(`[Verify] ✅ Price reset to ${formatPrice(STARTING_PRICE)}, buyer is not the leader`);
  });

  await step("Verify conductor must enable bidding again", async () => {
    await expect(conductorPage.getByRole("button", { name: "Enable Bid Button" })).toBeEnabled({ timeout: 15000 });
    await Promise.all([
      attachScreenshot($testInfo, conductorPage, "07 - Conductor After Reset Price"),
      attachScreenshot($testInfo, buyerPage,     "07 - Buyer After Reset Price"),
    ]);
  });
});

// ── Proxy bid ─────────────────────────────────────────────────────────────────

// Proxy bid diatur dari dialog lot yang BELUM berjalan (ikon mata di daftar lot kiri), bukan di lot aktif.
When("buyer sets a proxy bid of {int} on the next lot", async ({ $testInfo }, price: number) => {
  const target = createdVehicles[getCurrentLotIndex() + 1];
  if (!target) throw new Error("Tidak ada lot berikutnya untuk dipasangi proxy bid");

  await step(`Buyer - Set proxy bid ${formatPrice(price)} on ${target.licensePlate}`, async () => {
    const card = buyerPage.locator('div[class*="rounded-[10px]"]')
      .filter({ hasText: target.licensePlate })
      .filter({ has: buyerPage.locator('button:has-text("My List")') });
    await card.last().locator("button:visible").filter({ hasNotText: "My List" }).first().click();

    const dialog = buyerPage.getByRole("dialog").filter({ hasText: target.licensePlate });
    const proxyInput = dialog.locator('input[placeholder="Proxy Bid"]');
    await proxyInput.waitFor({ state: "visible", timeout: 15000 });
    await proxyInput.fill(String(price));
    await dialog.getByRole("button", { name: "Proxy", exact: true }).click();

    await buyerPage.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(buyerPage.locator("text=Proxy bid successfully added >> visible=true").first()).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByRole("button", { name: "Cancel Proxybid" })).toBeVisible({ timeout: 10000 });
    await attachScreenshot($testInfo, buyerPage, `07 - Buyer Proxy Bid Set (${target.licensePlate})`);

    await buyerPage.keyboard.press("Escape");
    await expect(proxyInput).toBeHidden({ timeout: 10000 });
    console.log(`[Buyer] Proxy bid ${formatPrice(price)} set on ${target.licensePlate}`);
  });
});

Then("the proxy bid should be registered for the lot", async ({ $testInfo }) => {
  await step("Conductor - Proxy Bid tab shows 1 proxy bid", async () => {
    await conductorPage.locator('[role="tab"]:has-text("Proxy Bid")').click();
    await expect(conductorPage.locator("text=/Proxy Bid:\\s*1/ >> visible=true").first()).toBeVisible({ timeout: 20000 });
    await attachScreenshot($testInfo, conductorPage, "08 - Conductor Proxy Bid Registered");
  });
});

// Perilaku teramati di staging: begitu bidding diaktifkan, proxy bid menawar otomatis
// (100,000 → 102,000 → 104,000 → 105,000) lalu berhenti di reserved price, bukan di batas proxy.
Then("the proxy bid should auto-bid up to the reserved price", async ({ $testInfo }) => {
  await verifyBidPrice(RESERVED_PRICE, $testInfo);

  await step("Verify buyer leads and the auto-bid steps are in the bidding history", async () => {
    await expect(buyerPage.locator("text=You are the leader >> visible=true").first()).toBeVisible({ timeout: 10000 });
    // Tab "Send Message" masih aktif sejak Lot 1: buka "Bidding History" agar daftar bid tampil
    await buyerPage.locator('[role="tab"]:has-text("Bidding History")').click();
    for (const price of [102_000, 104_000]) {
      await expect(buyerPage.locator(`text=${formatPrice(price)} THB >> visible=true`).first()).toBeVisible({ timeout: 10000 });
    }
  });

  await step("Verify the proxy bid stops at the reserved price", async () => {
    await buyerPage.waitForTimeout(3000);
    expect(await getBuyerPrice(), "Proxy bid tidak boleh melewati reserved price").toBe(RESERVED_PRICE);
    await Promise.all([
      attachScreenshot($testInfo, conductorPage, "08 - Conductor Proxy Auto Bid"),
      attachScreenshot($testInfo, buyerPage,     "08 - Buyer Proxy Auto Bid"),
    ]);
  });
});

// ── Hasil Sold ────────────────────────────────────────────────────────────────

Then("the sale result should be shown on both sides", async ({ $testInfo }) => {
  await step("Verify winner dialog on conductor and buyer", async () => {
    // Kontainer role="dialog" dianggap hidden oleh Playwright: cek elemen di dalamnya
    const conductorDialog = conductorPage.getByRole("dialog").filter({ hasText: "The auction winner is" });
    await expect(conductorDialog.getByRole("button", { name: "Continue", exact: true })).toBeVisible({ timeout: 15000 });
    await expect(conductorDialog).not.toContainText("Unsold");

    // Pemenang harus penawar yang benar-benar menawar (kode member dari riwayat conductor), bukan sekadar "ada pemenang"
    const memberCode = await getBidderCode();
    expect(memberCode, "Kode member penawar tidak ditemukan di riwayat conductor").toMatch(/^AX\d+$/);
    // Teks antar-elemen digabung tanpa spasi ("winner isAX1000947Selling Sheet"): izinkan spasi opsional
    await expect(conductorDialog, "Pemenang di dialog conductor harus penawar")
      .toContainText(new RegExp(`The auction winner is\\s*${memberCode}`));
    expect(await getBuyerName(), "Nama buyer yang login tidak terbaca di header").not.toBe("");

    const buyerDialog = buyerPage.getByRole("dialog").filter({ hasText: "You are the winner" });
    await expect(buyerDialog.getByText("You are the winner")).toBeVisible({ timeout: 15000 });

    await Promise.all([
      attachScreenshot($testInfo, conductorPage, "09 - Conductor Sold Result"),
      attachScreenshot($testInfo, buyerPage,     "09 - Buyer Winner Dialog"),
    ]);
  });
});

When("conductor continues after the sale", async ({ $testInfo }) => {
  await step("Conductor - Continue, buyer closes the winner dialog", async () => {
    await conductorPage.getByRole("button", { name: "Continue", exact: true }).click();

    const buyerDialog = buyerPage.getByRole("dialog").filter({ hasText: "You are the winner" });
    if (await appears(buyerDialog.getByText("You are the winner"), 3000)) {
      await buyerDialog.getByText("Close", { exact: true }).click({ timeout: 5000 }).catch(async () => {
        await buyerPage.keyboard.press("Escape");
      });
    }
    await conductorPage.waitForTimeout(1000);
    await attachScreenshot($testInfo, conductorPage, "09b - Conductor After Sold Continue");
  });
});

Then("the sold lot should be listed with the final price", async ({ $testInfo }) => {
  const plate = createdVehicles[getCurrentLotIndex()].licensePlate;

  await step(`Verify ${plate} is listed as Sold with the final price`, async () => {
    const row = conductorPage.locator("table tbody tr").filter({ hasText: plate }).first();
    // Teks antar-sel digabung tanpa spasi ("...2SoldLogique QA"), dan "Un-Sold" juga mengandung "Sold":
    // cocokkan "Sold" yang tidak didahului "Un-"
    // Tabel conductor diperbarui dengan jeda setelah Continue (baris tetap "Auctioning" beberapa belas detik)
    await expect(row).toContainText(/(?<!Un-)Sold/, { timeout: 60000 });
    await expect(row, "Harga akhir di tabel lot").toContainText(`${formatPrice(RESERVED_PRICE)} THB`);
    await expect(row, "Auction Winner di tabel lot harus buyer yang login").toContainText(await getBuyerName());
    // Lot yang tidak terjual harus tetap Un-Sold dan tanpa pemenang
    for (const lot of createdVehicles.slice(0, getCurrentLotIndex())) {
      await expect(conductorPage.locator("table tbody tr").filter({ hasText: lot.licensePlate }).first(), `${lot.licensePlate} harus Un-Sold`)
        .toContainText("Un-Sold", { timeout: 15000 });
    }
    await attachScreenshot($testInfo, conductorPage, "09c - Conductor Lot Table After Sold");
  });
});

// ── Payment terbentuk ─────────────────────────────────────────────────────────

// Backend membuat payment dengan jeda (kadang menit). Cari di daftar payment TANPA kata kunci:
// pencarian dengan plat pernah tidak menemukan baris yang baru muncul.
Then("the payment should be created for the sold vehicle", async ({ page, $testInfo }) => {
  const baseUrl = (process.env.BACKOFFICE_URL ?? "").replace(/\/$/, "");
  const paymentUrl = `${baseUrl}/en/register-payment/payment`;
  const searchSelector = 'input[wire\\:model\\.defer="filter.search"]';
  const plate = createdVehicles[getCurrentLotIndex()].licensePlate;
  const auctionName = getAuctionName();

  await step(`Backoffice - Wait for the unpaid payment of ${plate}`, async () => {
    const deadline = Date.now() + 180_000;
    let rowText = "";

    for (let attempt = 1; ; attempt++) {
      await gotoWithReload(page, paymentUrl, searchSelector);
      if (await relogBackofficeIfNeeded(page)) {
        await gotoWithReload(page, paymentUrl, searchSelector);
      }

      const row = page.locator("tr")
        .filter({ hasText: auctionName })
        .filter({ hasText: plate })
        .filter({ hasText: "unpaid" })
        .first();
      if (await appears(row, 10000)) {
        rowText = (await row.innerText()).replace(/\s+/g, " ");
        break;
      }
      if (Date.now() > deadline) break;
      console.log(`[Payment] Attempt ${attempt} — payment ${plate} belum muncul, menunggu...`);
      await page.waitForTimeout(15000);
    }

    expect(rowText, `Payment unpaid untuk ${plate} (${auctionName}) tidak muncul dalam 3 menit`).not.toBe("");

    // Kolom setelah plat: Sold Price Total, Fee Total, Total, Remaining Amount
    const match = rowText.match(new RegExp(`${plate}\\s+([\\d,]+\\.\\d{2})\\s+([\\d,]+\\.\\d{2})\\s+([\\d,]+\\.\\d{2})\\s+([\\d,]+\\.\\d{2})`));
    expect(match, `Format baris payment tidak dikenali: ${rowText}`).not.toBeNull();
    const [soldTotal, fee, total, remaining] = match!.slice(1, 5).map((v) => Number(v.replace(/,/g, "")));

    // Baris payment memuat nomor lot kendaraan ini (kolom lotNo)
    const lotNumber = createdVehicles[getCurrentLotIndex()].lotNumber;
    if (lotNumber) expect(rowText, `Baris payment harus memuat lot ${lotNumber}`).toContain(lotNumber);

    expect(soldTotal, "Sold Price Total minimal sebesar harga akhir").toBeGreaterThanOrEqual(RESERVED_PRICE);
    expect(Math.abs(total - (soldTotal + fee)), "Total = Sold Price Total + Fee").toBeLessThan(0.01);
    expect(remaining, "Remaining Amount = Total (belum dibayar)").toBeCloseTo(total, 2);

    console.log(`[Payment] ✅ ${plate}: sold ${soldTotal}, fee ${fee}, total ${total}, unpaid`);
    await attachScreenshot($testInfo, page, "10 - Backoffice Payment Created");
  });
});
