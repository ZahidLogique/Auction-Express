import fs from "fs";
import path from "path";

const STATE_FILE = path.join(__dirname, "..", ".test-state.json");

export interface TestState {
  [key: string]: unknown;
}

export function loadState(): TestState {
  if (!fs.existsSync(STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
}

export function saveState(data: Partial<TestState>): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...loadState(), ...data }, null, 2));
}
