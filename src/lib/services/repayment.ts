/**
 * RepaymentService — direct-debit mandate and collection adapter.
 * Production: NIBSS direct debit / the bank's collections engine.
 * Demo: simulated mandate and debit outcomes.
 */
export type RepaymentOutcome =
  | { status: "paid"; reference: string; at: string }
  | { status: "failed"; reason: string; at: string };

export interface RepaymentService {
  createMandate(params: { businessId: string; accountId: string; amount: number }): Promise<{ mandateReference: string }>;
  scheduleRepayment(params: { repaymentId: string; dueDate: string }): Promise<{ scheduled: true }>;
  processRepayment(params: { repaymentId: string; amount: number; forceOutcome?: "success" | "failure" }): Promise<RepaymentOutcome>;
  getRepaymentStatus(repaymentId: string): Promise<"paid" | "failed" | "unknown">;
  retryRepayment(params: { repaymentId: string; amount: number; forceOutcome?: "success" | "failure" }): Promise<RepaymentOutcome>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function debit(force?: "success" | "failure"): Promise<RepaymentOutcome> {
  await delay(1500);
  const at = new Date().toISOString();
  if (force === "failure") return { status: "failed", reason: "Insufficient available balance", at };
  return { status: "paid", reference: `RPY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, at };
}

export const demoRepaymentService: RepaymentService = {
  async createMandate() {
    await delay(500);
    return { mandateReference: `MND-${Math.random().toString(36).slice(2, 9).toUpperCase()}` };
  },
  async scheduleRepayment() {
    return { scheduled: true };
  },
  processRepayment: ({ forceOutcome }) => debit(forceOutcome),
  retryRepayment: ({ forceOutcome }) => debit(forceOutcome),
  async getRepaymentStatus() {
    return "unknown";
  },
};
