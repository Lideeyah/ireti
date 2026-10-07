/**
 * DisbursementService — core-banking payout adapter.
 * Production: the bank's core banking / payment switch.
 * Demo: simulated response. Success is never assumed; the caller must act on the
 * returned status, and a failure is surfaced as a failure.
 */
export type DisbursementOutcome =
  | { status: "confirmed"; reference: string; at: string }
  | { status: "failed"; reason: string; at: string };

export interface DisbursementService {
  initiateDisbursement(params: { applicationRef: string; amount: number; destinationAccountId: string; forceOutcome?: "success" | "failure" }): Promise<DisbursementOutcome>;
  getDisbursementStatus(reference: string): Promise<"confirmed" | "failed" | "unknown">;
  retryDisbursement(params: { applicationRef: string; amount: number; destinationAccountId: string; forceOutcome?: "success" | "failure" }): Promise<DisbursementOutcome>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function reference(prefix: string) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function run(force?: "success" | "failure"): Promise<DisbursementOutcome> {
  await delay(1800);
  const at = new Date().toISOString();
  if (force === "failure") {
    return { status: "failed", reason: "Destination account validation failed at the receiving institution (NIP response 07).", at };
  }
  return { status: "confirmed", reference: reference("DSB"), at };
}

export const demoDisbursementService: DisbursementService = {
  initiateDisbursement: ({ forceOutcome }) => run(forceOutcome),
  retryDisbursement: ({ forceOutcome }) => run(forceOutcome),
  async getDisbursementStatus() {
    await delay(300);
    return "unknown";
  },
};
