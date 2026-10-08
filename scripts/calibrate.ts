import { generateBusinessData, ADEBAYO_SHAPE } from "../src/lib/seed/transactions";
import { buildFinancialProfile } from "../src/lib/analysis/financialAnalysis";
import { assessCredit } from "../src/lib/assessment/engine";
import { DEFAULT_POLICY } from "../src/lib/policy/defaultPolicy";
import { priceLoan, buildSchedule } from "../src/lib/loan/pricing";

const asOf = new Date();
const data = generateBusinessData(ADEBAYO_SHAPE, "biz_adebayo", asOf, { sterling: "c1", firstbank: "c2", uba: "c3" });
const profile = buildFinancialProfile({
  businessId: "biz_adebayo",
  transactions: data.transactions,
  accounts: data.accounts,
  asOf,
  institutionsConnected: 3,
});
const fmt = (n: number) => (n / 1e6).toFixed(2) + "m";
console.log("tx count", data.transactions.length);
console.log("monthly", profile.monthly.map((m) => `${m.label}: in ${fmt(m.inflow)} out ${fmt(m.outflow)} net ${fmt(m.net)} (${m.transactionCount})`).join("\n"));
console.log({
  avgIn: fmt(profile.avgMonthlyInflow),
  avgOut: fmt(profile.avgMonthlyOutflow),
  net: fmt(profile.avgNetMonthlyFlow),
  cv: profile.revenueCoefficientOfVariation.toFixed(3),
  consistency: profile.revenueConsistency,
  trend: profile.recentInflowChangePct.toFixed(3),
  window: profile.strongestInflowWindow,
  windowAvg: fmt(profile.avgInflowDuringWindow),
  dsr: profile.debtServiceRatio.toFixed(3),
  payCons: profile.paymentConsistency,
  onTime: `${profile.loanRepaymentsOnTime}/${profile.loanRepaymentsObserved}`,
  txPerMonth: profile.avgTransactionsPerMonth.toFixed(1),
  positive: profile.positiveNetMonths,
});
const a = assessCredit(profile, DEFAULT_POLICY);
console.log("score", a.score, a.band, "eligible", fmt(a.eligibleAmount), "recommended", fmt(a.recommendedAmount));
console.log(a.factors.map((f) => `${f.label}: ${f.score} ${f.rating}`).join("\n"));
console.log(a.recommendation);
const offer = priceLoan({ principal: 12_000_000, tenorMonths: 6, policy: DEFAULT_POLICY, businessId: "b", repaymentWindow: a.repaymentWindow, recommendedRepaymentDay: a.recommendedRepaymentDay });
console.log({ instalment: offer.instalmentAmount, interest: offer.interestAmount, fee: offer.feeAmount, total: offer.totalRepayable });
console.log(buildSchedule({ offer, policy: DEFAULT_POLICY, disbursedAt: asOf, planId: "p", businessId: "b" }).map((r) => `${r.sequence} ${r.dueDate} ${r.windowStart}..${r.windowEnd} ${r.amount} (p ${r.principalPortion} i ${r.interestPortion})`).join("\n"));

// Per-institution path (what the demo BankConnectionService uses) must match the whole-business path.
import { generateInstitutionData } from "../src/lib/seed/transactions";
import { institutionById } from "../src/lib/seed/institutions";
const perInst = ["sterling", "firstbank", "uba"].flatMap((id) => generateInstitutionData({ businessId: "biz_adebayo", institution: institutionById(id), connectionId: `c_${id}`, asOf, seedKey: "adebayo" }).transactions);
const p2 = buildFinancialProfile({ businessId: "biz_adebayo", transactions: perInst, accounts: data.accounts, asOf, institutionsConnected: 3 });
console.log("per-institution path: avgIn", fmt(p2.avgMonthlyInflow), "net", fmt(p2.avgNetMonthlyFlow), "score", assessCredit(p2, DEFAULT_POLICY).score);

const a2 = assessCredit(profile, DEFAULT_POLICY);
console.log("\n=== eligibility mechanism ===");
console.log({
  score: a2.score,
  eligible: fmt(a2.eligibleAmount),
  recommended: fmt(a2.recommendedAmount),
  tenor: a2.recommendedTenorMonths,
  capacityCeiling: fmt(a2.capacityCeiling),
  affordabilityCeiling: fmt(a2.affordabilityCeiling),
  binding: a2.bindingConstraint,
  freeCashFlow: fmt(a2.freeCashFlow),
  maxInstalment: fmt(a2.maxInstalment),
  dscr: a2.projectedDscr.toFixed(2),
  policyPassed: a2.policyPassed,
  action: a2.recommendation.action,
});
console.log(a2.constraintNote);
