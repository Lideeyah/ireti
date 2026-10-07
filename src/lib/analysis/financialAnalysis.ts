import type {
  BankAccount,
  FinancialProfile,
  MonthlyAggregate,
  Rating,
  Transaction,
} from "../domain/types";
import { monthKey, monthLabel, startOfMonth, addMonths } from "../util/dates";
import { uid } from "../util/ids";
import { formatNairaCompact } from "../format";
import { ordinal } from "../util/dates";

/**
 * Financial analysis layer: turns raw consolidated transactions into a structured
 * FinancialProfile. No credit judgement happens here — only measurement.
 */

/** Recency weights across 12 months, oldest first. Most recent 3 months count double. */
export function recencyWeights(n: number): number[] {
  return Array.from({ length: n }, (_, i) => (i >= n - 3 ? 2 : 1));
}

function weightedMean(values: number[], weights: number[]): number {
  const w = weights.reduce((a, b) => a + b, 0);
  return values.reduce((acc, v, i) => acc + v * weights[i], 0) / (w || 1);
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / (values.length || 1);
}

function stdDev(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export function aggregateMonthly(transactions: Transaction[], asOf: Date, months = 12): MonthlyAggregate[] {
  const end = startOfMonth(asOf); // exclusive: current month is partial and excluded
  const start = addMonths(end, -months);
  const buckets = new Map<string, MonthlyAggregate>();
  for (let i = 0; i < months; i++) {
    const d = addMonths(start, i);
    const key = monthKey(d);
    buckets.set(key, { month: key, label: monthLabel(key), inflow: 0, outflow: 0, net: 0, transactionCount: 0 });
  }
  for (const t of transactions) {
    const d = new Date(t.date);
    if (d < start || d >= end) continue;
    const b = buckets.get(monthKey(d));
    if (!b) continue;
    if (t.amount >= 0) b.inflow += t.amount;
    else b.outflow += -t.amount;
    b.transactionCount += 1;
  }
  for (const b of buckets.values()) b.net = b.inflow - b.outflow;
  return Array.from(buckets.values());
}

export function strongestInflowWindow(transactions: Transaction[]): { start: number; end: number; avgPerMonth: number } {
  const byDay = new Array(32).fill(0);
  const monthsSeen = new Set<string>();
  for (const t of transactions) {
    if (t.amount <= 0) continue;
    const d = new Date(t.date);
    byDay[d.getDate()] += t.amount;
    monthsSeen.add(monthKey(d));
  }
  let best = { start: 1, end: 3, total: 0 };
  for (let s = 1; s <= 28; s++) {
    const total = byDay[s] + byDay[s + 1] + byDay[s + 2];
    if (total > best.total) best = { start: s, end: s + 2, total };
  }
  return { start: best.start, end: best.end, avgPerMonth: best.total / (monthsSeen.size || 1) };
}

export function buildFinancialProfile(params: {
  businessId: string;
  transactions: Transaction[];
  accounts: BankAccount[];
  asOf: Date;
  /** Outstanding balance on facilities. If omitted, estimated from observed repayment flows. */
  existingObligations?: number;
  institutionsConnected: number;
}): FinancialProfile {
  const { businessId, transactions, accounts, asOf, institutionsConnected } = params;
  const monthly = aggregateMonthly(transactions, asOf);
  const n = monthly.length;
  const weights = recencyWeights(n);
  const inflows = monthly.map((m) => m.inflow);
  const outflows = monthly.map((m) => m.outflow);

  const avgMonthlyInflow = weightedMean(inflows, weights);
  const avgMonthlyOutflow = weightedMean(outflows, weights);
  const avgNetMonthlyFlow = avgMonthlyInflow - avgMonthlyOutflow;

  const recent = inflows.slice(-3);
  const prior = inflows.slice(0, -3);
  const recentAvgInflow = mean(recent);
  const priorAvg = mean(prior);
  const recentInflowChangePct = priorAvg ? (recentAvgInflow - priorAvg) / priorAvg : 0;

  const cv = avgMonthlyInflow ? stdDev(inflows) / mean(inflows) : 1;
  const revenueConsistency = cv < 0.15 ? "High" : cv < 0.3 ? "Medium" : "Low";
  const expenseRatio = avgMonthlyInflow ? avgMonthlyOutflow / avgMonthlyInflow : 1;
  const positiveNetMonths = monthly.filter((m) => m.net > 0).length;

  const repayments = transactions.filter((t) => t.category === "loan_repayment");
  const monthsWithRepayment = new Set(repayments.map((t) => monthKey(new Date(t.date)))).size;
  const monthlyDebtService = repayments.length
    ? repayments.reduce((a, t) => a + Math.abs(t.amount), 0) / Math.max(1, monthsWithRepayment)
    : 0;
  const debtServiceRatio = avgNetMonthlyFlow > 0 ? monthlyDebtService / avgNetMonthlyFlow : 1;
  // Without bureau data, outstanding obligations are estimated as three months of observed debt service.
  const existingObligations = params.existingObligations ?? monthlyDebtService * 3;
  // Payment consistency: did an observed repayment occur in each month of coverage?
  const loanRepaymentsObserved = repayments.length;
  const loanRepaymentsOnTime = repayments.filter((t) => new Date(t.date).getDate() <= 10).length;
  const paymentConsistency: Rating =
    loanRepaymentsObserved === 0
      ? "Moderate"
      : monthsWithRepayment >= n - 1 && loanRepaymentsOnTime / loanRepaymentsObserved >= 0.9
        ? "Strong"
        : monthsWithRepayment >= n - 3
          ? "Moderate"
          : "Weak";

  const window = strongestInflowWindow(transactions);
  const recommendedRepaymentDay = window.start + 1;
  const totalObservedBalance = accounts.reduce((a, acc) => a + acc.balance, 0);
  const avgTransactionsPerMonth = mean(monthly.map((m) => m.transactionCount));

  const trendWord =
    recentInflowChangePct > 0.05 ? "increased" : recentInflowChangePct < -0.05 ? "declined" : "remained relatively consistent";
  const narrative = `Revenue has ${trendWord} over the last three months (${recentInflowChangePct >= 0 ? "+" : ""}${(recentInflowChangePct * 100).toFixed(0)}% against the prior nine-month average), with the strongest recurring inflow occurring between the ${ordinal(window.start)} and ${ordinal(window.end)} of each month. Average net monthly flow is ${formatNairaCompact(avgNetMonthlyFlow)} across ${institutionsConnected} connected ${institutionsConnected === 1 ? "institution" : "institutions"}, and ${positiveNetMonths} of ${n} months closed cash-positive.`;

  return {
    id: uid("fp"),
    businessId,
    generatedAt: asOf.toISOString(),
    coverageMonths: n,
    monthly,
    avgMonthlyInflow,
    avgMonthlyOutflow,
    avgNetMonthlyFlow,
    recentAvgInflow,
    recentInflowChangePct,
    revenueCoefficientOfVariation: cv,
    revenueConsistency,
    expenseRatio,
    positiveNetMonths,
    existingObligations,
    monthlyDebtService,
    debtServiceRatio,
    paymentConsistency,
    loanRepaymentsObserved,
    loanRepaymentsOnTime,
    avgTransactionsPerMonth,
    institutionsConnected,
    strongestInflowWindow: { start: window.start, end: window.end },
    avgInflowDuringWindow: window.avgPerMonth,
    recommendedRepaymentDay,
    totalObservedBalance,
    narrative,
  };
}
