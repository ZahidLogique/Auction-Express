/**
 * Translation helper untuk Playwright tests
 * Berdasarkan file translation di resources/lang/en/
 */

export const translations = {
  applications: {
    empty: 'No applications found.',
    createButton: 'Create',
    searchPlaceholder: '認定店名称',
    status: {
      hold: 'Hold',
      reject: 'Reject',
      evaluation: 'Evaluation',
      approval: 'Approval',
      approved: 'Approved',
      done: 'Done',
    },
    messages: {
      created: 'Application has been created successfully.',
      updated: 'Application has been updated successfully.',
      deleted: 'Application has been deleted successfully.',
    },
  },
  trademark_management: {
    empty: 'No trademarks found.',
    createButton: 'Create',
    searchPlaceholder: 'Search...',
    messages: {
      created: 'Trademark has been created successfully.',
      updated: 'Trademark has been updated successfully.',
      deleted: 'Trademark has been deleted successfully.',
    },
  },
  countries: {
    empty: 'No countries found.',
    createButton: 'Create',
    searchPlaceholder: 'Search country...',
    messages: {
      created: 'Country has been created successfully.',
      updated: 'Country has been updated successfully.',
      deleted: 'Country has been deleted successfully.',
    },
  },
  audit_log: {
    empty: '監査ログが見つかりません。',
    emptyAlt: '監査ログはありません。', // Alternative text from DataTable emptyText
    searchPlaceholder: 'イベント / モデル / ユーザーを検索',
  },
  exporters: {
    empty: 'No exporters found.',
    createButton: 'Create',
    searchPlaceholder: 'Search exporter...',
    labels: {
      exporterName: '輸出', // Chinese label for exporter name
      exporterCode: 'Exporter Code',
    },
    messages: {
      created: 'Exporter has been created successfully.',
      updated: 'Exporter has been updated successfully.',
      deleted: 'Exporter has been deleted successfully.',
    },
  },
  role_permission: {
    empty: 'No roles found.',
    createButton: 'Create',
    searchPlaceholder: 'Search role...',
    labels: {
      roleName: '役割', // Japanese label for role name
      menuAccess: '権限',
    },
    messages: {
      created: 'Role has been created successfully.',
      updated: 'Role has been updated successfully.',
    },
  },
  common: {
    buttons: {
      create: 'Create',
      submit: 'Submit',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      confirm: 'Confirm',
      filter: 'Filter',
      reset: 'Reset',
      export: 'Export',
    },
    validation: {
      required: 'This field is required.',
      emailInvalid: 'Email format is invalid.',
    },
  },
};

/**
 * Get translation text by key path
 * Example: getTranslation('applications.empty')
 */
export function getTranslation(keyPath: string): string {
  const keys = keyPath.split('.');
  let value: any = translations;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return keyPath; // Return key path if not found
    }
  }

  return typeof value === 'string' ? value : keyPath;
}

