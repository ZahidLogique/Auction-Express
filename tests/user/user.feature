@user-management
Feature: AX Backoffice - User Management
  Sebagai admin AX
  Saya ingin dapat mengelola data user di sistem
  Agar akses ke backoffice dapat dikontrol dengan baik

  @TC-USER-001
  Scenario: TC-USER-001: Berhasil membuat user baru dengan data lengkap
    Given saya berada di halaman User Management
    When saya membuka form tambah user baru
    And saya mengisi form dengan data user yang valid dan role Admin
    And saya menyimpan data user
    Then seharusnya muncul notifikasi sukses pembuatan user

  @TC-USER-002
  Scenario: TC-USER-002: Berhasil membaca data user yang telah dibuat
    Given saya telah membuat user baru dan berada di halaman User Management
    When saya mencari user dengan username yang telah dibuat
    Then data user seharusnya tampil di tabel dengan informasi yang benar

  @TC-USER-003
  Scenario: TC-USER-003: Berhasil mengubah data user
    Given saya telah membuat user baru dan berada di halaman User Management
    When saya mencari user dengan username yang telah dibuat
    And saya membuka form edit user tersebut
    And saya mengubah full name user menjadi data baru
    And saya menyimpan perubahan data user
    Then seharusnya muncul notifikasi sukses perubahan data user

  @TC-USER-004
  Scenario: TC-USER-004: Berhasil menghapus user
    Given saya telah membuat user baru dan berada di halaman User Management
    When saya mencari user dengan username yang telah dibuat
    And saya menghapus user tersebut
    Then seharusnya muncul notifikasi sukses penghapusan user
    And user tidak lagi tampil di tabel
