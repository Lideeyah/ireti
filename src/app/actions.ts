"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BankPolicy, LoanPurpose } from "@/lib/domain/types";
import * as auth from "@/server/auth";
import * as sme from "@/server/sme";
import * as bank from "@/server/bank";
import * as risk from "@/server/risk";
import * as demo from "@/server/demo";
import { ServiceError } from "@/server/core";

/**
 * Server actions: thin, authenticated wrappers over the server use cases.
 * Every action returns `{ ok: true, ... }` or `{ ok: false, error }` so client
 * components can render precise error states instead of throwing.
 */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>, paths: string[] = []): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    for (const p of paths) revalidatePath(p, "layout");
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ServiceError || e instanceof auth.AuthError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

// ---- Auth -----------------------------------------------------------------

export async function signInAction(_: unknown, formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  let user: auth.SessionUser;
  try {
    user = await auth.signIn(email, password);
  } catch (e) {
    return { error: e instanceof auth.AuthError ? e.message : "Sign-in failed." };
  }
  redirect(user.organisationType === "bank" ? "/bank" : "/sme");
}

export async function signUpAction(_: unknown, formData: FormData): Promise<{ error?: string }> {
  try {
    await auth.signUpSme({ name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? ""), businessName: String(formData.get("businessName") ?? "") });
  } catch (e) {
    return { error: e instanceof auth.AuthError ? e.message : "Could not create the account." };
  }
  redirect("/sme/onboarding");
}

export async function signOutAction() {
  await auth.destroySession();
  redirect("/sign-in");
}

// ---- SME -------------------------------------------------------------------

export async function saveBusinessAction(input: sme.BusinessInput) {
  return run(async () => sme.saveBusiness(await auth.requireSmeUser(), input), ["/sme"]);
}
export async function verifyIdentityAction(bvn: string) {
  return run(async () => sme.verifyIdentity(await auth.requireSmeUser(), bvn), ["/sme"]);
}
export async function connectInstitutionAction(institutionId: string, simulateFailure = false) {
  return run(async () => sme.connectInstitution(await auth.requireSmeUser(), institutionId, { simulateFailure }), ["/sme"]);
}
export async function disconnectInstitutionAction(connectionId: string) {
  return run(async () => sme.disconnectInstitution(await auth.requireSmeUser(), connectionId), ["/sme"]);
}
export async function refreshConnectionAction(connectionId: string) {
  return run(async () => sme.refreshConnection(await auth.requireSmeUser(), connectionId), ["/sme"]);
}
export async function runAnalysisAction() {
  return run(async () => sme.runAnalysis(await auth.requireSmeUser()), ["/sme"]);
}
export async function submitApplicationAction(input: { amount: number; purpose: LoanPurpose; tenorMonths: number }) {
  return run(async () => sme.submitApplication(await auth.requireSmeUser(), input), ["/sme", "/bank"]);
}
export async function provideInformationAction(applicationId: string) {
  return run(async () => sme.provideInformation(await auth.requireSmeUser(), applicationId), ["/sme", "/bank"]);
}
export async function reportAccessAction(applicationId: string) {
  return run(async () => sme.reportAccess(await auth.requireSmeUser(), applicationId), ["/sme", "/bank"]);
}

// ---- Bank ------------------------------------------------------------------

export async function openApplicationAction(applicationId: string) {
  return run(async () => bank.openApplicationForReview(await auth.requireBankUser("bank:review_application"), applicationId), ["/bank", "/sme"]);
}
export async function requestInformationAction(applicationId: string, items: string[], message?: string) {
  return run(async () => bank.requestInformation(await auth.requireBankUser("bank:request_information"), applicationId, items, message), ["/bank", "/sme"]);
}
export async function approveApplicationAction(applicationId: string) {
  return run(async () => bank.approveApplication(await auth.requireBankUser("bank:decide_application"), applicationId), ["/bank", "/sme"]);
}
export async function rejectApplicationAction(applicationId: string, note: string) {
  return run(async () => bank.rejectApplication(await auth.requireBankUser("bank:decide_application"), applicationId, note), ["/bank", "/sme"]);
}
export async function initiateDisbursementAction(applicationId: string, force?: "success" | "failure") {
  return run(async () => bank.initiateDisbursement(await auth.requireBankUser("bank:manage_disbursement"), applicationId, force), ["/bank", "/sme"]);
}
export async function escalateDisbursementAction(applicationId: string) {
  return run(async () => bank.escalateDisbursement(await auth.requireBankUser("bank:manage_disbursement"), applicationId), ["/bank"]);
}
export async function processRepaymentAction(repaymentId: string, force?: "success" | "failure") {
  return run(async () => bank.processRepayment(await auth.requireBankUser("bank:process_repayment"), repaymentId, force), ["/bank", "/sme"]);
}
/** SME-initiated retry of a failed debit on their own facility. */
export async function retryOwnRepaymentAction(repaymentId: string) {
  return run(async () => {
    const user = await auth.requireSmeUser();
    const { prisma } = await import("@/server/db");
    const rep = await prisma.repayment.findUnique({ where: { id: repaymentId }, include: { plan: { include: { business: true } } } });
    if (!rep || rep.plan.business.organisationId !== user.organisationId) throw new ServiceError("Repayment not found", 404);
    if (rep.status !== "failed") throw new ServiceError("Only a failed instalment can be retried.");
    return bank.processRepayment(user, repaymentId);
  }, ["/sme", "/bank"]);
}
export async function assignCaseAction(caseId: string, assigneeName: string) {
  return run(async () => risk.assignCase(await auth.requireBankUser("bank:manage_cases"), caseId, assigneeName), ["/bank"]);
}
export async function addCaseNoteAction(caseId: string, text: string) {
  return run(async () => risk.addCaseNote(await auth.requireBankUser("bank:manage_cases"), caseId, text), ["/bank"]);
}
export async function escalateCaseAction(caseId: string) {
  return run(async () => risk.escalateCase(await auth.requireBankUser("bank:manage_cases"), caseId), ["/bank"]);
}
export async function resolveCaseAction(caseId: string, note: string) {
  return run(async () => risk.resolveCase(await auth.requireBankUser("bank:manage_cases"), caseId, note), ["/bank", "/sme"]);
}
export async function updatePolicyAction(patch: Partial<BankPolicy>) {
  return run(async () => bank.updatePolicy(await auth.requireBankUser("bank:configure_policy"), patch), ["/bank"]);
}
export async function markNotificationsReadAction() {
  return run(async () => bank.markNotificationsRead(await auth.requireUser()), ["/sme", "/bank"]);
}

// ---- Demo ------------------------------------------------------------------

export async function resetDemoAction() {
  return run(async () => {
    await auth.requireBankUser("bank:configure_policy");
    await demo.resetDemo();
    await auth.destroySession();
  }, ["/"]);
}
export async function loadSampleApplicationAction() {
  return run(async () => demo.loadSampleApplication(await auth.requireSmeUser()), ["/sme", "/bank"]);
}
export async function simulateRepaymentAction(applicationId: string, outcome: "success" | "failure") {
  return run(async () => {
    const user = await auth.requireBankUser("bank:process_repayment");
    demo.assertDemo();
    const { prisma } = await import("@/server/db");
    const next = await prisma.repayment.findFirst({ where: { plan: { applicationId }, status: { in: ["scheduled", "failed"] } }, orderBy: { sequence: "asc" } });
    if (!next) throw new ServiceError("No instalment available to process.");
    return bank.processRepayment(user, next.id, outcome);
  }, ["/bank", "/sme"]);
}
