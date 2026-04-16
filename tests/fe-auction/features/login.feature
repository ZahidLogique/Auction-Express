Feature: FE Auction Login

  Scenario: Successful login to FE Auction
    Given I am on the FE Auction login page
    When I login to FE Auction with valid admin credentials
    Then I should be redirected to the FE Auction dashboard
