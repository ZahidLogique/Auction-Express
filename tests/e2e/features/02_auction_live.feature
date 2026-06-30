Feature: Auction Live Flow

  Scenario: Parallel Auction Session - Conductor and Buyer

    # ── Step 1: Parallel Login ─────────────────────────────────────────────────
    When conductor and buyer login in parallel
    Then conductor should be on the auction list page
    And buyer should be on the auction lane page

    # ── Step 2: Start & Join Auction ──────────────────────────────────────────
    When conductor starts the auction
    And buyer joins the auction

    # ── Lot 1 ─────────────────────────────────────────────────────────────────
    When conductor enables bidding
    And conductor broadcasts a message
    And buyer places a bid
    And buyer sends a message
    Then bid price should be updated on both sides
    When conductor starts countdown
    Then conductor clicks unsold

    # ── Lot 2 ─────────────────────────────────────────────────────────────────
    When conductor moves to next lot
    And conductor enables bidding
    And buyer places a bid
    Then bid price should be updated on both sides
    When conductor starts countdown
    Then conductor clicks unsold

    # ── Lot 3 ─────────────────────────────────────────────────────────────────
    When conductor moves to next lot
    And conductor enables bidding
    And buyer places a bid
    Then bid price should be updated on both sides
    When conductor starts countdown
    Then conductor clicks unsold

    # ── Lot 4 ─────────────────────────────────────────────────────────────────
    When conductor moves to next lot
    And conductor enables bidding
    And buyer places a bid
    Then bid price should be updated on both sides
    When conductor starts countdown
    Then conductor clicks unsold

    # ── Lot 5 ─────────────────────────────────────────────────────────────────
    When conductor moves to next lot
    And conductor enables bidding
    And buyer places a bid
    Then bid price should be updated on both sides
    When conductor starts countdown
    Then conductor clicks sold

    # ── End Auction ───────────────────────────────────────────────────────────
    When conductor ends the auction
    And backoffice resets sold vehicle
