# Credit assessment

> **Demo credit assessment.** The engine in `src/lib/assessment/engine.ts` is a deterministic, configurable demonstration model. It is a proprietary assessment derived from connected-account data and is **not** a regulated credit-bureau score. A production model would be validated, monitored and governed by the bank.

## Inputs (from the FinancialProfile)

- Revenue consistency — coefficient of variation of monthly inflows, recent 3-month trend
- Cash-flow stability — share of cash-positive months, net margin on inflows
- Account activity — institutions connected, transactions per month
- Existing obligations — observed debt service ÷ net monthly flow; estimated outstanding ÷ annualised net flow
- Repayment capacity — observed payment consistency on existing facilities, headroom after debt service

Analysis uses recency weighting: the most recent three months count double when averaging inflows and outflows.

## Factors and weights (`ENGINE_CONFIG`)

| Factor | Weight |
|---|---|
| Revenue consistency | 25% |
| Cash-flow stability | 25% |
| Account activity | 10% |
| Existing obligations | 20% |
| Repayment capacity | 20% |

Each factor scores 0–100 and is rated Strong (≥70), Moderate (≥45) or Weak, with a plain-language **evidence** sentence derived from the actual figures. The overall score is the weighted sum; bands are Strong (≥75), Moderate (≥55), Weak.

## Eligibility: two ceilings, the lower wins

Eligibility is not a single formula. The engine computes two independent ceilings and
lends against whichever binds, then caps the result at the bank's maximum.

**1. Capacity ceiling** — a balance-sheet view of how much the business can carry.

```
annualNet      = avgNetMonthlyFlow × 12
capacity       = annualNet × policy.eligibility.capacityRatio × (score / 100)
                 − 0.25 × existingObligations
```

The score acts as a risk-adjusted scalar: a business scoring 82 may borrow against 82%
of the capacity a perfect-scoring business could.

**2. Affordability ceiling** — a cash-flow view of what the business can actually service.

```
freeCashFlow      = max(0, avgNetMonthlyFlow − monthlyDebtService)
volatilityHaircut = clamp(1 − cv × policy.eligibility.volatilitySensitivity, 0.5, 1)
trendHaircut      = clamp(1 + min(0, recentInflowChangePct), 0.6, 1)
maxInstalment     = (freeCashFlow / policy.eligibility.targetDscr)
                    × volatilityHaircut × trendHaircut
affordability     = presentValueOfAnnuity(maxInstalment, rate/12, longestAllowedTenor)
```

The affordability ceiling is the largest principal whose instalment still clears the
bank's target debt-service coverage, computed at the longest permitted tenor because
the borrower chooses the tenor. Two haircuts apply before that: revenue volatility, and
a declining recent trend. A business whose revenue is falling is lent less, automatically.

```
eligible    = round500k(min(capacity, affordability, policy.maxLoanAmount))
recommended = round500k(eligible × policy.eligibility.recommendedShare)
```

**Recommended tenor** is the shortest permitted tenor at which the recommended amount
still clears the cover target. A tight instalment lengthens the tenor rather than
shrinking the advance, which is what a credit officer would do by hand.

The assessment reports which ceiling bound it (`bindingConstraint`), both ceiling
values, free cash flow, the maximum serviceable instalment and the projected cover, so
an officer can see the reasoning rather than a number.

### Target cover

`targetDscr` defaults to 1.10, set for short-tenor working capital where the advance is
itself working in the business. Longer-term lending should raise it towards the
conventional 1.25. Changing it in Lending policy re-prices every subsequent assessment.

## Policy evaluation

`evaluatePolicy` applies the bank's configured rules: minimum score, projected
debt-service coverage against target, existing debt-service ratio, bank maximum and
minimum amounts, and minimum transaction coverage. Results show as pass/review checks
and feed the recommendation.

## Decision support

`DecisionSupportService.analyse` returns risk observations, repayment observations and a recommendation (approve / review / decline) with confidence. It never changes application state. Officers see the recommendation beside the evidence and remain responsible for the decision.

## Seeded result for Adebayo Foods Ltd

Running `npm run calibrate` reproduces the seeded analysis: avg inflow ≈ ₦6.8m, outflow
≈ ₦4.0m, net ≈ ₦2.8m, revenue CV ≈ 0.12 (High consistency), window 22nd–24th, score
**82 / 100 (Strong)**.

| | |
|---|---|
| Capacity ceiling | ₦18.69m |
| Affordability ceiling | ₦21.94m |
| Binding constraint | Capacity |
| Eligible | **₦18.5m** |
| Recommended | **₦12.0m** over 6 months |
| Free cash flow | ₦2.36m / month |
| Max serviceable instalment | ₦2.01m |
| Projected cover | 1.12× against a 1.10× target |

`npm run seed:report` prints the same mechanism across the whole seeded portfolio: 17
businesses bound by capacity, 3 by affordability, and 3 policy exceptions.

## Production model

Replace the engine behind the same `CreditAssessment` output. Requirements: model governance and validation, bias testing, versioning recorded on each assessment (`modelVersion`), monitoring of score drift, challenger models, and the ability to run without the external model (fall back to the deterministic engine with reduced confidence).
