@login
Feature: AX Backoffice - Login
  Sebagai pengguna backoffice AX
  Saya ingin dapat masuk ke sistem menggunakan kredensial yang valid
  Agar saya dapat mengakses fitur-fitur yang tersedia

  @TC-LOGIN-001
  Scenario: TC-LOGIN-001: Login dengan kredensial valid
    Given saya berada di halaman login AX
    When saya memasukkan username dan password yang valid
    And saya klik tombol Sign In
    Then saya seharusnya diarahkan ke halaman dashboard
