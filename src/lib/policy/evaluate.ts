import type { BankPolicy, FinancialProfile, PolicyCheck } from "../domain/types";
import { formatNaira, formatPercent } from "../format";

/**
 * Policy evaluation: applies the bank's configured lending rules to an assessment.
 * Separate from analysis (what the data says) and from the recommendation (what to do),
 * so a policy change re-scores eligibility without touching either.
 */
export function evaluatePolicy(
  policy: BankPolicy,
  profile: FinancialProfile,
  score: number,
  eligibleAmount: number,
  projectedDscr: number,
): PolicyCheck[] {
  return [
    {
      label: "Minimum assessment score",
      passed: score >= policy.minAssessmentScore,
      detail: `Score ${score} against configured minimum of ${policy.minAssessmentScore}.`,
    },
    {
      label: "Debt-service coverage",
      passed: projectedDscr >= policy.eligibility.targetDscr,
      detail: `Projected cover of ${projectedDscr.toFixed(2)}× on the recommended amount against a target of ${policy.eligibility.targetDscr.toFixed(2)}×.`,
    },
    {
      label: "Existing debt-service ratio",
      passed: profile.debtServiceRatio <= policy.eligibility.maxDebtServiceRatio,
      detail: `Existing debt service is ${formatPercent(profile.debtServiceRatio)} of net monthly flow (limit ${formatPercent(policy.eligibility.maxDebtServiceRatio)}).`,
    },
    {
      label: "Within bank maximum",
      passed: eligibleAmount <= policy.maxLoanAmount,
      detail: `Eligibility ${formatNaira(eligibleAmount)} against maximum ${formatNaira(policy.maxLoanAmount)}.`,
    },
    {
      label: "Minimum lending amount",
      passed: eligibleAmount >= policy.minLoanAmount,
      detail: `Eligibility ${formatNaira(eligibleAmount)} against minimum ${formatNaira(policy.minLoanAmount)}.`,
    },
    {
      label: "Transaction coverage",
      passed: profile.coverageMonths >= 6,
      detail: `${profile.coverageMonths} months of transaction history available (minimum 6).`,
    },
  ];
}
