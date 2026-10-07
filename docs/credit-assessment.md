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

## Eligibility (policy-driven)

```
eligible = min(policy.maxLoanAmount,
               round500k(annualNetFlow × policy.eligibility.capacityRatio × score/100 − 0.25 × existingObligations))
recommended = round500k(eligible × policy.eligibility.recommendedShare)
```

Repayment window = strongest 3-day recurring inflow window; recommended repayment day = window start + 1.

## Policy evaluation

`evaluatePolicy` applies the bank's configured rules: minimum score, maximum debt-service ratio, bank maximum and minimum amounts, minimum transaction coverage. Results are shown as pass/review checks and feed the recommendation.

## Decision support

`DecisionSupportService.analyse` returns risk observations, repayment observations and a recommendation (approve / review / decline) with confidence. It never changes application state. Officers see the recommendation beside the evidence and remain responsible for the decision.

## Seeded result for Adebayo Foods Ltd

Running `npm run calibrate` reproduces the seeded analysis: avg inflow ≈ ₦6.8m, outflow ≈ ₦4.0m, net ≈ ₦2.8m, revenue CV ≈ 0.12 (High consistency), window 22nd–24th, score **82 / 100 (Strong)**, eligibility **₦18.5m**, recommended **₦12.0m** over 6 months, with *Existing obligations* rated Moderate.

## Production model

Replace the engine behind the same `CreditAssessment` output. Requirements: model governance and validation, bias testing, versioning recorded on each assessment (`modelVersion`), monitoring of score drift, challenger models, and the ability to run without the external model (fall back to the deterministic engine with reduced confidence).
