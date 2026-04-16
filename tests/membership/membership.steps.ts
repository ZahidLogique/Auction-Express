import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { MembershipPage } from "../../pages/MembershipPage";
import { generateMembership, MembershipData } from "../../helpers/random";
import { takeScreenshot } from "../../helpers/screenshot";

const { Given, When, Then } = createBdd();

let membershipPage: MembershipPage;
let membershipData: MembershipData;

// ─── Given ───────────────────────────────────────────────────────────────────

Given("saya berada di halaman Membership Management", async ({ page, $testInfo }) => {
  membershipPage = new MembershipPage(page);
  await membershipPage.goto();
  await takeScreenshot(page, $testInfo, "Membership List Page");
});

// ─── When ─────────────────────────────────────────────────────────────────────

When("saya membuka form tambah membership baru", async ({ page, $testInfo }) => {
  await membershipPage.gotoCreate();
  await page.waitForLoadState("networkidle");
  await takeScreenshot(page, $testInfo, "Create Membership Form");
});

When("saya mengisi form membership dengan data Individual yang valid", async ({ page, $testInfo }) => {
  membershipData = generateMembership();

  await membershipPage.fillForm({
    firstName:  membershipData.firstName,
    lastName:   membershipData.lastName,
    taxId:      membershipData.taxId,
    taxStatus:  "VAT Exempt",
    role:       "Buyer",
    email:      membershipData.email,
    phone:      membershipData.phone,
    mobile:     membershipData.mobile,
    road:       membershipData.road,
    postalCode: membershipData.postalCode,
    inputBy:    "Administrator LGQ",
  });

  await takeScreenshot(page, $testInfo, "Form Filled");
});

When("saya menyimpan data membership", async ({ page, $testInfo }) => {
  await membershipPage.submit();
  await takeScreenshot(page, $testInfo, "After Save Clicked");
});

// ─── Then ─────────────────────────────────────────────────────────────────────

Then("seharusnya muncul notifikasi sukses pembuatan membership", async ({ page, $testInfo }) => {
  await expect(membershipPage.toastSuccess).toBeVisible({ timeout: 10000 });
  await takeScreenshot(page, $testInfo, "Success Toast Appeared");
});
