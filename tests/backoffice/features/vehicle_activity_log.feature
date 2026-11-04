Feature: Floating action bar dan Activity Log kendaraan - Backoffice (AE-487)

  # ──────────────────────────────────────────────────────────────────────────
  # TC-ACT-001: Detail page — bar tombol melayang
  # ──────────────────────────────────────────────────────────────────────────
  @TC-ACT-001 @AE-487
  Scenario: TC-ACT-001: Detail page menampilkan bar tombol melayang yang tetap terlihat saat scroll
    Given saya memiliki kendaraan uji baru untuk pengecekan activity log
    When saya membuka halaman detail kendaraan uji tersebut
    Then bar tombol di halaman detail seharusnya berisi tombol Back, Activity Log, Admin Check, dan Edit
    And bar tombol seharusnya tetap terlihat saat halaman di-scroll ke bawah dan kembali ke atas

  # ──────────────────────────────────────────────────────────────────────────
  # TC-ACT-002: Edit page — bar tombol melayang tanpa Admin Check
  # ──────────────────────────────────────────────────────────────────────────
  @TC-ACT-002 @AE-487
  Scenario: TC-ACT-002: Edit page menampilkan bar tombol melayang tanpa Admin Check yang tetap terlihat saat scroll
    Given saya memiliki kendaraan uji baru untuk pengecekan activity log
    When saya membuka halaman edit kendaraan uji tersebut
    Then bar tombol di halaman edit seharusnya berisi tombol Cancel, Activity Log, dan Save
    And bar tombol di halaman edit seharusnya tidak berisi tombol Admin Check
    And bar tombol seharusnya tetap terlihat saat halaman di-scroll ke bawah dan kembali ke atas

  # ──────────────────────────────────────────────────────────────────────────
  # TC-ACT-007: Activity Log dibuka dari Detail page
  # ──────────────────────────────────────────────────────────────────────────
  @TC-ACT-007 @AE-487
  Scenario: TC-ACT-007: Activity Log dibuka dari Detail page dan menampilkan filter
    Given saya memiliki kendaraan uji baru untuk pengecekan activity log
    When saya membuka halaman detail kendaraan uji tersebut
    And saya menekan tombol Activity Log di bar tombol
    Then panel Activity Log seharusnya terbuka dengan filter tanggal, User, Field Changed, serta tombol Filter dan Clear
    And panel Activity Log seharusnya menampilkan daftar entri atau pesan kosong tanpa pesan gagal memuat
