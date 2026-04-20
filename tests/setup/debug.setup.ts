import { test as setup } from "@playwright/test";

setup("debug locators", async ({ page }) => {
  const apps = [
    { name: 'Auction', url: process.env.FE_AUCTION_URL! },
    { name: 'Conductor', url: process.env.FE_CONDUCTOR_URL! }
  ];

  for (const app of apps) {
    console.log(`\n--- Testing ${app.name} ---`);
    await page.goto(app.url);
    await page.waitForLoadState('networkidle');

    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.innerText.trim(),
        type: b.getAttribute('type'),
        isVisible: b.offsetWidth > 0 && b.offsetHeight > 0,
        html: b.outerHTML
      }));
    });
    console.log('Buttons found:', JSON.stringify(buttons, null, 2));

    const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => f.outerHTML);
    });
    console.log('Forms found:', forms);
  }
});
