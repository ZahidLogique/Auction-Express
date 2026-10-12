Feature: Auction Live Flow

  Scenario: E2E-002: Parallel Auction Session - Conductor and Buyer

    # ── Step 1: Parallel Login ─────────────────────────────────────────────────
    When conductor and buyer login in parallel
    Then conductor should be on the auction list page
    And buyer should be on the auction lane page

    # ── Step 2: Start & Join Auction ──────────────────────────────────────────
    When conductor starts the auction
    And buyer joins the auction

    # ── Lot 1: bid dasar, broadcast, pesan, reserved price tercapai ───────────
    When conductor enables bidding
    And conductor broadcasts a message
    And buyer places a bid
    And buyer sends a message
    Then bid price should be updated on both sides
    And broadcast and message should be delivered
    And reserved price should be reached
    When conductor starts countdown
    Then conductor clicks unsold

    # ── Lot 2: bid bertahap +2000 lalu +5000 (reserved price belum -> sudah tercapai) ─
    When conductor moves to next lot
    And conductor enables bidding
    And buyer joins bidding
    And buyer offers 2000
    Then bid price should be 102000 on both sides
    And reserved price should not be reached
    When buyer offers 5000
    Then bid price should be 107000 on both sides
    And reserved price should be reached
    When conductor starts countdown
    Then conductor clicks unsold

    # ── Lot 3: Reset Price (+ pasang proxy bid untuk lot 4) ───────────────────
    When conductor moves to next lot
    And conductor enables bidding
    And buyer joins bidding
    And buyer sets a proxy bid of 110000 on the next lot
    And buyer offers 5000
    Then bid price should be 105000 on both sides
    When conductor resets the price
    Then the price should be reset to the starting price
    When conductor enables bidding
    And buyer joins bidding
    And buyer offers 5000
    Then bid price should be 105000 on both sides
    When conductor starts countdown
    Then conductor clicks unsold

    # ── Lot 4: Proxy bid (buyer tidak menawar manual) ─────────────────────────
    When conductor moves to next lot
    Then the proxy bid should be registered for the lot
    When conductor enables bidding
    Then the proxy bid should auto-bid up to the reserved price
    When conductor starts countdown
    Then conductor clicks unsold

    # ── Lot 5: Sold, hasil lelang, dan payment ────────────────────────────────
    When conductor moves to next lot
    And conductor enables bidding
    And buyer places a bid
    Then bid price should be updated on both sides
    When conductor starts countdown
    Then conductor clicks sold
    And the sale result should be shown on both sides
    When conductor continues after the sale
    Then the sold lot should be listed with the final price

    # ── End Auction & Cleanup ─────────────────────────────────────────────────
    When conductor ends the auction
    Then the payment should be created for the sold vehicle
    When backoffice resets sold vehicle
