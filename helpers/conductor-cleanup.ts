import type { Locator, Page } from "@playwright/test";

// Auction yang dibuat E2E bernama "Test Auction <angka>". Hanya yang cocok pola ini yang disentuh,
// supaya auction milik orang lain di staging tidak ikut diselesaikan.
export const TEST_AUCTION_NAME = /^Test Auction \d+$/;

const STARTING_PRICE = 100_000;
const RESERVED_PRICE = 105_000;
const CARD = "div.w-full.border.rounded-md";

// Di Playwright Test aksi (click, dll.) TIDAK punya batas waktu bawaan: tanpa timeout eksplisit,
// satu klik yang tidak bisa dilakukan menggantung sampai test timeout. Semua aksi di sini dibatasi.
const ACTION = { timeout: 10000 };
const LANE_DEADLINE_MS = 8 * 60 * 1000;

type Log = (message: string) => void;

async function waitEnabled(locator: Locator, timeout: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await locator.isEnabled().catch(() => false)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

// Input harga conductor dikunci (disabled): sama seperti step E2E, lepas disabled lalu isi lewat setter native.
async function setPrice(page: Page, label: string, value: number) {
  const button = page.locator(`button:has-text("${label}")`);
  if (!(await button.count())) return;
  await button.scrollIntoViewIfNeeded(ACTION);
  const input = button.locator("xpath=preceding-sibling::input").first();
  await input.evaluate(
    (el: HTMLInputElement, v: string) => {
      el.removeAttribute("disabled");
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    String(value),
    ACTION
  );
  await button.evaluate((el: HTMLButtonElement) => el.removeAttribute("disabled"), undefined, ACTION);
  await button.click(ACTION);
  await page.waitForTimeout(1500);
}

// Kontrol room conductor baru aktif setelah room selesai inisialisasi (bisa lebih dari 4 detik saat server lambat).
// Tunggu sampai salah satu kontrol aktif, atau End Lane tampil, sebelum memutuskan apa yang harus diklik.
async function waitRoomReady(page: Page, timeout: number): Promise<boolean> {
  const controls = [
    page.locator('button:has-text("Start Lane")'),
    page.locator('button:has-text("Enable Bid Button")'),
    page.locator('button:has-text("Start Countdown")'),
    page.getByRole("button", { name: "Unsold", exact: true }),
  ];
  const endLane = page.getByRole("button", { name: "End Lane" });
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await endLane.isVisible().catch(() => false)) return true;
    for (const control of controls) {
      if (await control.isEnabled().catch(() => false)) return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function visibleButtons(page: Page): Promise<string> {
  return page
    .evaluate(() =>
      [...document.querySelectorAll("button")]
        .filter((b) => (b as HTMLElement).offsetParent)
        .map((b) => b.innerText.trim().replace(/\s+/g, " ") + (b.disabled ? " [off]" : ""))
        .filter((t) => /lane|next|enable|countdown|sold|unsold|continue|close/i.test(t))
        .join(", ")
    )
    .catch(() => "(tidak terbaca)");
}

// Dari dalam room conductor: jalankan semua lot yang tersisa sebagai Unsold lalu End Lane.
export async function finishLane(page: Page, log: Log): Promise<boolean> {
  const deadline = Date.now() + LANE_DEADLINE_MS;

  for (let lot = 0; lot < 8 && Date.now() < deadline; lot++) {
    try {
      if (!(await waitRoomReady(page, 30000))) {
        log(`lot ke-${lot + 1}: kontrol room tidak aktif dalam 30 detik. Tombol: ${await visibleButtons(page)}`);
        return false;
      }

      const endLane = page.getByRole("button", { name: "End Lane" });
      if (await endLane.isVisible().catch(() => false)) {
        if (await waitEnabled(endLane, 15000)) {
          await endLane.click(ACTION);
          await page.waitForTimeout(3000);
          return true;
        }
      }

      const startLane = page.locator('button:has-text("Start Lane")');
      if (await startLane.isEnabled().catch(() => false)) {
        await startLane.click(ACTION);
        await page.waitForTimeout(2000);
      }

      await setPrice(page, "Adjust Starting Price", STARTING_PRICE);
      await setPrice(page, "Adjust Reserved Price", RESERVED_PRICE);

      const enableBid = page.locator('button:has-text("Enable Bid Button")');
      if (await waitEnabled(enableBid, 15000)) {
        await enableBid.click(ACTION);
        await page.waitForTimeout(1500);
      }

      const countdown = page.locator('button:has-text("Start Countdown")');
      if (await countdown.isEnabled().catch(() => false)) await countdown.click(ACTION);

      const unsold = page.getByRole("button", { name: "Unsold", exact: true });
      if (!(await waitEnabled(unsold, 45000))) {
        log(`lot ke-${lot + 1}: tombol Unsold tidak aktif, berhenti. Tombol: ${await visibleButtons(page)}`);
        return false;
      }
      await unsold.click(ACTION);
      await page.waitForTimeout(1500);
      const proceed = page.getByRole("button", { name: "Continue", exact: true });
      if (await proceed.isVisible().catch(() => false)) await proceed.click(ACTION);
      await page.waitForTimeout(4000);
      log(`lot ke-${lot + 1}: Unsold`);
    } catch (error) {
      log(`lot ke-${lot + 1}: error "${(error as Error).message.split("\n")[0]}". Tombol: ${await visibleButtons(page)}`);
      return false;
    }
  }
  log(`lane belum selesai (batas ${LANE_DEADLINE_MS / 60000} menit/8 lot). Tombol: ${await visibleButtons(page)}`);
  return false;
}

// Nama auction test yang masih terbuka (tombol Start Auction aktif) di daftar conductor.
export async function listOpenTestAuctions(page: Page): Promise<string[]> {
  const cards = page.locator(CARD);
  await cards.first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});

  const names: string[] = [];
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const name = ((await card.locator("h3").first().textContent({ timeout: 5000 }).catch(() => "")) ?? "").trim();
    if (!TEST_AUCTION_NAME.test(name)) continue;
    if (await card.locator('button:has-text("Start Auction")').isEnabled().catch(() => false)) names.push(name);
  }
  return names;
}

export interface LeftoverAuction {
  name: string;
  id: string;
  lane: string;
}

// Daftar auction default di backoffice (tab "upcoming") hanya berisi auction yang BELUM selesai, tanpa batas tanggal
// (daftar conductor hanya menampilkan auction hari ini, sehingga sisa kemarin tidak terlihat di sana).
// Auction test yang masih punya kendaraan di daftar ini adalah sisa yang menahan vehicle.
export async function listLeftoverFromBackoffice(page: Page, backofficeUrl: string): Promise<LeftoverAuction[]> {
  await page.goto(`${backofficeUrl}/en/auction-management/auction`, { timeout: 90000 });
  await page.locator("#jadwallelang tbody").waitFor({ state: "visible", timeout: 30000 });

  const rows = await page.evaluate(() => {
    const headers = [...document.querySelectorAll("#jadwallelang thead th")].map((th) => (th.textContent ?? "").trim());
    const iEvent = headers.indexOf("Event");
    const iCars = headers.indexOf("Total Car List");
    const iLane = headers.indexOf("Lane");
    return [...document.querySelectorAll("#jadwallelang tbody tr")].map((row) => {
      const cells = [...row.querySelectorAll("td")].map((td) => (td.textContent ?? "").trim().replace(/\s+/g, " "));
      const href = row.querySelector("a")?.getAttribute("href") ?? "";
      return {
        name: cells[iEvent] ?? "",
        cars: Number(cells[iCars] ?? 0),
        lane: cells[iLane] || "1",
        id: href.match(/vehicle-list\/([0-9a-f-]{36})/)?.[1] ?? "",
      };
    });
  });

  return rows
    .filter((r) => TEST_AUCTION_NAME.test(r.name) && r.cars > 0 && r.id)
    .map(({ name, id, lane }) => ({ name, id, lane }));
}

// Masuk ke room conductor lewat URL langsung (bekerja untuk auction tanggal berapa pun) lalu selesaikan lane-nya.
async function finishAuctionRoom(page: Page, roomUrl: string, name: string, log: Log): Promise<boolean> {
  await page.goto(roomUrl, { timeout: 60000 });
  // Aplikasi mengembalikan ke daftar kalau room tidak bisa dimasuki (sesi conductor lain masih memegang lane)
  for (let i = 0; i < 8 && !page.url().includes("/list/"); i++) await page.waitForTimeout(1000);
  if (page.url().includes("/list/")) {
    log(`GAGAL masuk room "${name}": dikembalikan ke daftar (lane mungkin masih dipegang sesi conductor lain)`);
    return false;
  }
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(4000);
  return finishLane(page, log);
}

// Sumber utama: daftar backoffice. Kalau gagal dibaca, jatuh ke daftar conductor (hanya auction hari ini).
export async function finishLeftoverTestAuctions(
  conductorPage: Page,
  backofficePage: Page,
  conductorUrl: string,
  backofficeUrl: string,
  log: Log
): Promise<void> {
  let leftovers: LeftoverAuction[] | null = null;
  try {
    leftovers = await listLeftoverFromBackoffice(backofficePage, backofficeUrl);
  } catch (error) {
    log(`daftar backoffice tidak terbaca (${(error as Error).message.split("\n")[0]}), pakai daftar conductor`);
  }

  if (leftovers === null) {
    await finishOpenTestAuctions(conductorPage, conductorUrl, log);
    return;
  }
  if (leftovers.length === 0) {
    log("tidak ada auction test yang menggantung");
    return;
  }
  log(`auction test yang menggantung: ${leftovers.map((l) => l.name).join(", ")}`);

  for (const { name, id, lane } of leftovers) {
    log(`menyelesaikan "${name}"...`);
    try {
      const finished = await finishAuctionRoom(conductorPage, `${conductorUrl.replace(/\/$/, "")}/conductor/${id}/${lane}`, name, log);
      log(finished ? `"${name}" selesai` : `GAGAL menyelesaikan "${name}" (lane masih terbuka)`);
    } catch (error) {
      log(`error pada "${name}": ${(error as Error).message.split("\n")[0]}`);
    }
  }
}

// Cadangan: selesaikan auction test dari daftar conductor (hanya yang tampil, yaitu auction hari ini).
export async function finishOpenTestAuctions(page: Page, conductorUrl: string, log: Log): Promise<void> {
  const names = await listOpenTestAuctions(page);
  if (names.length === 0) {
    log("tidak ada auction test yang menggantung");
    return;
  }
  log(`auction test yang menggantung: ${names.join(", ")}`);

  for (const name of names) {
    log(`menyelesaikan "${name}"...`);
    try {
      const card = page.locator(CARD).filter({ hasText: name }).first();
      await card.locator('button:has-text("Start Auction")').click(ACTION);

      // Room hanya bisa dimasuki kalau tidak ada sesi conductor lain yang masih memegang lane;
      // kalau gagal masuk, aplikasi mengembalikan ke daftar.
      await page.waitForURL((url) => !url.pathname.includes("/list/"), { timeout: 30000 }).catch(() => {});
      if (page.url().includes("/list/")) {
        log(`GAGAL masuk room "${name}": dikembalikan ke daftar (lane mungkin masih dipegang sesi conductor lain)`);
      } else {
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(4000);
        const finished = await finishLane(page, log);
        log(finished ? `"${name}" selesai` : `GAGAL menyelesaikan "${name}" (lane masih terbuka)`);
      }
    } catch (error) {
      log(`error pada "${name}": ${(error as Error).message.split("\n")[0]}`);
    }
    await page.goto(conductorUrl, { timeout: 60000 }).catch(() => {});
    await page.waitForLoadState("domcontentloaded").catch(() => {});
  }
}
