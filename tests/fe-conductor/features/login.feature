Feature: FE Conductor Login

  Scenario: TC-CON-001: Successful login to FE Conductor
    Given I am on the FE Conductor login page
    When I login to FE Conductor with valid admin credentials
    Then I should be redirected to the FE Conductor dashboard
