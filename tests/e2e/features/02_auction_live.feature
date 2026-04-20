Feature: Auction Live Flow

  Scenario: Parallel Auction Session - Conductor and Buyer

    # ── Step 1: Parallel Login ─────────────────────────────────────────────────
    When conductor and buyer login in parallel
    Then conductor should be on the auction list page
    And buyer should be on the auction lane page

    # ── Step 2: Start & Join Auction ──────────────────────────────────────────
    When conductor starts the auction
    And buyer joins the auction

    # ── Step 3: Enable Bidding ────────────────────────────────────────────────
    When conductor enables bidding

    # ── Step 4: Buyer Bid ─────────────────────────────────────────────────────
    When buyer places a bid
    Then bid price should be updated on both sides

    # ── Step 5: Conductor Countdown & Sold (Lot 1) ───────────────────────────
    When conductor starts countdown
    Then buyer should see bid success
    And conductor clicks sold
    And buyer closes winner notification

    # ── Step 6: Next Lot (Lot 2) ──────────────────────────────────────────────
    When conductor moves to next lot
    And conductor enables bidding
    And buyer places a bid
    Then bid price should be updated on both sides
    When conductor starts countdown
    Then buyer should see bid success
    And conductor clicks sold
    And buyer closes winner notification
