Testing the Healing Factor Tracker

  1. Prerequisites in your dev DB

  You need at least one approved BV request with patient initials. If you don't have one:
  - Sign in as a provider, submit a BV request (set wound type, mark diabetic true to test the DFU benchmark).
  - Sign in as admin/clinic-staff and approve it.

  For the alternatives panel to populate, the BV's insurance must exist in the insurances table and have an entry in insurance_routing
  pointing at a manufacturer with products that have both pay_rate_per_cm2 and cost_per_cm2 set.

  2. Open the tab

  - Sign in as admin or clinic_staff.
  - Go to the dashboard → Healing Tracker tab.

  Expect:
  - 4 benchmark cards: DFU 50%@wk4, VLU 40%@wk4, Pressure 10%/wk, MOHS tracked-only.
  - A "Record Wound Measurement" form: patient dropdown (only approved BVs), cm² input, date (defaults today), submit button.
  - "Wound Cases" table — initially each approved BV appears with Tracking status (no measurements yet) and 0/10 apps.

  3. Walk the happy path

  Step A — Baseline
  - Pick a DFU patient. Enter 10 cm². Date = 4 weeks ago (e.g. 2026-03-16).
  - Submit. Expect: green "Measurement recorded" + table refresh.
  - Row should now show: Baseline 10.0 cm², Current 10.0 cm², Reduction —, Status Tracking (only 1 measurement).

  Step B — On-track follow-up
  - Same patient. Enter 4 cm². Date = today.
  - Expect: Reduction 60%, Weeks 4.0, Target 50%, Status badge On Track (green).

  Step C — Flip to below-target
  - Same patient. Enter 8 cm² for today.
  - Expect: Reduction 20%, Status badge Below Target (red).
  - A "Patients Not Meeting Healing Benchmark" panel appears at the bottom listing this patient.

  Step D — Drill down
  - Click View on the row (or "View alternatives" in the alerts panel).
  - Expect: expandable row with two columns:
    - Measurement History — list of all 3 entries, oldest tagged (baseline).
    - Higher-margin alternatives — up to 3 products from the routed manufacturer, sorted by $/cm² margin desc. Empty if no insurance
  routing/products configured.

  Step E — Application counter
  - If the BV has any order_products with status shipped or completed, the Apps column shows that count /10. Otherwise 0/10.

  4. Filter & edge cases

  - Click the Below Target / Pending / On Track / Tracking filter chips above the table — table should narrow.
  - Pending case: enter a baseline + a follow-up only 1 week apart with insufficient reduction → status Pending (amber), since weeksElapsed
   < 4.
  - MOHS or "burn" wound type → always Tracking (no benchmark applies).

  5. Auth check

  - Sign in as a provider and hit GET /api/healing-tracker directly (or via dev tools). Expect 403 Access denied — this iteration is
  admin/clinic-staff only.

  What can go wrong

  - Empty patient dropdown → no approved BVs in the DB. Approve one first.
  - Submit fails with "BV must be approved" → BV is still pending/rejected.
  - Empty alternatives panel → either the BV's insurance string doesn't match an insurances.name row, or there's no insurance_routing
  entry, or matched products have null pay/cost rates. Check those tables.
  - Wrong benchmark applied → the BV's wound_type is generic ("ulcer") and diabetic is false, so it falls back to VLU (40%). Set
  diabetic=true for DFU.