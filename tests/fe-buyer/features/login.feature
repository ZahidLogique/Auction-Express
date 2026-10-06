Feature: FE Buyer Login

  Scenario: TC-BUY-001: Successful login to FE Buyer (Auction)
    Given I am on the FE Auction login page
    When I login to FE Auction with valid admin credentials
    Then I should be redirected to the FE Auction dashboard
