# Auction Express — QA Automation

Proyek automation testing end-to-end menggunakan **Playwright** + **TypeScript** untuk aplikasi Auction Express Backoffice. Mengimplementasikan **Page Object Model (POM)**, screenshot otomatis di setiap critical step, dan **Allure Report** untuk pelaporan hasil test.

---

## Prasyarat

Pastikan sudah terinstall sebelum memulai:

| Tools | Versi | Keterangan |
|-------|-------|-----------|
| Node.js | 16+ | Runtime JavaScript |
| npm | — | Bundled bersama Node.js |
| Java | 8+ | Dibutuhkan untuk generate Allure Report |
| Git | — | Version control |

> Cek versi: `node -v` · `java -version`

---

## Instalasi

### 1. Clone repository

```bash
git clone <repository-url>
cd "Auction Express"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install Playwright browser

```bash
npx playwright install chromium
```

### 4. Setup environment variables

Salin `.env.example` menjadi `.env`, lalu isi nilainya:

```bash
cp .env.example .env
```

Isi file `.env`:

```env
BASE_URL=https://backoffice.ax-stg.lgq-stg.com/

APP_USERNAME=your_username
APP_PASSWORD=your_password

TEST_SEQUENTIAL=true
```

> File `.env` sudah di-ignore oleh Git. Jangan di-commit.

---

## Menjalankan Test

### Menggunakan npm scripts

```bash
# Jalankan semua test
npm test

# Jalankan test login saja
npm run test:login

# Generate + buka Allure Report (butuh Java)
npm run report

# Serve Allure Report langsung (butuh Java)
npm run report:serve
```

### Menggunakan Makefile

```bash
make test              # Jalankan semua test
make test:login        # Jalankan test login saja
make test-headed       # Jalankan dengan browser terlihat
make test-debug        # Mode debug (step-by-step)
make test-ui           # Mode UI interaktif Playwright
make report            # Generate + buka Allure Report
make report:serve      # Serve Allure Report
make clean             # Hapus semua hasil test dan report
make help              # Tampilkan semua perintah
```

### Menggunakan Playwright CLI

```bash
npx playwright test
npx playwright test tests/auth/login.spec.ts
npx playwright test --headed
npx playwright test --debug
npx playwright test --grep "TC-LOGIN-001"
```

---

## Screenshot

Setiap test case secara otomatis mengambil screenshot di setiap **critical step** dan menyimpannya di:

```
screenshots/
└── TC-LOGIN-001/
    ├── 01-login-page-loaded.png
    ├── 02-credentials-filled.png
    └── 03-dashboard-loaded.png
```

> Folder `screenshots/` akan **di-replace otomatis** setiap kali test dijalankan. Screenshot juga ter-attach langsung di dalam Allure Report.

---

## Allure Report

Allure Report memberikan tampilan hasil test yang profesional dan interaktif.

```bash
# Setelah test selesai, generate dan buka report:
npm run report

# Atau serve langsung tanpa generate dulu:
npm run report:serve
```

Report akan terbuka otomatis di browser. Di dalamnya tersedia:

- Ringkasan pass/fail per test case
- Detail setiap step beserta durasi
- Screenshot ter-embed di setiap step
- Statistik dan grafik hasil keseluruhan

---

## Struktur Proyek

```
Auction Express/
├── .auth/                       # Storage state session login (auto-generated)
├── allure-report/               # HTML report Allure (auto-generated)
├── allure-results/              # Raw data Allure (auto-generated)
├── data/                        # Data test (JSON)
│   └── login-data.json
├── helpers/
│   └── screenshot.ts            # Helper ambil screenshot & attach ke Allure
├── pages/                       # Page Object Models
│   └── LoginPage.ts
├── playwright-report/           # HTML report Playwright (auto-generated)
├── screenshots/                 # Screenshot per TC per step (auto-generated)
├── tests/
│   ├── auth/
│   │   └── login.spec.ts        # Test case login
│   └── setup/
│       └── auth.setup.ts        # Setup session autentikasi
├── .env                         # Environment variables (tidak di-commit)
├── .env.example                 # Template environment variables
├── global-setup.ts              # Clear folder screenshots sebelum test jalan
├── Makefile                     # Shortcut perintah test
├── package.json
├── playwright.config.ts
└── README.MD
```

---

## Test Cases

### Authentication — `tests/auth/login.spec.ts`

| TC ID | Deskripsi | Status |
|-------|-----------|--------|
| TC-LOGIN-001 | Login dengan kredensial valid | ✅ Active |

---

## Troubleshooting

**`BASE_URL` belum diset**
Pastikan file `.env` sudah ada dan berisi `BASE_URL` yang valid.

**Browser tidak terinstall**
Jalankan `npx playwright install chromium`.

**Test timeout saat login**
Cek koneksi internet dan pastikan `BASE_URL` dapat diakses.

**`allure` command not found**
Pastikan Java 8+ sudah terinstall. Cek dengan `java -version`.

**Report tidak terbuka**
Jalankan `npm run report:serve` sebagai alternatif.

---

## License

ISC
