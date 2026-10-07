import type {
  AssessmentFactor,
  BankPolicy,
  CreditAssessment,
  FinancialProfile,
  Rating,
} from "../domain/types";
import { evaluatePolicy } from "../policy/evaluate";
import { formatNairaCompact, formatPercent } from "../format";
import { ordinal } from "../util/dates";
import { uid } from "../util/ids";
import { DEMO_DECISION_SUPPORT } from "../ai/decisionSupport";

export const MODEL_VERSION = "CA-2.4";

/**
 * Deterministic demo credit-assessment engine.
 *
 * This is a proprietary, configurable assessment derived from connected-account data.
 * It is NOT a regulated credit-bureau score and is labelled as such throughout the UI.
 * Weights and thresholds are held in ENGINE_CONFIG so a bank can tune them; a production
 * model would be connected behind the same CreditAssessment output shape.
 */
export const ENGINE_CONFIG = {
  weights: {
    revenueConsistency: 0.25,
    cashFlowStability: 0.25,
    accountActivity: 0.1,
    existingObligations: 0.2,
    repaymentCapacity: 0.2,
  },
  bands: { strong: 75, moderate: 55 },
};

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function rating(score: number): Rating {
  return score >= 70 ? "Strong" : score >= 45 ? "Moderate" : "Weak";
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

export function assessCredit(profile: FinancialProfile, policy: BankPolicy): CreditAssessment {
  const w = ENGINE_CONFIG.weights;

  // Revenue consistency: coefficient of variation of monthly inflows plus recent trend.
  const cv = profile.revenueCoefficientOfVariation;
  let revScore = clamp(100 - cv * 220);
  revScore = clamp(revScore + clamp(profile.recentInflowChangePct * 100, -10, 10));

  // Cash-flow stability: share of cash-positive months and net margin.
  const positiveShare = profile.positiveNetMonths / profile.coverageMonths;
  const margin = profile.avgMonthlyInflow ? profile.avgNetMonthlyFlow / profile.avgMonthlyInflow : 0;
  const cfScore = clamp(positiveShare * 60 + clamp(margin, 0, 0.5) * 80);

  // Account activity: breadth of institutions and transaction volume.
  const actScore = clamp(Math.min(profile.institutionsConnected, 3) * 16 + Math.min(profile.avgTransactionsPerMonth, 60) * 0.9);

  // Existing obligations: debt service relative to net flow, and outstanding relative to annual net.
  const annualNet = Math.max(profile.avgNetMonthlyFlow * 12, 1);
  const obligationLoad = profile.existingObligations / annualNet;
  const oblScore = clamp(100 - profile.debtServiceRatio * 200 - obligationLoad * 100);

  // Repayment capacity: observed payment consistency and headroom after debt service.
  const consistencyBase = profile.paymentConsistency === "Strong" ? 85 : profile.paymentConsistency === "Moderate" ? 60 : 30;
  const headroom = clamp((1 - profile.debtServiceRatio) * 100);
  const repScore = clamp(consistencyBase * 0.6 + headroom * 0.4);

  const factors: AssessmentFactor[] = [
    {
      key: "revenue_consistency",
      label: "Revenue consistency",
      score: Math.round(revScore),
      rating: rating(revScore),
      weight: w.revenueConsistency,
      evidence: `Monthly inflow varied by ${formatPercent(cv)} around its mean across ${profile.coverageMonths} months. The last three months averaged ${formatNairaCompact(profile.recentAvgInflow)}, ${profile.recentInflowChangePct >= 0 ? "up" : "down"} ${formatPercent(Math.abs(profile.recentInflowChangePct))} on the prior period, and remained within a narrow range.`,
    },
    {
      key: "cash_flow_stability",
      label: "Cash-flow stability",
      score: Math.round(cfScore),
      rating: rating(cfScore),
      weight: w.cashFlowStability,
      evidence: `${profile.positiveNetMonths} of ${profile.coverageMonths} months closed cash-positive. Average net monthly flow of ${formatNairaCompact(profile.avgNetMonthlyFlow)} represents a ${formatPercent(margin)} margin on inflows.`,
    },
    {
      key: "account_activity",
      label: "Account activity",
      score: Math.round(actScore),
      rating: rating(actScore),
      weight: w.accountActivity,
      evidence: `${profile.institutionsConnected} institutions connected with an average of ${Math.round(profile.avgTransactionsPerMonth)} transactions per month, indicating active operational use rather than dormant accounts.`,
    },
    {
      key: "existing_obligations",
      label: "Existing obligations",
      score: Math.round(oblScore),
      rating: rating(oblScore),
      weight: w.existingObligations,
      evidence: `Observed loan repayments average ${formatNairaCompact(profile.monthlyDebtService)} per month, ${formatPercent(profile.debtServiceRatio)} of net monthly flow. Outstanding obligations are estimated at ${formatNairaCompact(profile.existingObligations)}, ${formatPercent(obligationLoad)} of annualised net flow.`,
    },
    {
      key: "repayment_capacity",
      label: "Repayment capacity",
      score: Math.round(repScore),
      rating: rating(repScore),
      weight: w.repaymentCapacity,
      evidence: `${profile.loanRepaymentsOnTime} of ${profile.loanRepaymentsObserved} observed repayments on existing facilities occurred within the first ten days of the month. Headroom after existing debt service is ${formatPercent(1 - profile.debtServiceRatio)} of net monthly flow.`,
    },
  ];

  const score = Math.round(factors.reduce((a, f) => a + f.score * f.weight, 0));
  const band = score >= ENGINE_CONFIG.bands.strong ? "Strong" : score >= ENGINE_CONFIG.bands.moderate ? "Moderate" : "Weak";

  // Eligibility: policy-defined share of annualised net flow, scaled by score, net of outstanding obligations.
  const rawEligible = annualNet * policy.eligibility.capacityRatio * (score / 100) - profile.existingObligations * 0.25;
  const eligibleAmount = Math.max(0, Math.min(policy.maxLoanAmount, roundTo(rawEligible, 500_000)));
  const recommendedAmount = roundTo(eligibleAmount * policy.eligibility.recommendedShare, 500_000);
  const recommendedTenorMonths = policy.allowedTenors.includes(6) ? 6 : policy.allowedTenors[Math.floor(policy.allowedTenors.length / 2)];

  const policyChecks = evaluatePolicy(policy, profile, score, eligibleAmount);
  const policyPassed = policyChecks.every((c) => c.passed);

  const support = DEMO_DECISION_SUPPORT.analyse({ profile, factors, score, band, policyPassed, policyChecks });

  return {
    id: uid("ca"),
    businessId: profile.businessId,
    profileId: profile.id,
    generatedAt: new Date().toISOString(),
    modelVersion: MODEL_VERSION,
    policyVersion: policy.version,
    score,
    band,
    factors,
    eligibleAmount,
    recommendedAmount,
    recommendedTenorMonths,
    repaymentWindow: profile.strongestInflowWindow,
    recommendedRepaymentDay: profile.recommendedRepaymentDay,
    riskObservations: support.riskObservations,
    repaymentObservations: [
      `Strongest recurring inflow occurs between the ${ordinal(profile.strongestInflowWindow.start)} and ${ordinal(profile.strongestInflowWindow.end)} of each month, averaging ${formatNairaCompact(profile.avgInflowDuringWindow)}.`,
      ...support.repaymentObservations,
    ],
    recommendation: support.recommendation,
    policyChecks,
    policyPassed,
  };
}
