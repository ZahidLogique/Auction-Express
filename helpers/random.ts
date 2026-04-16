/**
 * Helper untuk generate data test yang realistis dan unik.
 * Nomor di belakang username memastikan tidak ada duplikat.
 */

const firstNames = ["Alex", "Jordan", "Morgan", "Chris", "Jamie", "Sam", "Taylor", "Riley", "Casey", "Drew"];
const lastNames  = ["Smith", "Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Anderson", "Thomas"];

export interface UserData {
  username: string;
  fullName: string;
  email:    string;
  position: string;
  phone:    string;
  password: string;
}

function randDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

export interface MembershipData {
  firstName:  string;
  lastName:   string;
  taxId:      string;
  email:      string;
  phone:      string;
  mobile:     string;
  road:       string;
  postalCode: string;
}

export function generateMembership(): MembershipData {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last  = lastNames[Math.floor(Math.random() * lastNames.length)];
  const num   = Math.floor(Math.random() * 900) + 100;

  return {
    firstName:  first,
    lastName:   last,
    taxId:      randDigits(12),
    email:      `${first.toLowerCase()}${last.toLowerCase()}${num}@testmbr.com`,
    phone:      `021${randDigits(8)}`,
    mobile:     `0812${randDigits(8)}`,
    road:       `Jl. Test Road ${num}`,
    postalCode: `${randDigits(5)}`,
  };
}

export function generateUser(): UserData {
  const first  = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last   = lastNames[Math.floor(Math.random() * lastNames.length)];
  const num    = Math.floor(Math.random() * 900) + 100; // 100–999

  const username = `${first.toLowerCase()}${last.toLowerCase()}${num}`;
  const fullName = `${first} ${last}`;
  const email    = `${username}@testuser.com`;

  return {
    username,
    fullName,
    email,
    position: "QA Engineer",
    phone:    `021${randDigits(8)}`,        // e.g. 02134567890
    password: `Test@${randDigits(4)}`,      // e.g. Test@1234
  };
}
