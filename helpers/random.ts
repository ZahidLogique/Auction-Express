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

// ── Vehicle Data ─────────────────────────────────────────────────────────────

export interface VehicleData {
  licensePlate:  string;
  province:      string;
  seller:        string;  // "Customer Name" di form create
  brand:         string;
  groupType:     string;  // "Model" di form create
  subModel?:     string;  // "Sub Model" → type_id (opsional)
  color:         string;  // color_id → Select2
  transmission:  string;  // car_transmission → Select2: AT | MT
  fuel:          string;  // fuel_id → Select2: Benzine | Diesel | etc.
  drive:         string;  // drive_description → Select2: FWD | RWD | 4WD
  manufactYear:  string;  // car_man_year → 4 digit year
  mileage:       string;  // car_mileage → angka
  engineNo:      string;  // car_enging_no → text
  vin:           string;  // car_vin → text
}

/**
 * Generate data test kendaraan IMS baru.
 * Nomor polisi menggunakan prefix "TST" + 4 digit acak agar mudah diidentifikasi sebagai data test.
 */
export function generateVehicle(): VehicleData {
  const num = randDigits(4);
  return {
    licensePlate:  `TST${num}`,        // contoh: TST3847
    province:      "Bangkok",          // ada di dropdown province
    seller:        "Alberto Spencer",  // nama Inggris → mudah di-search di Select2
    brand:         "Honda",            // brand yang pasti ada
    groupType:     "Brio",             // model Honda yang terlihat di data list
    color:         "White",
    transmission:  "AT",
    fuel:          "Benzine",
    drive:         "FWD",
    manufactYear:  "2020",
    mileage:       "20000",
    engineNo:      `ENG${randDigits(8)}`,
    vin:           `VIN${randDigits(10)}`,
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
