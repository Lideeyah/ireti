import type {
  AssessmentFactor,
  BankPolicy,
  CreditAssessment,
  FinancialProfile,
  Rating,
} from "../domain/types";
import { evaluatePolicy } from "../policy/evaluate";
import { formatNaira, formatNairaCompact, formatPercent } from "../format";
import { ordinal } from "../util/dates";
import { uid } from "../util/ids";
import { DEMO_DECISION_SUPPORT } from "../ai/decisionSupport";

export const MODEL_VERSION = "CA-2.4";

/**
 * Credit assessment engine.
 *
 * The engine is deterministic and fully configurable: every weight, threshold and
 * ratio it uses comes from ENGINE_CONFIG or the bank's BankPolicy, so a bank can
 * re-tune it without code changes. It produces a proprietary assessment derived from
 * connected-account behaviour; it is not a regulated credit-bureau score.
 *
 * Scoring  — five weighted factors, each normalised to 0–100 from observed figures.
 * Eligibility — the lower of two independent ceilings:
 *   1. Capacity ceiling: a risk-adjusted share of annualised net cash flow, less a
 *      charge for existing obligations.
 *   2. Affordability ceiling: the largest principal whose instalment at the longest
 *      permitted tenor still meets the bank's target debt-service coverage ratio,
 *      after haircuts for revenue volatility and a declining revenue trend.
 * Both are capped by the bank's configured maximum loan amount.
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
  /** Coefficient of variation at which the revenue-consistency score reaches zero. */
  revenueCvZeroAt: 0.4545,
  /** Maximum score movement (points) attributable to the recent revenue trend. */
  trendAdjustmentCap: 10,
  /** Floor applied to the volatility haircut so a volatile business is never zero-rated. */
  volatilityHaircutFloor: 0.5,
  /** Floor applied to the declining-trend haircut. */
  trendHaircutFloor: 0.6,
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

/** Present value of an annuity: the principal an instalment can service. */
export function principalForInstalment(instalment: number, monthlyRate: number, months: number): number {
  if (instalment <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return instalment * months;
  return instalment * ((1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate);
}

/** Instalment required to service a principal: the inverse of the above. */
export function instalmentForPrincipal(principal: number, monthlyRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return principal / months;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

export function assessCredit(profile: FinancialProfile, policy: BankPolicy): CreditAssessment {
  const w = ENGINE_CONFIG.weights;

  // --- Factor 1: revenue consistency -------------------------------------
  // Coefficient of variation of monthly inflows, adjusted by the recent trend.
  const cv = profile.revenueCoefficientOfVariation;
  const consistencyBase = clamp(100 - (cv / ENGINE_CONFIG.revenueCvZeroAt) * 100);
  const trendAdjustment = clamp(profile.recentInflowChangePct * 100, -ENGINE_CONFIG.trendAdjustmentCap, ENGINE_CONFIG.trendAdjustmentCap);
  const revScore = clamp(consistencyBase + trendAdjustment);

  // --- Factor 2: cash-flow stability -------------------------------------
  // Share of cash-positive months plus net margin on inflows.
  const positiveShare = profile.positiveNetMonths / profile.coverageMonths;
  const margin = profile.avgMonthlyInflow ? profile.avgNetMonthlyFlow / profile.avgMonthlyInflow : 0;
  const cfScore = clamp(positiveShare * 60 + clamp(margin, 0, 0.5) * 80);

  // --- Factor 3: account activity ----------------------------------------
  // Breadth of connected institutions and operational transaction volume.
  const actScore = clamp(Math.min(profile.institutionsConnected, 3) * 16 + Math.min(profile.avgTransactionsPerMonth, 60) * 0.9);

  // --- Factor 4: existing obligations ------------------------------------
  // Debt service against net flow, plus outstanding balance against annualised net flow.
  const annualNet = Math.max(profile.avgNetMonthlyFlow * 12, 1);
  const obligationLoad = profile.existingObligations / annualNet;
  const oblScore = clamp(100 - profile.debtServiceRatio * 200 - obligationLoad * 100);

  // --- Factor 5: repayment capacity --------------------------------------
  // Observed payment behaviour and headroom remaining after existing debt service.
  const consistencyScore = profile.paymentConsistency === "Strong" ? 85 : profile.paymentConsistency === "Moderate" ? 60 : 30;
  const headroom = clamp((1 - profile.debtServiceRatio) * 100);
  const repScore = clamp(consistencyScore * 0.6 + headroom * 0.4);

  // --- Eligibility: capacity ceiling -------------------------------------
  const score = Math.round(
    revScore * w.revenueConsistency +
      cfScore * w.cashFlowStability +
      actScore * w.accountActivity +
      oblScore * w.existingObligations +
      repScore * w.repaymentCapacity,
  );
  const riskScalar = score / 100;
  const capacityCeiling = annualNet * policy.eligibility.capacityRatio * riskScalar - profile.existingObligations * 0.25;

  // --- Eligibility: affordability ceiling (DSCR) -------------------------
  const freeCashFlow = Math.max(0, profile.avgNetMonthlyFlow - profile.monthlyDebtService);
  const volatilityHaircut = clamp(1 - cv * policy.eligibility.volatilitySensitivity, ENGINE_CONFIG.volatilityHaircutFloor, 1);
  const trendHaircut = clamp(1 + Math.min(0, profile.recentInflowChangePct), ENGINE_CONFIG.trendHaircutFloor, 1);
  // Instalment the business can service while still meeting the bank's target cover.
  const maxInstalment = (freeCashFlow / policy.eligibility.targetDscr) * volatilityHaircut * trendHaircut;
  const longestTenor = Math.max(...policy.allowedTenors);
  const monthlyRate = policy.annualInterestRate / 12;
  const affordabilityCeiling = principalForInstalment(maxInstalment, monthlyRate, longestTenor);

  const rawEligible = Math.min(capacityCeiling, affordabilityCeiling, policy.maxLoanAmount);
  const eligibleAmount = Math.max(0, roundTo(rawEligible, 500_000));
  const recommendedAmount = roundTo(eligibleAmount * policy.eligibility.recommendedShare, 500_000);

  // Recommended tenor: the shortest permitted tenor at which the recommended amount
  // still clears the cover target. A tight instalment lengthens the tenor rather than
  // shrinking the advance, which is what a credit officer would do by hand.
  const tenors = [...policy.allowedTenors].sort((a, b) => a - b);
  const preferredTenor = tenors.includes(6) ? 6 : tenors[Math.floor(tenors.length / 2)];
  const candidateTenors = tenors.filter((t) => t >= preferredTenor);
  let recommendedTenorMonths = candidateTenors[candidateTenors.length - 1] ?? preferredTenor;
  for (const t of candidateTenors) {
    const instalment = instalmentForPrincipal(recommendedAmount, monthlyRate, t);
    if (instalment > 0 && freeCashFlow / instalment >= policy.eligibility.targetDscr) {
      recommendedTenorMonths = t;
      break;
    }
  }
  const recommendedInstalment = instalmentForPrincipal(recommendedAmount, monthlyRate, recommendedTenorMonths);
  const projectedDscr = recommendedInstalment > 0 ? freeCashFlow / recommendedInstalment : 0;
  const bindingConstraint: CreditAssessment["bindingConstraint"] =
    rawEligible === policy.maxLoanAmount ? "bank_maximum" : affordabilityCeiling <= capacityCeiling ? "affordability" : "capacity";

  const factors: AssessmentFactor[] = [
    {
      key: "revenue_consistency",
      label: "Revenue consistency",
      score: Math.round(revScore),
      rating: rating(revScore),
      weight: w.revenueConsistency,
      evidence: `Monthly inflow varied by ${formatPercent(cv)} around its mean across ${profile.coverageMonths} months. The last three months averaged ${formatNairaCompact(profile.recentAvgInflow)}, ${profile.recentInflowChangePct >= 0 ? "up" : "down"} ${formatPercent(Math.abs(profile.recentInflowChangePct))} on the prior period.`,
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
      evidence: `${profile.loanRepaymentsOnTime} of ${profile.loanRepaymentsObserved} observed repayments on existing facilities fell in the first ten days of the month. Free cash flow after existing debt service is ${formatNairaCompact(freeCashFlow)} per month, supporting an instalment of up to ${formatNairaCompact(maxInstalment)} at the bank's target cover of ${policy.eligibility.targetDscr.toFixed(2)}×.`,
    },
  ];

  const band = score >= ENGINE_CONFIG.bands.strong ? "Strong" : score >= ENGINE_CONFIG.bands.moderate ? "Moderate" : "Weak";
  const policyChecks = evaluatePolicy(policy, profile, score, eligibleAmount, projectedDscr);
  const policyPassed = policyChecks.every((c) => c.passed);
  const support = DEMO_DECISION_SUPPORT.analyse({ profile, factors, score, band, policyPassed, policyChecks, projectedDscr, targetDscr: policy.eligibility.targetDscr });

  const constraintNote =
    bindingConstraint === "affordability"
      ? `Eligibility is limited by affordability: ${formatNaira(maxInstalment)} is the largest instalment that still meets the ${policy.eligibility.targetDscr.toFixed(2)}× cover target after volatility and trend haircuts.`
      : bindingConstraint === "bank_maximum"
        ? `Eligibility is capped at the bank's maximum lending amount of ${formatNaira(policy.maxLoanAmount)}.`
        : `Eligibility is limited by capacity: ${formatPercent(policy.eligibility.capacityRatio)} of annualised net cash flow, risk-adjusted at ${Math.round(riskScalar * 100)}%, less a charge for existing obligations.`;

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
    freeCashFlow,
    maxInstalment,
    projectedDscr,
    capacityCeiling: Math.max(0, capacityCeiling),
    affordabilityCeiling: Math.max(0, affordabilityCeiling),
    bindingConstraint,
    riskObservations: support.riskObservations,
    repaymentObservations: [
      `Strongest recurring inflow occurs between the ${ordinal(profile.strongestInflowWindow.start)} and ${ordinal(profile.strongestInflowWindow.end)} of each month, averaging ${formatNairaCompact(profile.avgInflowDuringWindow)}.`,
      ...support.repaymentObservations,
    ],
    recommendation: support.recommendation,
    policyChecks,
    policyPassed,
    constraintNote,
  };
}
