/**
 * Test Order Configuration — TTA Backoffice
 *
 * Mengatur urutan eksekusi test berdasarkan dependency antar modul.
 *
 * Urutan:
 * 1. Auth          — Login/logout, harus jalan pertama (setup session)
 * 2. Master        — Data master (User, Role, dsb) sebagai prerequisite modul lain
 * 3. [modul lain]  — Menyusul sesuai scope yang ditentukan
 */

export const testOrder = {
  folders: [
    'login',  // 1. Login — unauthenticated, fresh session
    'user',   // 2. User Management — authenticated
  ],

  files: {
    login: [
      'login.feature',  // TC-LOGIN-001
    ],
    user: [
      'user.feature',   // TC-USER-001
    ],
  },
};

/**
 * Kembalikan daftar file test sesuai urutan prioritas
 */
export function getTestFilesInOrder(): string[] {
  const files: string[] = [];

  for (const folder of testOrder.folders) {
    const folderFiles = testOrder.files[folder as keyof typeof testOrder.files];

    if (Array.isArray(folderFiles)) {
      for (const file of folderFiles) {
        files.push(`tests/${folder}/${file}`);
      }
    }
  }

  return files;
}
