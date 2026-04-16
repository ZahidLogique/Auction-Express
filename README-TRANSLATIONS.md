# Translation Helper untuk Playwright Tests

Dokumen ini menjelaskan cara menggunakan translation helper untuk memastikan test menggunakan teks yang sesuai dengan aplikasi.

## Struktur Translation

Translation helper (`helpers/translations.ts`) berisi semua teks yang digunakan di aplikasi berdasarkan file translation di `resources/lang/en/`.

## Cara Menggunakan

### Import Translation Helper

```typescript
import { translations, getTranslation } from '../helpers/translations';
```

### Menggunakan Translation di Test

```typescript
// Direct access
const emptyMessage = translations.applications.empty; // 'No applications found.'

// Atau menggunakan helper function
const emptyMessage = getTranslation('applications.empty');

// Di Page Object
const emptyState = page.getByText(translations.applications.empty);
```

### Contoh Penggunaan di Page Object

```typescript
// pages/ApplicationPage.ts
import { translations } from '../helpers/translations';

export class ApplicationPage {
  constructor(page: Page) {
    this.createButton = page.getByRole('button', { 
      name: translations.applications.createButton 
    });
    this.searchInput = page.getByPlaceholder(
      translations.applications.searchPlaceholder
    );
  }
  
  getEmptyState(): Locator {
    return this.page.getByText(translations.applications.empty);
  }
}
```

### Contoh Penggunaan di Test

```typescript
// tests/certificate-management/application/application-list.spec.ts
import { translations } from '../../../helpers/translations';

test('should show empty state when no applications', async ({ page }) => {
  // ... search dengan keyword yang tidak ada
  
  const emptyState = page.getByText(translations.applications.empty);
  await expect(emptyState).toBeVisible();
});
```

## Translation yang Tersedia

### Applications
- `applications.empty` - 'No applications found.'
- `applications.createButton` - 'Create'
- `applications.searchPlaceholder` - '認定店名称'
- `applications.status.*` - Status labels
- `applications.messages.*` - Success messages

### Trademark Management
- `trademark_management.empty` - 'No trademarks found.'
- `trademark_management.createButton` - 'Create'
- `trademark_management.searchPlaceholder` - 'Search...'
- `trademark_management.messages.*` - Success messages

### Countries
- `countries.empty` - 'No countries found.'
- `countries.createButton` - 'Create'
- `countries.searchPlaceholder` - 'Search country...'
- `countries.messages.*` - Success messages

### Audit Log
- `audit_log.empty` - '監査ログが見つかりません。'
- `audit_log.emptyAlt` - '監査ログはありません。'
- `audit_log.searchPlaceholder` - 'イベント / モデル / ユーザーを検索'

### Exporters
- `exporters.empty` - 'No exporters found.'
- `exporters.createButton` - 'Create'
- `exporters.searchPlaceholder` - 'Search exporter...'
- `exporters.messages.*` - Success messages

### Role & Permission
- `role_permission.empty` - 'No roles found.'
- `role_permission.createButton` - 'Create'
- `role_permission.searchPlaceholder` - 'Search role...'
- `role_permission.messages.*` - Success messages

### Common
- `common.buttons.*` - Common button labels
- `common.validation.*` - Validation messages

## Update Translation

Jika ada perubahan di file translation aplikasi (`resources/lang/en/*.php`), update juga di `helpers/translations.ts` untuk menjaga konsistensi.

## Best Practices

1. **Selalu gunakan translation helper** - Jangan hardcode teks di test
2. **Update translation helper** - Jika ada perubahan di aplikasi, update helper juga
3. **Gunakan getTranslation()** - Untuk dynamic key access
4. **Document new translations** - Jika menambah translation baru, dokumentasikan di file ini

