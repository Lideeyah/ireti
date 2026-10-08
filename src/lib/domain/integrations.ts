/**
 * The external capabilities the platform depends on, and the provider currently wired
 * to each. Every one sits behind an interface in `src/server` or `src/lib/services`,
 * so moving an adapter from sandbox to a live provider is a configuration change.
 */
export interface IntegrationStatus {
  capability: string;
  detail: string;
  provider: string;
  interface: string;
  live: boolean;
}

export const INTEGRATIONS: IntegrationStatus[] = [
  { capability: "Identity verification", detail: "BVN validation before accounts are connected", provider: "Sandbox identity provider", interface: "IdentityVerificationService", live: false },
  { capability: "Open Banking", detail: "Account, balance and transaction retrieval", provider: "Sandbox Open Banking provider", interface: "BankConnectionService", live: false },
  { capability: "Disbursement", detail: "Payout to the designated account", provider: "Sandbox payment switch", interface: "DisbursementService", live: false },
  { capability: "Collections", detail: "Direct-debit mandate and presentment", provider: "Sandbox collections engine", interface: "RepaymentService", live: false },
  { capability: "Credit assessment", detail: "Scoring, eligibility and decision support", provider: "Ìrètí engine CA-2.4", interface: "assessCredit", live: true },
  { capability: "Audit ledger", detail: "Hash-chained record of consent, access and decisions", provider: "Application database", interface: "recordAudit / verifyLedger", live: true },
];
