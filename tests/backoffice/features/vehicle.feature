Feature: IMS Vehicle Management - Backoffice

  # ──────────────────────────────────────────────────────────────────────────
  # TC-VEH-001: Create & Read — Admin membuat kendaraan baru lalu verifikasi di daftar
  # ──────────────────────────────────────────────────────────────────────────
  @TC-VEH-001
  Scenario: TC-VEH-001: Admin berhasil membuat kendaraan IMS baru dan data tampil di daftar
    Given saya telah membuat kendaraan baru dan berada di halaman daftar kendaraan
    When saya mencari kendaraan dengan nomor polisi yang telah dibuat
    Then data kendaraan seharusnya tampil di tabel dengan informasi yang benar
