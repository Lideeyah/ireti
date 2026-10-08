import type {
  AssessmentFactor,
  DecisionRecommendation,
  FinancialProfile,
  PolicyCheck,
} from "../domain/types";
import { formatPercent } from "../format";
import { ordinal } from "../util/dates";

/**
 * Decision-support abstraction.
 *
 * Accepts structured financial information and returns observations and a
 * recommendation with confidence. The bank officer remains the decision-maker;
 * nothing returned here changes application state on its own.
 *
 * The demo implementation is deterministic and rule-based so the product works
 * without any external model. A production implementation (hosted model, LLM,
 * or vendor scorecard) plugs in behind the same interface.
 */
export interface DecisionSupportInput {
  profile: FinancialProfile;
  factors: AssessmentFactor[];
  score: number;
  band: "Strong" | "Moderate" | "Weak";
  policyPassed: boolean;
  policyChecks: PolicyCheck[];
  /** Projected debt-service cover on the recommended amount. */
  projectedDscr: number;
  targetDscr: number;
}

export interface DecisionSupportOutput {
  riskObservations: string[];
  repaymentObservations: string[];
  recommendation: DecisionRecommendation;
}

export interface DecisionSupportService {
  readonly name: string;
  analyse(input: DecisionSupportInput): DecisionSupportOutput;
}

export const DEMO_DECISION_SUPPORT: DecisionSupportService = {
  name: "Deterministic demo decision support",
  analyse({ profile, factors, score, policyPassed, policyChecks, projectedDscr, targetDscr }) {
    const byKey = Object.fromEntries(factors.map((f) => [f.key, f]));
    const risks: string[] = [];
    const repay: string[] = [];
    const reasoning: string[] = [];

    if (profile.recentInflowChangePct < -0.15) {
      risks.push(`Recent inflows are ${formatPercent(Math.abs(profile.recentInflowChangePct))} below the prior nine-month average.`);
    }
    if (profile.revenueConsistency === "Low") risks.push("Monthly revenue is volatile; eligibility is reduced accordingly.");
    if (byKey.existing_obligations?.rating !== "Strong") {
      risks.push(`Existing obligations absorb ${formatPercent(profile.debtServiceRatio)} of net monthly flow; new repayments would sit alongside them.`);
    }
    if (profile.positiveNetMonths < profile.coverageMonths - 2) {
      risks.push(`${profile.coverageMonths - profile.positiveNetMonths} months closed cash-negative in the observed period.`);
    }
    if (profile.institutionsConnected < 2) risks.push("Only one institution connected; the financial picture may be incomplete.");
    if (projectedDscr < targetDscr) {
      risks.push(`Projected debt-service cover of ${projectedDscr.toFixed(2)}× falls short of the ${targetDscr.toFixed(2)}× target; the instalment leaves little headroom.`);
    }
    if (risks.length === 0) risks.push("No material risk indicators observed in the connected-account data.");

    repay.push(
      `Scheduling repayments on the ${ordinal(profile.recommendedRepaymentDay)} places collection inside the window where inflows are typically strongest.`,
    );
    repay.push(
      `Free cash flow after existing debt service covers the recommended instalment ${projectedDscr.toFixed(2)} times over.`,
    );
    if (profile.avgInflowDuringWindow > 0) {
      repay.push(
        `Average inflow during the window covers an instalment of up to ${formatPercent(Math.min(1, profile.avgNetMonthlyFlow / profile.avgInflowDuringWindow))} of window inflows without drawing on opening balance.`,
      );
    }

    const strongFactors = factors.filter((f) => f.rating === "Strong");
    if (byKey.revenue_consistency?.rating === "Strong") reasoning.push("Consistent recent revenue");
    if (byKey.cash_flow_stability?.rating === "Strong") reasoning.push("Strong observed cash flow");
    if (byKey.existing_obligations) {
      reasoning.push(
        byKey.existing_obligations.rating === "Weak" ? "Existing obligations are elevated" : "Existing obligations remain manageable",
      );
    }
    reasoning.push(`Debt-service cover of ${projectedDscr.toFixed(2)}× on the recommended amount`);
    reasoning.push("Repayment window aligns with recurring inflows");

    const failed = policyChecks.filter((c) => !c.passed);
    let recommendation: DecisionRecommendation;
    if (!policyPassed) {
      recommendation = {
        action: failed.some((c) => c.label === "Minimum assessment score") ? "decline" : "review",
        headline: failed.some((c) => c.label === "Minimum assessment score")
          ? "Decline: below configured minimum score"
          : "Refer for manual review: policy exception required",
        confidence: "High",
        reasoning: [...failed.map((c) => c.detail), ...reasoning.slice(0, 2)],
      };
    } else if (score >= 75 && strongFactors.length >= 3 && projectedDscr >= targetDscr) {
      recommendation = {
        action: "approve",
        headline: "Approve within configured eligibility",
        confidence: strongFactors.length >= 4 ? "High" : "Medium",
        reasoning,
      };
    } else if (score >= 60) {
      recommendation = {
        action: "review",
        headline: "Approve with reduced amount or additional information",
        confidence: "Medium",
        reasoning: [...reasoning, ...risks.slice(0, 1)],
      };
    } else {
      recommendation = {
        action: "decline",
        headline: "Decline on current financial evidence",
        confidence: "Medium",
        reasoning: risks,
      };
    }

    return { riskObservations: risks, repaymentObservations: repay, recommendation };
  },
};
