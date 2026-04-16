# Test Order Configuration

Dokumen ini menjelaskan cara mengatur urutan eksekusi test di Playwright.

## Urutan Test (Prioritas)

Test diatur berdasarkan prioritas dan dependencies:

1. **Auth** (`tests/auth/`) - Authentication test harus dijalankan pertama
2. **Master** (`tests/master/`) - Master data (Country, Exporter, Role, User) - setup data dasar
3. **Trademark Management** (`tests/trademark-management/`) - Data master untuk application
4. **Certificate Management** (`tests/certificate-management/`) - Core business logic
   - Application
   - Evaluation
   - Approval Management
5. **Audit Log** (`tests/audit-log/`) - Monitoring/logging

## Cara Mengatur Urutan Test

### Metode 1: Menggunakan Prefix Angka pada Nama File (Recommended)

Rename file test dengan prefix angka untuk mengatur urutan:

```
tests/
├── 01-auth/
│   ├── 01-login-validation.spec.ts
│   └── 02-login-roles.spec.ts
├── 02-master/
│   ├── 01-country-crud.spec.ts
│   ├── 02-exporter/
│   │   └── exporter-crud.spec.ts
│   ├── 03-role-permission/
│   │   └── role-permission.spec.ts
│   └── 04-user-master/
│       └── user-crud.spec.ts
├── 03-trademark-management/
│   └── trademark-crud.spec.ts
├── 04-certificate-management/
│   ├── application/
│   │   ├── 01-application-create.spec.ts
│   │   ├── 02-application-list.spec.ts
│   │   └── 03-application-approve.spec.ts
│   ├── evaluation/
│   │   └── evaluation-list.spec.ts
│   └── approval-management/
│       └── approval-workflow.spec.ts
└── 05-audit-log/
    └── audit-log-list.spec.ts
```

### Metode 2: Menggunakan test.describe.serial()

Untuk test dalam satu file yang harus dijalankan secara sequential:

```typescript
test.describe.serial('Application CRUD', () => {
  test('create', async () => { ... });
  test('read', async () => { ... });
  test('update', async () => { ... });
  test('delete', async () => { ... });
});
```

### Metode 3: Menggunakan Playwright Projects

Di `playwright.config.ts`, kita bisa membuat multiple projects dengan urutan tertentu:

```typescript
projects: [
  {
    name: 'auth',
    testMatch: '**/auth/**/*.spec.ts',
  },
  {
    name: 'master',
    testMatch: '**/master/**/*.spec.ts',
    dependencies: ['auth'], // Harus setelah auth
  },
  {
    name: 'trademark',
    testMatch: '**/trademark-management/**/*.spec.ts',
    dependencies: ['master'],
  },
  // ... dst
]
```

## Menjalankan Test dengan Urutan Tertentu

### Menjalankan test per folder (sequential):

```bash
# Run auth tests first
npx playwright test tests/auth

# Then master
npx playwright test tests/master

# Then trademark
npx playwright test tests/trademark-management

# Then certificate management
npx playwright test tests/certificate-management

# Finally audit log
npx playwright test tests/audit-log
```

### Atau menggunakan script di package.json:

```json
{
  "scripts": {
    "test:ordered": "npm run test:auth && npm run test:master && npm run test:trademark && npm run test:certificate && npm run test:audit",
    "test:auth": "playwright test tests/auth",
    "test:master": "playwright test tests/master",
    "test:trademark": "playwright test tests/trademark-management",
    "test:certificate": "playwright test tests/certificate-management",
    "test:audit": "playwright test tests/audit-log"
  }
}
```

## Catatan

- Playwright secara default menjalankan test secara parallel untuk performa
- Untuk sequential execution, gunakan `fullyParallel: false` di config atau `test.describe.serial()`
- Urutan test file biasanya mengikuti alphabetical order, jadi prefix angka membantu

