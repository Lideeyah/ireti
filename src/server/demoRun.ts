import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma, isDemoMode } from "./db";
import { ServiceError } from "./core";
import { resetDatabase } from "./seedDatabase";
import { createSession, destroySession, type SessionUser } from "./auth";
import { DEMO_STEPS, type DemoPace } from "@/lib/demo/script";
import * as sme from "./sme";
import * as bank from "./bank";

/**
 * Guided run controller.
 *
 * Executes the product's own use cases in sequence and reports which screen should be
 * on display. State for the run (which step, and the ids created along the way) lives
 * in a cookie, so a run survives the navigations it performs.
 */
const COOKIE = "ireti_run";

export interface RunState {
  id: string;
  step: number;
  pace: DemoPace;
  applicationId?: string;
  caseId?: string;
  accountId?: string;
}

export interface StepResult {
  done: boolean;
  index: number;
  total: number;
  route?: string;
  state: RunState;
}

function assertEnabled() {
  if (!isDemoMode()) throw new ServiceError("Guided runs are not enabled in this environment.", 403);
}

async function readState(): Promise<RunState | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RunState;
  } catch {
    return null;
  }
}

async function writeState(state: RunState) {
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify(state), { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 });
}

export async function getRunState() {
  return readState();
}

/** Signs in as a seeded colleague. Only reachable while a guided run is active. */
async function signInAs(email: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { email }, include: { organisation: true } });
  if (!user) throw new ServiceError(`No account for ${email}. Reset the environment and try again.`, 404);
  await destroySession();
  await createSession(user.id);
  return { id: user.id, email: user.email, name: user.name, role: user.role as SessionUser["role"], title: user.title, organisationId: user.organisationId, organisationType: user.organisation.type as "sme" | "bank" };
}

/** Wipes and reseeds, then signs in as the business and arms the run. */
export async function startRun(pace: DemoPace) {
  assertEnabled();
  await resetDatabase();
  await signInAs("folake@adebayofoods.ng");
  const state: RunState = { id: randomBytes(6).toString("hex"), step: 0, pace };
  await writeState(state);
  return state;
}

export async function stopRun() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

const SME = "folake@adebayofoods.ng";
const OFFICER = "s.adeyemi@bank.example";
const OPS = "h.bello@bank.example";
const COMPLIANCE = "t.okafor@bank.example";

/** Runs the step at the cursor, advances it, and returns the screen to show. */
export async function runStep(): Promise<StepResult> {
  assertEnabled();
  const state = await readState();
  if (!state) throw new ServiceError("No run in progress.", 400);
  const step = DEMO_STEPS[state.step];
  if (!step) return { done: true, index: state.step, total: DEMO_STEPS.length, state };

  const next: RunState = { ...state, step: state.step + 1 };
  let route: string | undefined;

  const asSme = () => signInAs(SME);

  switch (step.id) {
    case "business": {
      const user = await asSme();
      await sme.saveBusiness(user, {
        name: "Adebayo Foods Ltd",
        cacNumber: "RC 1482930",
        businessType: "Private limited company",
        industry: "Food distribution",
        location: "Lagos",
        yearsOperating: 6,
        declaredMonthlyRevenue: 6_500_000,
      });
      route = "/sme/onboarding";
      break;
    }
    case "identity": {
      const user = await asSme();
      await sme.verifyIdentity(user, "22345678901");
      route = "/sme/onboarding";
      break;
    }
    case "connect-sterling":
    case "connect-firstbank":
    case "connect-uba": {
      const user = await asSme();
      const institution = step.id === "connect-sterling" ? "sterling" : step.id === "connect-firstbank" ? "firstbank" : "uba";
      await sme.connectInstitution(user, institution);
      route = "/sme/onboarding";
      break;
    }
    case "designate": {
      const user = await asSme();
      const business = await prisma.business.findUnique({ where: { organisationId: user.organisationId } });
      const account = business ? await prisma.bankAccount.findFirst({ where: { businessId: business.id, institutionId: "sterling" } }) : null;
      if (account) {
        await sme.setDisbursementAccount(user, account.id);
        next.accountId = account.id;
      }
      route = "/sme/accounts";
      break;
    }
    case "transactions": {
      await asSme();
      route = "/sme/transactions";
      break;
    }
    case "analysis": {
      const user = await asSme();
      await sme.runAnalysis(user);
      route = "/sme/onboarding";
      break;
    }
    case "credit-profile": {
      await asSme();
      route = "/sme/credit-profile";
      break;
    }
    case "apply": {
      const user = await asSme();
      const assessment = await prisma.creditAssessment.findFirst({ where: { business: { organisationId: user.organisationId } }, orderBy: { generatedAt: "desc" } });
      if (!assessment) throw new ServiceError("The analysis has not produced an assessment yet.");
      const app = await sme.submitApplication(user, { amount: assessment.recommendedAmount, purpose: "Working capital", tenorMonths: 6 });
      next.applicationId = app.id;
      route = `/sme/application/${app.id}`;
      break;
    }

    case "officer-queue": {
      await signInAs(OFFICER);
      route = "/bank";
      break;
    }
    case "officer-open":
    case "officer-evidence":
    case "officer-assessment": {
      await signInAs(OFFICER);
      if (!state.applicationId) throw new ServiceError("No application to review.");
      route = `/bank/applications/${state.applicationId}`;
      break;
    }
    case "officer-approve": {
      const user = await signInAs(OFFICER);
      if (!state.applicationId) throw new ServiceError("No application to approve.");
      await bank.approveApplication(user, state.applicationId);
      route = `/bank/applications/${state.applicationId}?approved=1`;
      break;
    }

    case "ops-signin": {
      await signInAs(OPS);
      route = `/bank/applications/${state.applicationId}`;
      break;
    }
    case "ops-disburse": {
      const user = await signInAs(OPS);
      if (!state.applicationId) throw new ServiceError("No application to disburse.");
      await bank.initiateDisbursement(user, state.applicationId, "success");
      route = `/bank/applications/${state.applicationId}`;
      break;
    }

    case "sme-repayments": {
      await asSme();
      route = "/sme/repayments";
      break;
    }
    case "collection-fails": {
      const user = await signInAs(OPS);
      const nextInstalment = await prisma.repayment.findFirst({ where: { plan: { applicationId: state.applicationId } }, orderBy: { sequence: "asc" } });
      if (nextInstalment) await bank.processRepayment(user, nextInstalment.id, "failure");
      route = "/bank/monitoring";
      break;
    }
    case "case-open": {
      await signInAs(OPS);
      const riskCase = await prisma.case.findFirst({ where: { applicationId: state.applicationId }, orderBy: { createdAt: "desc" } });
      next.caseId = riskCase?.id;
      route = riskCase ? `/bank/monitoring/${riskCase.id}` : "/bank/monitoring";
      break;
    }
    case "audit": {
      await signInAs(COMPLIANCE);
      route = "/bank/audit";
      break;
    }
  }

  await writeState(next);
  return { done: next.step >= DEMO_STEPS.length, index: state.step, total: DEMO_STEPS.length, route, state: next };
}
