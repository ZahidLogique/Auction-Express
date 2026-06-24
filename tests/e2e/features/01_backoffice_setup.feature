Feature: Full E2E Auction Regression

  Scenario: Complete Auction Life Cycle

    Given I am on the Backoffice login page
    When I login with valid admin credentials

    # ── 1. Buat Auction Session ───────────────────────────────────────────────
    And I create a new auction session

    # ── 2. Assign vehicles & publish ─────────────────────────────────────────
    And I assign the vehicles to the auction session
    And I publish the auction session
