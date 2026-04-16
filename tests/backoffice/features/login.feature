Feature: Backoffice Login

  Scenario: Successful login to Backoffice
    Given I am on the Backoffice login page
    When I login with valid admin credentials
    Then I should be redirected to the Backoffice dashboard
