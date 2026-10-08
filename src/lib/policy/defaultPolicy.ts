import type { BankPolicy } from "../domain/types";

/**
 * Lending policy is configuration, not code. Every figure the product uses for
 * pricing, eligibility and risk comes from the active policy object held in the store.
 */
export const DEFAULT_POLICY: BankPolicy = {
  version: "LP-1.3",
  maxLoanAmount: 50_000_000,
  minLoanAmount: 500_000,
  minAssessmentScore: 60,
  allowedTenors: [3, 6, 9, 12],
  annualInterestRate: 0.18,
  processingFeeRate: 0.005,
  requiredDocuments: ["CAC certificate", "Valid means of identification", "Proof of business address"],
  eligibility: {
    /** Share of annualised net cash flow that may be lent at a perfect score. */
    capacityRatio: 0.7,
    /** Recommended amount as a share of eligibility. */
    recommendedShare: 0.65,
    /** Maximum existing-debt-service-to-net-flow ratio permitted. */
    maxDebtServiceRatio: 0.6,
    /**
     * Target debt-service coverage: free cash flow must exceed the instalment by this
     * multiple. Set for short-tenor working capital, where the advance is itself
     * working in the business; raise it towards 1.25 for longer-term lending.
     */
    targetDscr: 1.1,
    /** How sharply revenue volatility reduces the affordable instalment. */
    volatilitySensitivity: 0.5,
  },
  repaymentRules: {
    alignToInflowWindow: true,
    minDaysBeforeFirstRepayment: 14,
    maxDebitRetries: 2,
    graceDays: 3,
  },
  riskThresholds: {
    inflowDropWatchPct: 0.2,
    inflowDropAtRiskPct: 0.35,
    failedDebitsAtRisk: 1,
    missedRepaymentsAtRisk: 1,
  },
  updatedAt: "2026-09-01T09:00:00.000Z",
  updatedByName: "Policy administrator",
};
