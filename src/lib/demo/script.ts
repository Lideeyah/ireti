/**
 * The guided run.
 *
 * Each step is executed against the live application: it calls the same server use
 * cases the UI calls, writes the same records and the same audit events, then puts the
 * screen that shows the result in front of the viewer. Nothing here is a mock-up of
 * the product; it is the product being driven.
 */
export type DemoRole = "sme" | "officer" | "operations" | "compliance";

export interface DemoStep {
  id: string;
  /** Short label for the step rail. */
  title: string;
  /** Sentence shown to the viewer while the step is on screen. */
  caption: string;
  role: DemoRole;
  /** Milliseconds to hold the resulting screen before advancing, at normal pace. */
  dwell: number;
  /** Chapter heading, shown when it changes. */
  chapter: string;
}

export const DEMO_STEPS: DemoStep[] = [
  { id: "business", chapter: "Onboarding", title: "Business details", caption: "A business signs up and registers its details. The CAC number and trading history are captured first.", role: "sme", dwell: 4500 },
  { id: "identity", chapter: "Onboarding", title: "Identity", caption: "Identity is verified by BVN before any financial account can be connected. The number itself is never stored.", role: "sme", dwell: 4500 },
  { id: "connect-sterling", chapter: "Onboarding", title: "Connect Sterling", caption: "The business authorises an Open Banking connection to its primary account at Sterling Bank.", role: "sme", dwell: 4000 },
  { id: "connect-firstbank", chapter: "Onboarding", title: "Connect FirstBank", caption: "A second institution is connected. An SME's money rarely sits in one bank, which is the problem this solves.", role: "sme", dwell: 3800 },
  { id: "connect-uba", chapter: "Onboarding", title: "Connect UBA", caption: "A third account joins the picture. Balances and twelve months of transactions are retrieved from each.", role: "sme", dwell: 4200 },
  { id: "designate", chapter: "Onboarding", title: "Designate account", caption: "The business chooses which account receives disbursement and carries the repayment mandate.", role: "sme", dwell: 5000 },
  { id: "transactions", chapter: "Analysis", title: "Consolidated ledger", caption: "450 transactions across three banks, consolidated into one ledger the bank can actually assess.", role: "sme", dwell: 6000 },
  { id: "analysis", chapter: "Analysis", title: "Run analysis", caption: "Twelve months are analysed, weighting the most recent quarter more heavily, to build the financial profile.", role: "sme", dwell: 6500 },
  { id: "credit-profile", chapter: "Analysis", title: "Credit profile", caption: "A score of 82 with the evidence behind every factor, and eligibility of ₦18.5m derived from cash flow, not collateral.", role: "sme", dwell: 7500 },
  { id: "apply", chapter: "Application", title: "Apply", caption: "The business applies for ₦12m over six months, consents to the data and repayment terms, and submits.", role: "sme", dwell: 6000 },

  { id: "officer-queue", chapter: "Bank review", title: "Officer signs in", caption: "A credit officer at the bank signs in. The new application is at the top of the queue.", role: "officer", dwell: 5000 },
  { id: "officer-open", chapter: "Bank review", title: "Open application", caption: "Opening the file moves it to review and writes a data-access event the applicant can see.", role: "officer", dwell: 6500 },
  { id: "officer-evidence", chapter: "Bank review", title: "Evidence", caption: "Twelve months of consolidated cash flow, the transactions behind it, and the exposure across three banks.", role: "officer", dwell: 7000 },
  { id: "officer-assessment", chapter: "Bank review", title: "Assessment", caption: "The assessment shows its working: capacity and affordability ceilings, cover on the instalment, and policy checks.", role: "officer", dwell: 7500 },
  { id: "officer-approve", chapter: "Bank review", title: "Approve", caption: "Decision support recommends approval. The officer, not the system, makes the decision.", role: "officer", dwell: 6000 },

  { id: "ops-signin", chapter: "Disbursement", title: "Operations", caption: "Approval does not move money. Disbursement is a separate step, and only operations can run it.", role: "operations", dwell: 5000 },
  { id: "ops-disburse", chapter: "Disbursement", title: "Disburse", caption: "₦12m is paid to the designated account. It is marked disbursed only on a confirmed banking response.", role: "operations", dwell: 7000 },

  { id: "sme-repayments", chapter: "Repayment", title: "Schedule", caption: "The business sees its schedule, aligned to the 22nd–24th window where its inflows are strongest.", role: "sme", dwell: 6500 },
  { id: "collection-fails", chapter: "Monitoring", title: "Failed collection", caption: "A month later the mandate cannot be collected. The platform does not quietly retry forever.", role: "operations", dwell: 6000 },
  { id: "case-open", chapter: "Monitoring", title: "Risk case", caption: "A risk case opens automatically and the facility moves to at-risk. A person decides what happens next.", role: "operations", dwell: 7000 },
  { id: "audit", chapter: "Audit", title: "Audit ledger", caption: "Compliance sees the whole chain: consent, every access, the assessment, the decision, the money and the failure.", role: "compliance", dwell: 8000 },
];

export const PACE_MULTIPLIER = { slow: 1.45, normal: 1, fast: 0.65 } as const;
export type DemoPace = keyof typeof PACE_MULTIPLIER;

export const ROLE_LABELS: Record<DemoRole, string> = {
  sme: "Adebayo Foods Ltd",
  officer: "Credit Officer",
  operations: "Credit Operations",
  compliance: "Compliance",
};

export const CHAPTERS = Array.from(new Set(DEMO_STEPS.map((s) => s.chapter)));
