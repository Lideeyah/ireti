import type { BankPolicy, FinancialProfile, PolicyCheck } from "../domain/types";
import { formatNaira, formatPercent } from "../format";

/**
 * Policy evaluation: applies configured bank rules to an assessment result.
 * This layer is deliberately separate from analysis and from the recommendation.
 */
export function evaluatePolicy(
  policy: BankPolicy,
  profile: FinancialProfile,
  score: number,
  eligibleAmount: number,
): PolicyCheck[] {
  return [
    {
      label: "Minimum assessment score",
      passed: score >= policy.minAssessmentScore,
      detail: `Score ${score} against configured minimum of ${policy.minAssessmentScore}.`,
    },
    {
      label: "Debt-service ratio",
      passed: profile.debtServiceRatio <= policy.eligibility.maxDebtServiceRatio,
      detail: `Observed debt service is ${formatPercent(profile.debtServiceRatio)} of net monthly flow (limit ${formatPercent(policy.eligibility.maxDebtServiceRatio)}).`,
    },
    {
      label: "Eligible amount within bank maximum",
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
