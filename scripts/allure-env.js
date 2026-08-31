const fs = require("fs");
const os = require("os");
const path = require("path");

try { require("dotenv").config({ path: path.join(__dirname, "..", ".env") }); } catch {}

const resultsDir = path.join(__dirname, "..", "allure-results");

if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const env = {
  Browser: "Google Chrome (Chromium)",
  "Backoffice URL": process.env.BACKOFFICE_URL || "-",
  "Auction URL": process.env.FE_AUCTION_URL || "-",
  "Conductor URL": process.env.FE_CONDUCTOR_URL || "-",
  OS: `${os.type()} ${os.release()}`,
  "Node.js": process.version,
  Platform: os.platform(),
  Tester: process.env.ADMIN_USER || os.userInfo().username,
  "Run Date": new Date().toISOString().split("T")[0],
  "Run Time": new Date().toLocaleTimeString("en-US", { hour12: false }),
};

const content = Object.entries(env)
  .map(([k, v]) => `${k}=${v}`)
  .join("\n");

fs.writeFileSync(path.join(resultsDir, "environment.properties"), content);
console.log("[Allure] environment.properties written");
