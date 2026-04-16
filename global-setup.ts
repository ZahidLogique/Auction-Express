import fs from "fs";
import path from "path";

export default async function globalSetup() {
  const screenshotsDir = path.join(process.cwd(), "screenshots");

  if (fs.existsSync(screenshotsDir)) {
    fs.rmSync(screenshotsDir, { recursive: true, force: true });
  }

  fs.mkdirSync(screenshotsDir, { recursive: true });
}
