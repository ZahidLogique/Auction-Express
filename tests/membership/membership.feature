@membership-management
Feature: AX Backoffice - Membership Management
  Sebagai admin AX
  Saya ingin dapat mengelola data membership di sistem
  Agar data customer dapat terdaftar dan terkelola dengan baik

  @TC-MBR-001
  Scenario: TC-MBR-001: Berhasil membuat membership baru dengan tipe Individual
    Given saya berada di halaman Membership Management
    When saya membuka form tambah membership baru
    And saya mengisi form membership dengan data Individual yang valid
    And saya menyimpan data membership
    Then seharusnya muncul notifikasi sukses pembuatan membership
