import type { BankPolicy, LoanOffer, Repayment, RepaymentPlan } from "../domain/types";
import { addDays, daysInMonth, toIsoDate } from "../util/dates";
import { uid } from "../util/ids";

/**
 * Loan pricing derived entirely from the active BankPolicy.
 * Interest: reducing balance with equal monthly instalments (annuity).
 */
export function priceLoan(params: {
  principal: number;
  tenorMonths: number;
  policy: BankPolicy;
  businessId: string;
  repaymentWindow: { start: number; end: number };
  recommendedRepaymentDay: number;
}): LoanOffer {
  const { principal, tenorMonths, policy } = params;
  const i = policy.annualInterestRate / 12;
  const n = tenorMonths;
  const instalment = Math.round((principal * i) / (1 - Math.pow(1 + i, -n)));
  const interestAmount = instalment * n - principal;
  const feeAmount = Math.round(principal * policy.processingFeeRate);
  return {
    id: uid("offer"),
    businessId: params.businessId,
    principal,
    tenorMonths,
    annualInterestRate: policy.annualInterestRate,
    interestMethod: "reducing_balance_equal_instalment",
    interestAmount,
    feeRate: policy.processingFeeRate,
    feeAmount,
    totalRepayable: principal + interestAmount + feeAmount,
    instalmentAmount: instalment,
    repaymentWindow: params.repaymentWindow,
    recommendedRepaymentDay: params.recommendedRepaymentDay,
    policyVersion: policy.version,
    createdAt: new Date().toISOString(),
  };
}

/** Amortisation schedule aligned to the recommended repayment day. */
export function buildSchedule(params: {
  offer: LoanOffer;
  policy: BankPolicy;
  disbursedAt: Date;
  planId: string;
  businessId: string;
}): Repayment[] {
  const { offer, policy, disbursedAt, planId, businessId } = params;
  const i = offer.annualInterestRate / 12;
  const day = offer.recommendedRepaymentDay;
  const earliest = addDays(disbursedAt, policy.repaymentRules.minDaysBeforeFirstRepayment);

  let first = new Date(earliest.getFullYear(), earliest.getMonth(), Math.min(day, daysInMonth(earliest.getFullYear(), earliest.getMonth())));
  if (first < earliest) first = new Date(earliest.getFullYear(), earliest.getMonth() + 1, day);

  let balance = offer.principal;
  const out: Repayment[] = [];
  for (let k = 0; k < offer.tenorMonths; k++) {
    const due = new Date(first.getFullYear(), first.getMonth() + k, Math.min(day, daysInMonth(first.getFullYear(), first.getMonth() + k)));
    const interest = Math.round(balance * i);
    let principalPortion = offer.instalmentAmount - interest;
    let amount = offer.instalmentAmount;
    if (k === offer.tenorMonths - 1) {
      principalPortion = balance;
      amount = balance + interest;
    }
    balance -= principalPortion;
    const ws = new Date(due.getFullYear(), due.getMonth(), offer.repaymentWindow.start);
    const we = new Date(due.getFullYear(), due.getMonth(), Math.min(offer.repaymentWindow.end, daysInMonth(due.getFullYear(), due.getMonth())));
    out.push({
      id: uid("rp"),
      planId,
      businessId,
      sequence: k + 1,
      dueDate: toIsoDate(due),
      windowStart: toIsoDate(ws),
      windowEnd: toIsoDate(we),
      amount,
      principalPortion,
      interestPortion: interest,
      status: "scheduled",
      attempts: 0,
    });
  }
  return out;
}

export function planOutstanding(plan: RepaymentPlan, repayments: Repayment[]): number {
  const paid = repayments.filter((r) => r.status === "paid").reduce((a, r) => a + r.amount, 0);
  return Math.max(0, plan.totalRepayable - paid);
}
