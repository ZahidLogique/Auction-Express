Feature: Auction Management - Backoffice

  # ──────────────────────────────────────────────────────────────────────────
  # TC-AUC-001: Create Auction Calendar & Add Vehicle
  # ──────────────────────────────────────────────────────────────────────────
  @TC-AUC-001
  Scenario: TC-AUC-001: Admin membuat Auction Calendar hari ini dan menambahkan kendaraan

    # 1. Masuk halaman Auction
    Given saya berada di halaman daftar Auction Calendar

    # 2. Buka form create
    When saya membuka form Create Auction Calendar

    # 3. Isi form dengan jadwal hari ini jam 06:00
    And saya mengisi form auction dengan jadwal hari ini jam 06:00

    # 4. Simpan
    And saya menyimpan auction
    Then seharusnya auction berhasil dibuat

    # 5. Cari auction yang baru dibuat
    When saya membuka detail auction yang telah dibuat

    # 6 & 7. Tambahkan kendaraan ke auction
    And saya menambahkan kendaraan ke dalam auction
    Then kendaraan seharusnya berhasil ditambahkan ke dalam auction
