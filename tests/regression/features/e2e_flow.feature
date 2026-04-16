Feature: Full E2E Auction Regression

  Scenario: Complete Auction Life Cycle

    # ── 1. Add Mobil Baru (Backend) ────────────────────────────────────────────
    Given I am on the Backoffice login page
    When I login with valid admin credentials
    And I add a new vehicle for testing

    # ── 2. Buat Auction (Backend) ──────────────────────────────────────────────
    # And I create a new auction session

    # ── 3. Assign mobil & publish (Backend) ───────────────────────────────────
    # And I assign the new vehicle to the auction session
    # And I publish the auction session

    # ── 4. Login customer & conductor ─────────────────────────────────────────
    # Given I am on the FE Auction login page
    # When I login with valid customer credentials
    # Then I should be ready to bid in the auction

    # Given I am on the FE Conductor login page
    # When I login with valid conductor credentials
    # Then I should be ready to manage the auction

    # ── 5. Simulasi lelang ─────────────────────────────────────────────────────
    # When the conductor starts the auction for lot 1
    # And the customer places a bid on lot 1
    # And the conductor accepts the bid and moves to the next lot
    # And the customer places a bid on lot 2

    # ── 6. End auction & verifikasi ────────────────────────────────────────────
    # When the conductor ends the auction session
    # Then the auction status should be completed
    # And the transaction should be recorded in Backoffice
