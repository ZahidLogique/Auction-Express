Feature: Backoffice Login

  Scenario: TC-LOG-001: Successful login to Backoffice
    Given I am on the Backoffice login page
    When I login with valid admin credentials
    Then I should be redirected to the Backoffice dashboard
