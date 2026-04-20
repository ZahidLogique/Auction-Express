import fs from "fs";
import path from "path";

export default async function globalSetup() {
  // Clean screenshots folder
  const screenshotsDir = path.join(process.cwd(), "screenshots");
  if (fs.existsSync(screenshotsDir)) {
    fs.rmSync(screenshotsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(screenshotsDir, { recursive: true });

  // Clean allure-results agar report selalu fresh tiap run
  const allureResultsDir = path.join(process.cwd(), "allure-results");
  if (fs.existsSync(allureResultsDir)) {
    fs.rmSync(allureResultsDir, { recursive: true, force: true });
    console.log("🧹 allure-results cleaned");
  }
  fs.mkdirSync(allureResultsDir, { recursive: true });
}
