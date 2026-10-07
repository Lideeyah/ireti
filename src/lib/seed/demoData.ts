import type {
  AuditEvent,
  BankAccount,
  BankConnection,
  BankPolicy,
  Business,
  Case,
  Consent,
  CreditAssessment,
  FinancialProfile,
  LoanApplication,
  LoanOffer,
  Notification,
  Organisation,
  Repayment,
  RepaymentPlan,
  RiskEvent,
  User,
} from "../domain/types";
import { INSTITUTIONS, institutionById } from "./institutions";
import { generateBusinessData, genericShape, type BusinessShape } from "./transactions";
import { buildFinancialProfile } from "../analysis/financialAnalysis";
import { assessCredit } from "../assessment/engine";
import { priceLoan, buildSchedule } from "../loan/pricing";
import { demoAuditLedger } from "../services/auditLedger";
import { applicationReference, caseReference } from "../util/ids";
import { addDays } from "../util/dates";
import { createRng } from "../util/random";
import { sha256 } from "../util/sha256";
import { formatNaira } from "../format";

export const ORGS: Organisation[] = [
  { id: "org_bank", name: "Demo Commercial Bank", type: "bank" },
  { id: "org_adebayo", name: "Adebayo Foods Ltd", type: "sme" },
];

export const USERS: User[] = [
  { id: "u_sme", name: "Folake Adebayo", email: "folake@adebayofoods.ng", role: "SME_USER", title: "Managing Director", organisationId: "org_adebayo" },
  { id: "u_officer", name: "Sarah Adeyemi", email: "s.adeyemi@bank.example", role: "BANK_OFFICER", title: "Credit Officer", organisationId: "org_bank" },
  { id: "u_risk", name: "Emeka Nwosu", email: "e.nwosu@bank.example", role: "BANK_RISK", title: "Risk Analyst", organisationId: "org_bank" },
  { id: "u_ops", name: "Halima Bello", email: "h.bello@bank.example", role: "BANK_OPERATIONS", title: "Credit Operations", organisationId: "org_bank" },
  { id: "u_compliance", name: "Tunde Okafor", email: "t.okafor@bank.example", role: "BANK_COMPLIANCE", title: "Compliance Officer", organisationId: "org_bank" },
  { id: "u_admin", name: "Ngozi Eze", email: "n.eze@bank.example", role: "ADMIN", title: "Head, Digital Lending", organisationId: "org_bank" },
];

export const SYSTEM_ACTOR = { id: "system", name: "Ìrètí platform", role: "SYSTEM" as const };

export const ADEBAYO_BUSINESS_ID = "biz_adebayo";

/** The demo SME. Starts un-onboarded so the full onboarding journey can be shown. */
export const ADEBAYO_PREFILL = {
  name: "Adebayo Foods Ltd",
  cacNumber: "RC 1482930",
  businessType: "Private limited company",
  industry: "Food distribution",
  location: "Lagos",
  yearsOperating: 6,
  declaredMonthlyRevenue: 6_500_000,
};

interface SeedBusinessSpec {
  key: string;
  name: string;
  industry: string;
  location: string;
  years: number;
  businessType: string;
  status: LoanApplication["status"] | "disbursed_at_risk" | "disbursed_watch";
  daysAgo: number;
  amountShare: number; // of eligibility
  tenor: number;
  purpose: LoanApplication["purpose"];
  shape?: Partial<BusinessShape>;
}

const SEED_SPECS: SeedBusinessSpec[] = [
  { key: "lagos-textiles", name: "Lagos Textile Mills Ltd", industry: "Textile manufacturing", location: "Lagos", years: 11, businessType: "Private limited company", status: "submitted", daysAgo: 0, amountShare: 0.7, tenor: 9, purpose: "Working capital", shape: { monthlyInflow: 9_800_000, expenseRatio: 0.62, volatility: 0.12, recentTrend: 1.04 } },
  { key: "kano-agro", name: "Kano Agro Supplies", industry: "Agricultural inputs", location: "Kano", years: 4, businessType: "Enterprise", status: "submitted", daysAgo: 0, amountShare: 0.9, tenor: 6, purpose: "Inventory", shape: { monthlyInflow: 4_200_000, expenseRatio: 0.74, volatility: 0.28, loanRepaymentMonthly: 300_000, recentTrend: 0.9 } },
  { key: "ph-marine", name: "Port Harcourt Marine Services", industry: "Marine logistics", location: "Rivers", years: 8, businessType: "Private limited company", status: "submitted", daysAgo: 1, amountShare: 0.5, tenor: 12, purpose: "Equipment", shape: { monthlyInflow: 13_500_000, expenseRatio: 0.68, volatility: 0.17, loanRepaymentMonthly: 500_000 } },
  { key: "abuja-pharma", name: "Abuja Pharmacare Ltd", industry: "Pharmaceutical retail", location: "FCT", years: 5, businessType: "Private limited company", status: "submitted", daysAgo: 1, amountShare: 0.8, tenor: 6, purpose: "Inventory", shape: { monthlyInflow: 5_600_000, expenseRatio: 0.7, volatility: 0.1, recentTrend: 1.08, loanRepaymentMonthly: 200_000 } },
  { key: "ibadan-print", name: "Ibadan Print Works", industry: "Printing", location: "Oyo", years: 3, businessType: "Enterprise", status: "under_review", daysAgo: 2, amountShare: 0.95, tenor: 3, purpose: "Contract execution", shape: { monthlyInflow: 2_300_000, expenseRatio: 0.82, volatility: 0.3 } },
  { key: "enugu-build", name: "Enugu Building Materials", industry: "Construction supplies", location: "Enugu", years: 9, businessType: "Private limited company", status: "under_review", daysAgo: 2, amountShare: 0.6, tenor: 9, purpose: "Working capital", shape: { monthlyInflow: 8_100_000, expenseRatio: 0.66, volatility: 0.15 } },
  { key: "ikeja-auto", name: "Ikeja Auto Parts Ltd", industry: "Automotive parts", location: "Lagos", years: 7, businessType: "Private limited company", status: "under_review", daysAgo: 3, amountShare: 0.75, tenor: 6, purpose: "Inventory", shape: { monthlyInflow: 6_900_000, expenseRatio: 0.71, volatility: 0.14 } },
  { key: "benin-rubber", name: "Benin Rubber Processors", industry: "Agro-processing", location: "Edo", years: 12, businessType: "Private limited company", status: "under_review", daysAgo: 4, amountShare: 0.55, tenor: 12, purpose: "Expansion", shape: { monthlyInflow: 11_200_000, expenseRatio: 0.6, volatility: 0.2, seasonal: { 2: 0.7, 3: 0.75 } } },
  { key: "aba-leather", name: "Aba Leather Goods", industry: "Leather manufacturing", location: "Abia", years: 6, businessType: "Enterprise", status: "additional_information", daysAgo: 5, amountShare: 0.85, tenor: 6, purpose: "Working capital", shape: { monthlyInflow: 3_400_000, expenseRatio: 0.78, volatility: 0.26, loanRepaymentMonthly: 150_000 } },
  { key: "jos-cold", name: "Jos Cold Chain Ltd", industry: "Cold storage", location: "Plateau", years: 2, businessType: "Private limited company", status: "additional_information", daysAgo: 6, amountShare: 1.0, tenor: 12, purpose: "Equipment", shape: { monthlyInflow: 2_900_000, expenseRatio: 0.8, volatility: 0.33, recentTrend: 0.84, loanRepaymentMonthly: 100_000 } },
  { key: "owerri-hosp", name: "Owerri Hospitality Group", industry: "Hospitality", location: "Imo", years: 10, businessType: "Private limited company", status: "approved", daysAgo: 7, amountShare: 0.6, tenor: 9, purpose: "Expansion", shape: { monthlyInflow: 7_400_000, expenseRatio: 0.66, volatility: 0.13, loanRepaymentMonthly: 250_000 } },
  { key: "lekki-tech", name: "Lekki Tech Distribution", industry: "Electronics distribution", location: "Lagos", years: 5, businessType: "Private limited company", status: "disbursement_pending", daysAgo: 8, amountShare: 0.7, tenor: 6, purpose: "Inventory", shape: { monthlyInflow: 12_600_000, expenseRatio: 0.73, volatility: 0.11 } },
  { key: "onitsha-plast", name: "Onitsha Plastics Ltd", industry: "Plastics manufacturing", location: "Anambra", years: 4, businessType: "Private limited company", status: "rejected", daysAgo: 9, amountShare: 1.0, tenor: 12, purpose: "Expansion", shape: { monthlyInflow: 3_100_000, expenseRatio: 0.8, volatility: 0.38, recentTrend: 0.75, loanRepaymentMonthly: 150_000 } },
  { key: "warri-fab", name: "Warri Fabrication Works", industry: "Metal fabrication", location: "Delta", years: 3, businessType: "Enterprise", status: "rejected", daysAgo: 12, amountShare: 0.9, tenor: 9, purpose: "Contract execution", shape: { monthlyInflow: 2_600_000, expenseRatio: 0.82, volatility: 0.35, recentTrend: 0.8, loanRepaymentMonthly: 100_000 } },
  { key: "calabar-cocoa", name: "Calabar Cocoa Traders", industry: "Commodity trading", location: "Cross River", years: 8, businessType: "Private limited company", status: "disbursed", daysAgo: 45, amountShare: 0.6, tenor: 6, purpose: "Working capital", shape: { monthlyInflow: 9_300_000, expenseRatio: 0.67, volatility: 0.18 } },
  { key: "surulere-bakery", name: "Surulere Bakeries Ltd", industry: "Food production", location: "Lagos", years: 14, businessType: "Private limited company", status: "disbursed", daysAgo: 62, amountShare: 0.5, tenor: 12, purpose: "Equipment", shape: { monthlyInflow: 5_200_000, expenseRatio: 0.72, volatility: 0.08 } },
  { key: "kaduna-logistics", name: "Kaduna Haulage Co.", industry: "Logistics", location: "Kaduna", years: 6, businessType: "Private limited company", status: "disbursed", daysAgo: 95, amountShare: 0.7, tenor: 9, purpose: "Equipment", shape: { monthlyInflow: 7_700_000, expenseRatio: 0.68, volatility: 0.16, loanRepaymentMonthly: 300_000 } },
  { key: "uyo-poultry", name: "Uyo Poultry Farms", industry: "Agriculture", location: "Akwa Ibom", years: 5, businessType: "Enterprise", status: "disbursed_watch", daysAgo: 70, amountShare: 0.8, tenor: 6, purpose: "Inventory", shape: { monthlyInflow: 4_000_000, expenseRatio: 0.7, volatility: 0.2, recentTrend: 0.78, loanRepaymentMonthly: 100_000 } },
  { key: "ilorin-furniture", name: "Ilorin Furniture Makers", industry: "Furniture", location: "Kwara", years: 7, businessType: "Enterprise", status: "disbursed_at_risk", daysAgo: 80, amountShare: 0.9, tenor: 6, purpose: "Working capital", shape: { monthlyInflow: 3_600_000, expenseRatio: 0.72, volatility: 0.2, recentTrend: 0.7, loanRepaymentMonthly: 100_000 } },
  { key: "asaba-water", name: "Asaba Table Water Ltd", industry: "Beverages", location: "Delta", years: 4, businessType: "Private limited company", status: "under_review", daysAgo: 1, amountShare: 0.65, tenor: 6, purpose: "Working capital", shape: { monthlyInflow: 4_800_000, expenseRatio: 0.7, volatility: 0.12 } },
];

export interface SeedResult {
  businesses: Business[];
  connections: BankConnection[];
  accounts: BankAccount[];
  profiles: FinancialProfile[];
  assessments: CreditAssessment[];
  offers: LoanOffer[];
  applications: LoanApplication[];
  plans: RepaymentPlan[];
  repayments: Repayment[];
  riskEvents: RiskEvent[];
  cases: Case[];
  consents: Consent[];
  auditEvents: AuditEvent[];
  notifications: Notification[];
  applicationSequence: number;
  caseSequence: number;
}

function iso(d: Date) {
  return d.toISOString();
}

function at(base: Date, hours: number, minutes: number) {
  const d = new Date(base);
  d.setHours(hours, minutes, Math.floor(Math.random() * 60), 0);
  return d;
}

export function buildSeed(policy: BankPolicy, now = new Date()): SeedResult {
  const out: SeedResult = {
    businesses: [], connections: [], accounts: [], profiles: [], assessments: [], offers: [], applications: [],
    plans: [], repayments: [], riskEvents: [], cases: [], consents: [], auditEvents: [], notifications: [],
    applicationSequence: 461, caseSequence: 176,
  };
  const chain: AuditEvent[] = [];
  const rec = (input: Parameters<typeof demoAuditLedger.record>[1]) => {
    const e = demoAuditLedger.record(chain, input);
    chain.push(e);
    return e;
  };
  const officer = USERS.find((u) => u.id === "u_officer")!;
  const ops = USERS.find((u) => u.id === "u_ops")!;
  const risk = USERS.find((u) => u.id === "u_risk")!;
  const actor = (u: User) => ({ id: u.id, name: u.name, role: u.role });

  // Chronological order: oldest first so the ledger reads naturally.
  const specs = [...SEED_SPECS].sort((a, b) => b.daysAgo - a.daysAgo);
  const year = now.getFullYear();

  for (const spec of specs) {
    const bizId = `biz_${spec.key}`;
    const submitted = addDays(now, -spec.daysAgo);
    const shape = genericShape(spec.key, spec.shape);
    const connectionIds: Record<string, string> = {};
    for (const inst of shape.institutions) connectionIds[inst.institutionId] = `conn_${bizId}_${inst.institutionId}`;
    const data = generateBusinessData(shape, bizId, submitted, connectionIds);
    for (const a of data.accounts) a.institutionName = institutionById(a.institutionId).name;

    out.businesses.push({
      id: bizId,
      organisationId: `org_${spec.key}`,
      name: spec.name,
      cacNumber: `RC ${900000 + (shape.seed % 600000)}`,
      cacStatus: "Active",
      businessType: spec.businessType,
      industry: spec.industry,
      location: spec.location,
      yearsOperating: spec.years,
      declaredMonthlyRevenue: shape.monthlyInflow,
      identityVerified: true,
      identityVerifiedAt: iso(addDays(submitted, -1)),
      createdAt: iso(addDays(submitted, -2)),
    });
    for (const inst of shape.institutions) {
      out.connections.push({
        id: connectionIds[inst.institutionId],
        businessId: bizId,
        institutionId: inst.institutionId,
        institutionName: institutionById(inst.institutionId).name,
        status: "connected",
        provider: "demo-open-banking",
        connectedAt: iso(addDays(submitted, -1)),
        lastSyncedAt: iso(addDays(now, -(spec.daysAgo % 2))),
        consentId: `consent_${bizId}`,
      });
    }
    out.accounts.push(...data.accounts);

    const profile = buildFinancialProfile({
      businessId: bizId,
      transactions: data.transactions,
      accounts: data.accounts,
      asOf: submitted,
      institutionsConnected: shape.institutions.length,
    });
    profile.generatedAt = iso(at(addDays(submitted, -1), 11, 20));
    out.profiles.push(profile);
    const assessment = assessCredit(profile, policy);
    assessment.generatedAt = iso(at(addDays(submitted, -1), 11, 22));
    out.assessments.push(assessment);

    if (assessment.eligibleAmount < policy.minLoanAmount) {
      throw new Error(`Seed spec ${spec.key} produces eligibility below the policy minimum; adjust its shape.`);
    }
    const requested = Math.min(assessment.eligibleAmount, Math.max(policy.minLoanAmount, Math.round((assessment.eligibleAmount * spec.amountShare) / 500_000) * 500_000));
    const offer = priceLoan({ principal: requested, tenorMonths: spec.tenor, policy, businessId: bizId, repaymentWindow: assessment.repaymentWindow, recommendedRepaymentDay: assessment.recommendedRepaymentDay });
    offer.createdAt = iso(submitted);
    out.offers.push(offer);

    out.applicationSequence += 1;
    const appId = `app_${spec.key}`;
    const ref = applicationReference(year, out.applicationSequence);
    offer.applicationId = appId;

    const consent: Consent = {
      id: `consent_${bizId}`,
      businessId: bizId,
      applicationId: appId,
      scope: ["financial_data_access", "account_connection", "repayment_authorisation", "terms"],
      grantedAt: iso(at(submitted, 9, 58)),
      grantedByName: "Authorised signatory",
      hash: sha256(`${bizId}|${appId}|consent`),
    };
    out.consents.push(consent);

    const baseStatus = spec.status.startsWith("disbursed") ? "disbursed" : spec.status;
    const app: LoanApplication = {
      id: appId,
      reference: ref,
      businessId: bizId,
      assessmentId: assessment.id,
      offerId: offer.id,
      amount: requested,
      purpose: spec.purpose,
      tenorMonths: spec.tenor,
      status: baseStatus as LoanApplication["status"],
      submittedAt: iso(at(submitted, 10, 2)),
      updatedAt: iso(at(submitted, 10, 2)),
      consentId: consent.id,
    };

    rec({ type: "CONSENT_RECORDED", actor: { id: `sme_${spec.key}`, name: spec.name, role: "SME_USER" }, businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Consent", metadata: { scopes: consent.scope.length, consentHash: consent.hash.slice(0, 16) }, customerVisible: true, timestamp: consent.grantedAt });
    rec({ type: "FINANCIAL_PROFILE_GENERATED", actor: SYSTEM_ACTOR, businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Financial profile", metadata: { coverageMonths: profile.coverageMonths, institutions: profile.institutionsConnected }, customerVisible: true, timestamp: profile.generatedAt });
    rec({ type: "ASSESSMENT_CREATED", actor: SYSTEM_ACTOR, businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Credit assessment", metadata: { score: assessment.score, modelVersion: assessment.modelVersion, policyVersion: policy.version }, customerVisible: true, timestamp: assessment.generatedAt });
    rec({ type: "APPLICATION_SUBMITTED", actor: { id: `sme_${spec.key}`, name: spec.name, role: "SME_USER" }, businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Application", metadata: { amount: requested, tenorMonths: spec.tenor }, customerVisible: true, timestamp: app.submittedAt });

    if (spec.status !== "submitted") {
      const reviewAt = iso(at(addDays(submitted, 1 > spec.daysAgo ? 0 : 1), 10, 44));
      app.status = baseStatus === "submitted" ? "under_review" : (baseStatus as LoanApplication["status"]);
      app.reviewerId = officer.id;
      app.reviewerName = officer.name;
      app.firstReviewedAt = reviewAt;
      app.updatedAt = reviewAt;
      rec({ type: "APPLICATION_REVIEW_STARTED", actor: actor(officer), businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Application", metadata: {}, customerVisible: true, timestamp: reviewAt });
      rec({ type: "DATA_ACCESS", actor: actor(officer), businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Financial profile", metadata: { view: "bank_review" }, customerVisible: true, timestamp: iso(new Date(new Date(reviewAt).getTime() + 15_000)) });
    }

    if (spec.status === "additional_information") {
      const reqAt = iso(at(addDays(submitted, 1), 14, 12));
      app.informationRequest = { items: ["Updated financial statement", "Contract/invoice"], message: "Please share the signed supply contract referenced in the application and management accounts for the last quarter.", requestedAt: reqAt, requestedById: officer.id, requestedByName: officer.name };
      app.updatedAt = reqAt;
      rec({ type: "INFORMATION_REQUESTED", actor: actor(officer), businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Application", metadata: { items: 2 }, customerVisible: true, timestamp: reqAt });
    }

    if (spec.status === "rejected") {
      const decAt = iso(at(addDays(submitted, 2), 15, 30));
      app.decision = { outcome: "rejected", byId: officer.id, byName: officer.name, at: decAt, note: assessment.recommendation.headline };
      app.updatedAt = decAt;
      rec({ type: "APPLICATION_REJECTED", actor: actor(officer), businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Application", metadata: { score: assessment.score }, customerVisible: true, timestamp: decAt });
    }

    const approvedStatuses = ["approved", "disbursement_pending", "disbursed", "disbursed_watch", "disbursed_at_risk"];
    if (approvedStatuses.includes(spec.status)) {
      const decAt = iso(at(addDays(submitted, 1), 10, 47));
      app.decision = { outcome: "approved", byId: officer.id, byName: officer.name, at: decAt };
      app.updatedAt = decAt;
      rec({ type: "APPLICATION_APPROVED", actor: actor(officer), businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Application", metadata: { amount: requested, tenorMonths: spec.tenor, totalRepayable: offer.totalRepayable }, customerVisible: true, timestamp: decAt });
      const primary = data.accounts[0];
      if (spec.status === "approved") {
        app.status = "approved";
      } else {
        app.status = "disbursement_pending";
        app.disbursement = { status: "pending", destinationAccountId: primary.id, destinationMasked: primary.accountNumberMasked, institutionName: primary.institutionName, attempts: 0 };
      }
      if (spec.status.startsWith("disbursed")) {
        const disbAt = iso(at(addDays(submitted, 2), 9, 15));
        const dref = `DSB-${disbAt.slice(0, 10).replace(/-/g, "")}-${shape.seed.toString(36).toUpperCase().slice(0, 6)}`;
        app.status = "disbursed";
        app.disbursement = { status: "confirmed", destinationAccountId: primary.id, destinationMasked: primary.accountNumberMasked, institutionName: primary.institutionName, attempts: 1, reference: dref, confirmedAt: disbAt, lastAttemptAt: disbAt };
        app.updatedAt = disbAt;
        rec({ type: "DISBURSEMENT_INITIATED", actor: actor(ops), businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Disbursement", metadata: { amount: requested, destination: primary.accountNumberMasked }, customerVisible: true, timestamp: iso(new Date(new Date(disbAt).getTime() - 20_000)) });
        rec({ type: "DISBURSEMENT_CONFIRMED", actor: SYSTEM_ACTOR, businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Disbursement", metadata: { amount: requested, reference: dref }, customerVisible: true, timestamp: disbAt });

        const planId = `plan_${spec.key}`;
        const schedule = buildSchedule({ offer, policy, disbursedAt: new Date(disbAt), planId, businessId: bizId });
        const mandate = `MND-${shape.seed.toString(36).toUpperCase().slice(0, 7)}`;
        rec({ type: "MANDATE_CREATED", actor: SYSTEM_ACTOR, businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Repayment mandate", metadata: { mandate, instalments: schedule.length }, customerVisible: true, timestamp: iso(new Date(new Date(disbAt).getTime() + 5_000)) });

        let health: RepaymentPlan["health"] = "healthy";
        let failedCount = 0;
        for (const r of schedule) {
          const due = new Date(r.dueDate);
          if (due <= now) {
            const shouldFail = spec.status === "disbursed_at_risk" && r.sequence === schedule.filter((s) => new Date(s.dueDate) <= now).length;
            if (shouldFail) {
              r.status = "failed";
              r.attempts = 2;
              r.failureReason = "Insufficient available balance";
              failedCount += 1;
              const failAt = iso(at(due, 6, 5));
              rec({ type: "REPAYMENT_FAILED", actor: SYSTEM_ACTOR, businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Repayment", metadata: { sequence: r.sequence, amount: r.amount, reason: r.failureReason }, customerVisible: true, timestamp: failAt });
              const rev: RiskEvent = { id: `re_${spec.key}`, businessId: bizId, applicationId: appId, type: "repayment_failed", severity: "Medium", description: `Scheduled repayment ${r.sequence} of ${schedule.length} (${formatNaira(r.amount)}) failed after ${r.attempts} debit attempts: ${r.failureReason}.`, createdAt: failAt };
              out.caseSequence += 1;
              const caseId = `case_${spec.key}`;
              rev.caseId = caseId;
              out.riskEvents.push(rev);
              out.cases.push({
                id: caseId,
                reference: caseReference(year, out.caseSequence),
                riskEventId: rev.id,
                businessId: bizId,
                applicationId: appId,
                severity: "Medium",
                trigger: "Repayment failure",
                createdAt: failAt,
                owner: "Credit Operations",
                status: "open",
                notes: [],
                history: [{ at: failAt, byName: "Ìrètí platform", action: "Case opened from repayment failure event" }],
              });
              rec({ type: "RISK_EVENT_CREATED", actor: SYSTEM_ACTOR, businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Risk case", metadata: { caseRef: caseReference(year, out.caseSequence), severity: "Medium", trigger: "Repayment failure" }, customerVisible: false, timestamp: failAt });
            } else {
              r.status = "paid";
              r.attempts = 1;
              r.paidAt = iso(at(due, 6, 2));
              r.reference = `RPY-${shape.seed.toString(36).toUpperCase().slice(0, 4)}${r.sequence}`;
              rec({ type: "REPAYMENT_PROCESSED", actor: SYSTEM_ACTOR, businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Repayment", metadata: { sequence: r.sequence, amount: r.amount, reference: r.reference }, customerVisible: true, timestamp: r.paidAt });
            }
          }
        }
        if (failedCount >= policy.riskThresholds.failedDebitsAtRisk) health = "at_risk";
        if (spec.status === "disbursed_watch") {
          health = "watch";
          const evAt = iso(addDays(now, -3));
          const rev: RiskEvent = { id: `re_${spec.key}`, businessId: bizId, applicationId: appId, type: "reduced_inflows", severity: "Low", description: `Inflows over the last 30 days are ${Math.round((1 - shape.recentTrend) * 100)}% below the observed baseline for this business.`, createdAt: evAt };
          out.caseSequence += 1;
          const caseId = `case_${spec.key}`;
          rev.caseId = caseId;
          out.riskEvents.push(rev);
          out.cases.push({
            id: caseId,
            reference: caseReference(year, out.caseSequence),
            riskEventId: rev.id,
            businessId: bizId,
            applicationId: appId,
            severity: "Low",
            trigger: "Reduced inflows",
            createdAt: evAt,
            owner: "Risk",
            assigneeName: risk.name,
            status: "assigned",
            notes: [{ at: iso(addDays(now, -2)), byName: risk.name, text: "Seasonal pattern consistent with prior year. Monitoring next settlement window before any action." }],
            history: [
              { at: evAt, byName: "Ìrètí platform", action: "Case opened from reduced-inflow trigger" },
              { at: iso(addDays(now, -2)), byName: risk.name, action: `Assigned to ${risk.name}` },
            ],
          });
          rec({ type: "RISK_EVENT_CREATED", actor: SYSTEM_ACTOR, businessId: bizId, applicationId: appId, applicationRef: ref, resource: "Risk case", metadata: { caseRef: caseReference(year, out.caseSequence), severity: "Low", trigger: "Reduced inflows" }, customerVisible: false, timestamp: evAt });
        }
        const paid = schedule.filter((r) => r.status === "paid").reduce((a, r) => a + r.amount, 0);
        const plan: RepaymentPlan = {
          id: planId,
          applicationId: appId,
          businessId: bizId,
          offerId: offer.id,
          mandateReference: mandate,
          principal: requested,
          totalRepayable: offer.totalRepayable,
          outstanding: offer.totalRepayable - paid,
          paidToDate: paid,
          health,
          startedAt: disbAt,
          repaymentIds: schedule.map((r) => r.id),
        };
        app.repaymentPlanId = planId;
        out.plans.push(plan);
        out.repayments.push(...schedule);
      }
    }
    out.applications.push(app);
  }

  // A handful of bank notifications so the centre is populated.
  const newest = out.applications.filter((a) => a.status === "submitted").slice(-3);
  for (const a of newest) {
    const b = out.businesses.find((x) => x.id === a.businessId)!;
    out.notifications.push({ id: `n_${a.id}`, audience: "bank", type: "application_submitted", title: "New application", body: `${b.name} submitted ${a.reference} for ${formatNaira(a.amount)}.`, createdAt: a.submittedAt, read: false, href: `/bank/applications/${a.id}` });
  }
  for (const c of out.cases) {
    out.notifications.push({ id: `n_${c.id}`, audience: "bank", type: "risk_event_created", title: `Risk case ${c.reference}`, body: `${c.trigger} — ${out.businesses.find((b) => b.id === c.businessId)?.name}.`, createdAt: c.createdAt, read: c.status !== "open", href: `/bank/monitoring/${c.id}` });
  }

  out.auditEvents = chain;
  return out;
}

export const DEMO_INSTITUTIONS = INSTITUTIONS;
