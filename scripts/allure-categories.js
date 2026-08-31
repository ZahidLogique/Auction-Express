const fs = require("fs");
const path = require("path");

const resultsDir = path.join(__dirname, "..", "allure-results");

if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const categories = [
  {
    name: "Server / Network Errors",
    description: "Server 5xx, timeout, or connection refused errors",
    matchedStatuses: ["broken", "failed"],
    messageRegex: ".*(?:net::ERR|ECONNREFUSED|50[0-9]|Server error|Target page.*closed|navigation to finish).*",
  },
  {
    name: "Element Not Found / Timeout",
    description: "Locator timeout — element not visible or not found in the page",
    matchedStatuses: ["broken", "failed"],
    messageRegex: ".*(?:Timeout \\d+ms exceeded|waitFor:.*Timeout).*",
  },
  {
    name: "Assertion Failures",
    description: "Test assertion did not match expected value",
    matchedStatuses: ["broken", "failed"],
    messageRegex: ".*(?:expect\\(.*\\)\\.to|toBe\\(|toEqual\\(|toBeEnabled|toBeVisible|toHaveURL).*",
  },
];

fs.writeFileSync(
  path.join(resultsDir, "categories.json"),
  JSON.stringify(categories, null, 2)
);
console.log("[Allure] categories.json written");
