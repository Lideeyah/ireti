"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AuditEvent,
  BankAccount,
  BankConnection,
  BankPolicy,
  Business,
  Case,
  Consent,
  CreditAssessment,
  DocumentRecord,
  FinancialProfile,
  LoanApplication,
  LoanOffer,
  LoanPurpose,
  Notification,
  NotificationType,
  Repayment,
  RepaymentPlan,
  RiskEvent,
  Role,
  Transaction,
  User,
} from "../domain/types";
import { DEFAULT_POLICY } from "../policy/defaultPolicy";
import { buildSeed, ADEBAYO_BUSINESS_ID, ADEBAYO_PREFILL, USERS, SYSTEM_ACTOR } from "../seed/demoData";
import { institutionById } from "../seed/institutions";
import { buildFinancialProfile } from "../analysis/financialAnalysis";
import { assessCredit } from "../assessment/engine";
import { priceLoan, buildSchedule } from "../loan/pricing";
import { demoAuditLedger, type RecordEventInput } from "../services/auditLedger";
import { demoBankConnectionService } from "../services/bankConnection";
import { demoIdentityService } from "../services/bvn";
import { demoDisbursementService } from "../services/disbursement";
import { demoRepaymentService } from "../services/repayment";
import { applicationReference, caseReference, uid } from "../util/ids";
import { formatNaira, formatDate } from "../format";
import { sha256 } from "../util/sha256";

export interface BusinessDraft {
  name: string;
  cacNumber: string;
  businessType: string;
  industry: string;
  location: string;
  yearsOperating: string;
  declaredMonthlyRevenue: string;
}

export interface DB {
  seededAt: string | null;
  businesses: Business[];
  connections: BankConnection[];
  accounts: BankAccount[];
  transactions: Transaction[];
  profiles: FinancialProfile[];
  assessments: CreditAssessment[];
  offers: LoanOffer[];
  applications: LoanApplication[];
  plans: RepaymentPlan[];
  repayments: Repayment[];
  riskEvents: RiskEvent[];
  cases: Case[];
  consents: Consent[];
  documents: DocumentRecord[];
  auditEvents: AuditEvent[];
  notifications: Notification[];
  policy: BankPolicy;
  applicationSequence: number;
  caseSequence: number;
}

export interface Onboarding {
  step: number; // 0..4
  draft: BusinessDraft;
  selectedInstitutions: string[];
  analysisDone: boolean;
}

export const ANALYSIS_STEPS = [
  "Retrieving transaction history",
  "Analysing revenue consistency",
  "Analysing expenses",
  "Analysing cash-flow behaviour",
  "Assessing credit behaviour",
  "Calculating eligibility",
];

export interface AppState {
  db: DB;
  bankUserId: string;
  onboarding: Onboarding;
  /** Non-sensitive per-tab memory to avoid duplicate access events in one sitting. */
  lastAccessLog: Record<string, string>;

  // Session
  setBankUser: (id: string) => void;
  currentBankUser: () => User;

  // Onboarding / SME
  setOnboardingStep: (step: number) => void;
  updateDraft: (patch: Partial<BusinessDraft>) => void;
  prefillDraft: () => void;
  saveBusiness: () => Business;
  verifyIdentity: (bvn: string) => Promise<{ verified: boolean; reason?: string }>;
  toggleInstitution: (institutionId: string) => void;
  connectInstitution: (institutionId: string, opts?: { simulateFailure?: boolean }) => Promise<boolean>;
  retryConnection: (connectionId: string) => Promise<boolean>;
  disconnectInstitution: (connectionId: string) => Promise<void>;
  runAnalysis: (onProgress: (stepIndex: number) => void) => Promise<CreditAssessment>;
  submitApplication: (input: { amount: number; purpose: LoanPurpose; tenorMonths: number }) => Promise<LoanApplication>;
  provideInformation: (applicationId: string) => void;
  reportAccess: (applicationId: string, eventSeq?: number) => Case;

  // Bank
  openApplicationForReview: (applicationId: string) => void;
  requestInformation: (applicationId: string, items: string[], message?: string) => void;
  approveApplication: (applicationId: string) => Promise<void>;
  rejectApplication: (applicationId: string, note: string) => void;
  initiateDisbursement: (applicationId: string, force?: "success" | "failure") => Promise<"confirmed" | "failed">;
  escalateDisbursement: (applicationId: string) => Case;
  processRepayment: (repaymentId: string, force?: "success" | "failure") => Promise<"paid" | "failed">;
  assignCase: (caseId: string, assigneeName: string) => void;
  addCaseNote: (caseId: string, text: string) => void;
  escalateCase: (caseId: string) => void;
  resolveCase: (caseId: string, note: string) => void;
  updatePolicy: (patch: Partial<BankPolicy>) => void;
  markNotificationsRead: (audience: "sme" | "bank") => void;

  // Demo controls
  resetDemo: () => void;
  loadSampleApplication: () => Promise<void>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const EMPTY_DRAFT: BusinessDraft = { name: "", cacNumber: "", businessType: "", industry: "", location: "", yearsOperating: "", declaredMonthlyRevenue: "" };

function freshDb(): DB {
  const policy = DEFAULT_POLICY;
  const seed = buildSeed(policy);
  return {
    seededAt: new Date().toISOString(),
    businesses: seed.businesses,
    connections: seed.connections,
    accounts: seed.accounts,
    transactions: [],
    profiles: seed.profiles,
    assessments: seed.assessments,
    offers: seed.offers,
    applications: seed.applications,
    plans: seed.plans,
    repayments: seed.repayments,
    riskEvents: seed.riskEvents,
    cases: seed.cases,
    consents: seed.consents,
    documents: [],
    auditEvents: seed.auditEvents,
    notifications: seed.notifications,
    policy,
    applicationSequence: seed.applicationSequence,
    caseSequence: seed.caseSequence,
  };
}

const SME_ACTOR = { id: "u_sme", name: "Folake Adebayo", role: "SME_USER" as Role };

export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      /** Append an audit event to the chain (immutable: we only ever push). */
      const audit = (db: DB, input: RecordEventInput): AuditEvent => {
        const e = demoAuditLedger.record(db.auditEvents, input);
        db.auditEvents = [...db.auditEvents, e];
        return e;
      };
      const notify = (db: DB, audience: "sme" | "bank", type: NotificationType, title: string, body: string, href?: string) => {
        db.notifications = [{ id: uid("n"), audience, type, title, body, createdAt: new Date().toISOString(), read: false, href }, ...db.notifications];
      };
      const mutate = (fn: (db: DB) => void) => {
        const db = { ...get().db };
        fn(db);
        set({ db });
      };
      const bankActor = () => {
        const u = get().currentBankUser();
        return { id: u.id, name: u.name, role: u.role };
      };
      const appById = (db: DB, id: string) => {
        const a = db.applications.find((x) => x.id === id);
        if (!a) throw new Error("Application not found");
        return a;
      };
      const replaceApp = (db: DB, app: LoanApplication) => {
        app.updatedAt = new Date().toISOString();
        db.applications = db.applications.map((a) => (a.id === app.id ? app : a));
      };
      const replaceCase = (db: DB, c: Case) => {
        db.cases = db.cases.map((x) => (x.id === c.id ? c : x));
      };
      const openCase = (db: DB, input: { businessId: string; applicationId?: string; type: RiskEvent["type"]; severity: Case["severity"]; trigger: string; description: string; owner: string; actor: RecordEventInput["actor"]; customerVisible?: boolean }) => {
        const now = new Date().toISOString();
        db.caseSequence += 1;
        const caseId = uid("case");
        const rev: RiskEvent = { id: uid("re"), businessId: input.businessId, applicationId: input.applicationId, type: input.type, severity: input.severity, description: input.description, createdAt: now, caseId };
        const app = input.applicationId ? db.applications.find((a) => a.id === input.applicationId) : undefined;
        const c: Case = {
          id: caseId,
          reference: caseReference(new Date().getFullYear(), db.caseSequence),
          riskEventId: rev.id,
          businessId: input.businessId,
          applicationId: input.applicationId,
          severity: input.severity,
          trigger: input.trigger,
          createdAt: now,
          owner: input.owner,
          status: "open",
          notes: [],
          history: [{ at: now, byName: input.actor.name, action: `Case opened: ${input.trigger}` }],
        };
        db.riskEvents = [rev, ...db.riskEvents];
        db.cases = [c, ...db.cases];
        audit(db, { type: input.type === "access_dispute" ? "ACCESS_REPORTED" : "RISK_EVENT_CREATED", actor: input.actor, businessId: input.businessId, applicationId: input.applicationId, applicationRef: app?.reference, resource: "Risk case", metadata: { caseRef: c.reference, severity: c.severity, trigger: c.trigger }, customerVisible: input.customerVisible ?? false });
        const biz = db.businesses.find((b) => b.id === input.businessId);
        notify(db, "bank", "risk_event_created", `Risk case ${c.reference}`, `${input.trigger} — ${biz?.name ?? "business"}.`, `/bank/monitoring/${c.id}`);
        return c;
      };

      return {
        db: freshDb(),
        bankUserId: "u_officer",
        onboarding: { step: 0, draft: EMPTY_DRAFT, selectedInstitutions: [], analysisDone: false },
        lastAccessLog: {},

        setBankUser: (id) => set({ bankUserId: id }),
        currentBankUser: () => USERS.find((u) => u.id === get().bankUserId) ?? USERS[1],

        setOnboardingStep: (step) => set({ onboarding: { ...get().onboarding, step } }),
        updateDraft: (patch) => set({ onboarding: { ...get().onboarding, draft: { ...get().onboarding.draft, ...patch } } }),
        prefillDraft: () =>
          set({
            onboarding: {
              ...get().onboarding,
              draft: {
                name: ADEBAYO_PREFILL.name,
                cacNumber: ADEBAYO_PREFILL.cacNumber,
                businessType: ADEBAYO_PREFILL.businessType,
                industry: ADEBAYO_PREFILL.industry,
                location: ADEBAYO_PREFILL.location,
                yearsOperating: String(ADEBAYO_PREFILL.yearsOperating),
                declaredMonthlyRevenue: String(ADEBAYO_PREFILL.declaredMonthlyRevenue),
              },
            },
          }),

        saveBusiness: () => {
          const d = get().onboarding.draft;
          const existing = get().db.businesses.find((b) => b.id === ADEBAYO_BUSINESS_ID);
          const biz: Business = {
            id: ADEBAYO_BUSINESS_ID,
            organisationId: "org_adebayo",
            name: d.name.trim(),
            cacNumber: d.cacNumber.trim(),
            cacStatus: "Active",
            businessType: d.businessType,
            industry: d.industry,
            location: d.location.trim(),
            yearsOperating: Number(d.yearsOperating),
            declaredMonthlyRevenue: Number(d.declaredMonthlyRevenue),
            identityVerified: existing?.identityVerified ?? false,
            identityVerifiedAt: existing?.identityVerifiedAt,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
          };
          mutate((db) => {
            db.businesses = existing ? db.businesses.map((b) => (b.id === biz.id ? biz : b)) : [...db.businesses, biz];
          });
          set({ onboarding: { ...get().onboarding, step: 1 } });
          return biz;
        },

        verifyIdentity: async (bvn) => {
          const result = await demoIdentityService.verifyBvn(bvn);
          if (result.verified) {
            mutate((db) => {
              const now = new Date().toISOString();
              db.businesses = db.businesses.map((b) => (b.id === ADEBAYO_BUSINESS_ID ? { ...b, identityVerified: true, identityVerifiedAt: now } : b));
              audit(db, { type: "IDENTITY_VERIFIED", actor: SME_ACTOR, businessId: ADEBAYO_BUSINESS_ID, resource: "Identity", metadata: { method: "BVN", provider: "demo" }, customerVisible: true });
              notify(db, "sme", "identity_verified", "Identity verified", "Your identity was verified. You can now connect your business accounts.", "/sme/onboarding");
            });
          }
          return result;
        },

        toggleInstitution: (institutionId) => {
          const sel = get().onboarding.selectedInstitutions;
          set({ onboarding: { ...get().onboarding, selectedInstitutions: sel.includes(institutionId) ? sel.filter((i) => i !== institutionId) : [...sel, institutionId] } });
        },

        connectInstitution: async (institutionId, opts) => {
          const institution = institutionById(institutionId);
          const existing = get().db.connections.find((c) => c.businessId === ADEBAYO_BUSINESS_ID && c.institutionId === institutionId);
          const connectionId = existing?.id ?? uid("conn");
          mutate((db) => {
            const conn: BankConnection = { id: connectionId, businessId: ADEBAYO_BUSINESS_ID, institutionId, institutionName: institution.name, status: "connecting", provider: "demo-open-banking" };
            db.connections = existing ? db.connections.map((c) => (c.id === connectionId ? conn : c)) : [...db.connections, conn];
          });
          const result = await demoBankConnectionService.connectBank({ businessId: ADEBAYO_BUSINESS_ID, institutionId, connectionId, asOf: new Date(), seedKey: "adebayo", simulateFailure: opts?.simulateFailure });
          mutate((db) => {
            const conn = db.connections.find((c) => c.id === connectionId)!;
            if (!result.ok) {
              db.connections = db.connections.map((c) => (c.id === connectionId ? { ...conn, status: "failed", failureReason: result.reason } : c));
              audit(db, { type: "ACCOUNT_CONNECTION_FAILED", actor: SME_ACTOR, businessId: ADEBAYO_BUSINESS_ID, resource: `Connection — ${institution.name}`, metadata: { institution: institution.name }, customerVisible: true });
              return;
            }
            const now = new Date().toISOString();
            const consent: Consent = { id: uid("consent"), businessId: ADEBAYO_BUSINESS_ID, scope: ["account_information", "transaction_history_12m", "balance"], grantedAt: now, grantedByName: SME_ACTOR.name, hash: sha256(`${ADEBAYO_BUSINESS_ID}|${institutionId}|${now}`) };
            db.consents = [...db.consents, consent];
            db.connections = db.connections.map((c) => (c.id === connectionId ? { ...conn, status: "connected", connectedAt: now, lastSyncedAt: now, consentId: consent.id, failureReason: undefined } : c));
            db.accounts = [...db.accounts.filter((a) => a.connectionId !== connectionId), ...(result.accounts ?? [])];
            const accountIds = new Set((result.accounts ?? []).map((a) => a.id));
            db.transactions = [...db.transactions.filter((t) => !accountIds.has(t.accountId)), ...(result.transactions ?? [])];
            audit(db, { type: "CONSENT_RECORDED", actor: SME_ACTOR, businessId: ADEBAYO_BUSINESS_ID, resource: `Open Banking consent — ${institution.name}`, metadata: { scopes: consent.scope.length, consentHash: consent.hash.slice(0, 16) }, customerVisible: true });
            audit(db, { type: "ACCOUNT_CONNECTED", actor: SME_ACTOR, businessId: ADEBAYO_BUSINESS_ID, resource: `Connection — ${institution.name}`, metadata: { institution: institution.name, accounts: result.accounts?.length ?? 0 }, customerVisible: true });
            notify(db, "sme", "account_connected", "Account connected", `${institution.name} account ending ${result.accounts?.[0]?.accountNumberMasked.slice(-4)} is now connected.`, "/sme/onboarding");
          });
          return result.ok;
        },

        retryConnection: async (connectionId) => {
          const conn = get().db.connections.find((c) => c.id === connectionId);
          if (!conn) return false;
          return get().connectInstitution(conn.institutionId);
        },

        disconnectInstitution: async (connectionId) => {
          await demoBankConnectionService.disconnectBank(connectionId);
          mutate((db) => {
            const accountIds = new Set(db.accounts.filter((a) => a.connectionId === connectionId).map((a) => a.id));
            db.connections = db.connections.filter((c) => c.id !== connectionId);
            db.accounts = db.accounts.filter((a) => a.connectionId !== connectionId);
            db.transactions = db.transactions.filter((t) => !accountIds.has(t.accountId));
          });
        },

        runAnalysis: async (onProgress) => {
          for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
            onProgress(i);
            await delay(i === 0 ? 1100 : 750);
          }
          const { db } = get();
          const accounts = db.accounts.filter((a) => a.businessId === ADEBAYO_BUSINESS_ID);
          const transactions = db.transactions.filter((t) => t.businessId === ADEBAYO_BUSINESS_ID);
          const connected = db.connections.filter((c) => c.businessId === ADEBAYO_BUSINESS_ID && c.status === "connected").length;
          const profile = buildFinancialProfile({ businessId: ADEBAYO_BUSINESS_ID, transactions, accounts, asOf: new Date(), institutionsConnected: connected });
          const assessment = assessCredit(profile, db.policy);
          mutate((d) => {
            d.profiles = [...d.profiles.filter((p) => p.businessId !== ADEBAYO_BUSINESS_ID), profile];
            d.assessments = [...d.assessments.filter((a) => a.businessId !== ADEBAYO_BUSINESS_ID || d.applications.some((app) => app.assessmentId === a.id)), assessment];
            audit(d, { type: "FINANCIAL_PROFILE_GENERATED", actor: SYSTEM_ACTOR, businessId: ADEBAYO_BUSINESS_ID, resource: "Financial profile", metadata: { coverageMonths: profile.coverageMonths, institutions: connected }, customerVisible: true });
            audit(d, { type: "ASSESSMENT_CREATED", actor: SYSTEM_ACTOR, businessId: ADEBAYO_BUSINESS_ID, resource: "Credit assessment", metadata: { score: assessment.score, modelVersion: assessment.modelVersion, policyVersion: d.policy.version }, customerVisible: true });
            notify(d, "sme", "analysis_completed", "Financial analysis completed", `Your financial profile and credit assessment are ready. Eligible amount: ${formatNaira(assessment.eligibleAmount)}.`, "/sme/credit-profile");
          });
          set({ onboarding: { ...get().onboarding, analysisDone: true, step: 4 } });
          return assessment;
        },

        submitApplication: async ({ amount, purpose, tenorMonths }) => {
          await delay(1200);
          const { db } = get();
          const assessment = [...db.assessments].reverse().find((a) => a.businessId === ADEBAYO_BUSINESS_ID);
          if (!assessment) throw new Error("No assessment available");
          if (amount > assessment.eligibleAmount) throw new Error("Amount exceeds eligibility");
          if (!db.policy.allowedTenors.includes(tenorMonths)) throw new Error("Tenor not permitted by policy");
          const offer = priceLoan({ principal: amount, tenorMonths, policy: db.policy, businessId: ADEBAYO_BUSINESS_ID, repaymentWindow: assessment.repaymentWindow, recommendedRepaymentDay: assessment.recommendedRepaymentDay });
          const now = new Date().toISOString();
          const appId = uid("app");
          offer.applicationId = appId;
          const consent: Consent = { id: uid("consent"), businessId: ADEBAYO_BUSINESS_ID, applicationId: appId, scope: ["financial_data_access", "account_connection", "repayment_authorisation", "terms"], grantedAt: now, grantedByName: SME_ACTOR.name, hash: sha256(`${ADEBAYO_BUSINESS_ID}|${appId}|${now}`) };
          const seq = db.applicationSequence + 1;
          const app: LoanApplication = {
            id: appId,
            reference: applicationReference(new Date().getFullYear(), seq),
            businessId: ADEBAYO_BUSINESS_ID,
            assessmentId: assessment.id,
            offerId: offer.id,
            amount,
            purpose,
            tenorMonths,
            status: "submitted",
            submittedAt: now,
            updatedAt: now,
            consentId: consent.id,
          };
          const biz = db.businesses.find((b) => b.id === ADEBAYO_BUSINESS_ID);
          mutate((d) => {
            d.applicationSequence = seq;
            d.offers = [...d.offers, offer];
            d.consents = [...d.consents, consent];
            d.applications = [...d.applications, app];
            audit(d, { type: "CONSENT_RECORDED", actor: SME_ACTOR, businessId: ADEBAYO_BUSINESS_ID, applicationId: appId, applicationRef: app.reference, resource: "Consent", metadata: { scopes: consent.scope.length, consentHash: consent.hash.slice(0, 16) }, customerVisible: true });
            audit(d, { type: "APPLICATION_SUBMITTED", actor: SME_ACTOR, businessId: ADEBAYO_BUSINESS_ID, applicationId: appId, applicationRef: app.reference, resource: "Application", metadata: { amount, tenorMonths, totalRepayable: offer.totalRepayable }, customerVisible: true });
            notify(d, "sme", "application_submitted", "Application submitted", `${app.reference} for ${formatNaira(amount)} is under review.`, `/sme/application/${appId}`);
            notify(d, "bank", "application_submitted", "New application", `${biz?.name ?? "Business"} submitted ${app.reference} for ${formatNaira(amount)}.`, `/bank/applications/${appId}`);
          });
          return app;
        },

        provideInformation: (applicationId) => {
          mutate((db) => {
            const app = { ...appById(db, applicationId) };
            if (!app.informationRequest) return;
            const now = new Date().toISOString();
            app.informationRequest = { ...app.informationRequest, respondedAt: now };
            app.status = "under_review";
            for (const item of app.informationRequest.items) {
              db.documents = [...db.documents, { id: uid("doc"), businessId: app.businessId, applicationId, type: item, name: `${item} — provided ${formatDate(now)}`, status: "provided", providedAt: now }];
            }
            replaceApp(db, app);
            audit(db, { type: "INFORMATION_PROVIDED", actor: SME_ACTOR, businessId: app.businessId, applicationId, applicationRef: app.reference, resource: "Application", metadata: { items: app.informationRequest.items.length }, customerVisible: true });
            notify(db, "bank", "information_provided", "Information provided", `${app.reference}: requested documents have been provided.`, `/bank/applications/${applicationId}`);
          });
        },

        reportAccess: (applicationId, eventSeq) => {
          let created!: Case;
          mutate((db) => {
            const app = appById(db, applicationId);
            created = openCase(db, { businessId: app.businessId, applicationId, type: "access_dispute", severity: "Medium", trigger: "Customer reported unusual access", description: `The applicant flagged access to their financial profile${eventSeq ? ` (ledger event #${eventSeq})` : ""} as unexpected. Compliance review required.`, owner: "Compliance", actor: SME_ACTOR, customerVisible: true });
          });
          return created;
        },

        openApplicationForReview: (applicationId) => {
          const actor = bankActor();
          const key = `${actor.id}:${applicationId}`;
          const last = get().lastAccessLog[key];
          const recently = last && Date.now() - new Date(last).getTime() < 15 * 60 * 1000;
          mutate((db) => {
            const app = { ...appById(db, applicationId) };
            const biz = db.businesses.find((b) => b.id === app.businessId);
            let changed = false;
            if (app.status === "submitted") {
              app.status = "under_review";
              app.reviewerId = actor.id;
              app.reviewerName = actor.name;
              app.firstReviewedAt = new Date().toISOString();
              changed = true;
              audit(db, { type: "APPLICATION_REVIEW_STARTED", actor, businessId: app.businessId, applicationId, applicationRef: app.reference, resource: "Application", metadata: {}, customerVisible: true });
              notify(db, "sme", "application_viewed", "Application under review", `${app.reference} is being reviewed by the bank.`, `/sme/application/${applicationId}`);
            }
            if (!recently) {
              audit(db, { type: "DATA_ACCESS", actor, businessId: app.businessId, applicationId, applicationRef: app.reference, resource: "Financial profile", metadata: { view: "bank_review", business: biz?.name ?? "" }, customerVisible: true });
            }
            if (changed) replaceApp(db, app);
          });
          if (!recently) set({ lastAccessLog: { ...get().lastAccessLog, [key]: new Date().toISOString() } });
        },

        requestInformation: (applicationId, items, message) => {
          const actor = bankActor();
          mutate((db) => {
            const app = { ...appById(db, applicationId) };
            app.status = "additional_information";
            app.informationRequest = { items, message, requestedAt: new Date().toISOString(), requestedById: actor.id, requestedByName: actor.name };
            for (const item of items) {
              db.documents = [...db.documents, { id: uid("doc"), businessId: app.businessId, applicationId, type: item, name: item, status: "requested" }];
            }
            replaceApp(db, app);
            audit(db, { type: "INFORMATION_REQUESTED", actor, businessId: app.businessId, applicationId, applicationRef: app.reference, resource: "Application", metadata: { items: items.length }, customerVisible: true });
            notify(db, "sme", "information_requested", "Additional information requested", `The bank has requested: ${items.join(", ")}.`, `/sme/application/${applicationId}`);
          });
        },

        approveApplication: async (applicationId) => {
          const actor = bankActor();
          await delay(1600); // Submitting approval to banking system
          mutate((db) => {
            const app = { ...appById(db, applicationId) };
            const offer = db.offers.find((o) => o.id === app.offerId)!;
            const primary = db.accounts.filter((a) => a.businessId === app.businessId)[0];
            app.status = "approved";
            app.decision = { outcome: "approved", byId: actor.id, byName: actor.name, at: new Date().toISOString() };
            replaceApp(db, app);
            audit(db, { type: "APPLICATION_APPROVED", actor, businessId: app.businessId, applicationId, applicationRef: app.reference, resource: "Application", metadata: { amount: app.amount, tenorMonths: app.tenorMonths, totalRepayable: offer.totalRepayable }, customerVisible: true });
            notify(db, "sme", "application_approved", "Application approved", `${app.reference} for ${formatNaira(app.amount)} has been approved. Disbursement is being prepared.`, `/sme/application/${applicationId}`);
            // Move straight to disbursement preparation
            app.status = "disbursement_pending";
            app.disbursement = { status: "pending", destinationAccountId: primary?.id ?? "", destinationMasked: primary?.accountNumberMasked ?? "•••• ----", institutionName: primary?.institutionName ?? "", attempts: 0 };
            replaceApp(db, app);
          });
        },

        rejectApplication: (applicationId, note) => {
          const actor = bankActor();
          mutate((db) => {
            const app = { ...appById(db, applicationId) };
            app.status = "rejected";
            app.decision = { outcome: "rejected", byId: actor.id, byName: actor.name, at: new Date().toISOString(), note };
            replaceApp(db, app);
            audit(db, { type: "APPLICATION_REJECTED", actor, businessId: app.businessId, applicationId, applicationRef: app.reference, resource: "Application", metadata: { reasonLength: note.length }, customerVisible: true });
            notify(db, "sme", "application_rejected", "Application not approved", `${app.reference} was not approved. ${note}`, `/sme/application/${applicationId}`);
          });
        },

        initiateDisbursement: async (applicationId, force) => {
          const actor = bankActor();
          mutate((db) => {
            const app = { ...appById(db, applicationId) };
            app.disbursement = { ...app.disbursement!, status: "processing", attempts: (app.disbursement?.attempts ?? 0) + 1, lastAttemptAt: new Date().toISOString() };
            app.status = "disbursement_pending";
            replaceApp(db, app);
            audit(db, { type: "DISBURSEMENT_INITIATED", actor, businessId: app.businessId, applicationId, applicationRef: app.reference, resource: "Disbursement", metadata: { amount: app.amount, destination: app.disbursement.destinationMasked, attempt: app.disbursement.attempts }, customerVisible: true });
          });
          const app0 = appById(get().db, applicationId);
          const outcome = await demoDisbursementService.initiateDisbursement({ applicationRef: app0.reference, amount: app0.amount, destinationAccountId: app0.disbursement!.destinationAccountId, forceOutcome: force });
          let result: "confirmed" | "failed" = "failed";
          if (outcome.status === "confirmed") {
            const mandate = await demoRepaymentService.createMandate({ businessId: app0.businessId, accountId: app0.disbursement!.destinationAccountId, amount: app0.amount });
            result = "confirmed";
            mutate((db) => {
              const app = { ...appById(db, applicationId) };
              const offer = db.offers.find((o) => o.id === app.offerId)!;
              app.status = "disbursed";
              app.disbursement = { ...app.disbursement!, status: "confirmed", reference: outcome.reference, confirmedAt: outcome.at, failureReason: undefined };
              const planId = uid("plan");
              const schedule = buildSchedule({ offer, policy: db.policy, disbursedAt: new Date(outcome.at), planId, businessId: app.businessId });
              const plan: RepaymentPlan = { id: planId, applicationId, businessId: app.businessId, offerId: offer.id, mandateReference: mandate.mandateReference, principal: app.amount, totalRepayable: offer.totalRepayable, outstanding: offer.totalRepayable, paidToDate: 0, health: "healthy", startedAt: outcome.at, repaymentIds: schedule.map((r) => r.id) };
              app.repaymentPlanId = planId;
              db.plans = [...db.plans, plan];
              db.repayments = [...db.repayments, ...schedule];
              replaceApp(db, app);
              audit(db, { type: "DISBURSEMENT_CONFIRMED", actor: SYSTEM_ACTOR, businessId: app.businessId, applicationId, applicationRef: app.reference, resource: "Disbursement", metadata: { amount: app.amount, reference: outcome.reference }, customerVisible: true });
              audit(db, { type: "MANDATE_CREATED", actor: SYSTEM_ACTOR, businessId: app.businessId, applicationId, applicationRef: app.reference, resource: "Repayment mandate", metadata: { mandate: mandate.mandateReference, instalments: schedule.length }, customerVisible: true });
              notify(db, "sme", "disbursement_completed", "Disbursement confirmed", `${formatNaira(app.amount)} was disbursed to ${app.disbursement.destinationMasked}. First repayment due ${formatDate(schedule[0].dueDate)}.`, "/sme/repayments");
              notify(db, "bank", "disbursement_completed", "Disbursement confirmed", `${app.reference}: ${formatNaira(app.amount)} disbursed (${outcome.reference}).`, `/bank/applications/${applicationId}`);
            });
          } else {
            mutate((db) => {
              const app = { ...appById(db, applicationId) };
              app.status = "disbursement_failed";
              app.disbursement = { ...app.disbursement!, status: "failed", failureReason: outcome.reason };
              replaceApp(db, app);
              audit(db, { type: "DISBURSEMENT_FAILED", actor: SYSTEM_ACTOR, businessId: app.businessId, applicationId, applicationRef: app.reference, resource: "Disbursement", metadata: { amount: app.amount, reason: outcome.reason }, customerVisible: true });
              notify(db, "bank", "disbursement_failed", "Disbursement failed", `${app.reference}: ${outcome.reason}`, `/bank/applications/${applicationId}`);
            });
          }
          return result;
        },

        escalateDisbursement: (applicationId) => {
          let created!: Case;
          mutate((db) => {
            const app = appById(db, applicationId);
            created = openCase(db, { businessId: app.businessId, applicationId, type: "unusual_activity", severity: "High", trigger: "Disbursement failure escalated", description: `Disbursement of ${formatNaira(app.amount)} for ${app.reference} failed after ${app.disbursement?.attempts ?? 0} attempt(s): ${app.disbursement?.failureReason ?? "unknown reason"}.`, owner: "Credit Operations", actor: bankActor() });
          });
          return created;
        },

        processRepayment: async (repaymentId, force) => {
          mutate((db) => {
            db.repayments = db.repayments.map((r) => (r.id === repaymentId ? { ...r, status: "processing", attempts: r.attempts + 1 } : r));
          });
          const rep = get().db.repayments.find((r) => r.id === repaymentId)!;
          const outcome = await demoRepaymentService.processRepayment({ repaymentId, amount: rep.amount, forceOutcome: force });
          mutate((db) => {
            const r = { ...db.repayments.find((x) => x.id === repaymentId)! };
            const plan = { ...db.plans.find((p) => p.id === r.planId)! };
            const app = appById(db, plan.applicationId);
            if (outcome.status === "paid") {
              r.status = "paid";
              r.paidAt = outcome.at;
              r.reference = outcome.reference;
              r.failureReason = undefined;
              db.repayments = db.repayments.map((x) => (x.id === r.id ? r : x));
              const all = db.repayments.filter((x) => x.planId === plan.id);
              plan.paidToDate = all.filter((x) => x.status === "paid").reduce((a, x) => a + x.amount, 0);
              plan.outstanding = plan.totalRepayable - plan.paidToDate;
              const anyFailed = all.some((x) => x.status === "failed" || x.status === "overdue");
              plan.health = plan.outstanding <= 0 ? "completed" : anyFailed ? "at_risk" : plan.health === "at_risk" ? "watch" : plan.health;
              db.plans = db.plans.map((p) => (p.id === plan.id ? plan : p));
              audit(db, { type: "REPAYMENT_PROCESSED", actor: SYSTEM_ACTOR, businessId: plan.businessId, applicationId: app.id, applicationRef: app.reference, resource: "Repayment", metadata: { sequence: r.sequence, amount: r.amount, reference: outcome.reference }, customerVisible: true });
              notify(db, "sme", "repayment_successful", "Repayment successful", `Repayment ${r.sequence} of ${formatNaira(r.amount)} was collected.`, "/sme/repayments");
              notify(db, "bank", "repayment_successful", "Repayment collected", `${app.reference}: instalment ${r.sequence} (${formatNaira(r.amount)}) collected.`, `/bank/applications/${app.id}`);
            } else {
              r.status = "failed";
              r.failureReason = outcome.reason;
              db.repayments = db.repayments.map((x) => (x.id === r.id ? r : x));
              const failed = db.repayments.filter((x) => x.planId === plan.id && x.status === "failed").length;
              plan.health = failed >= db.policy.riskThresholds.failedDebitsAtRisk ? "at_risk" : "watch";
              db.plans = db.plans.map((p) => (p.id === plan.id ? plan : p));
              audit(db, { type: "REPAYMENT_FAILED", actor: SYSTEM_ACTOR, businessId: plan.businessId, applicationId: app.id, applicationRef: app.reference, resource: "Repayment", metadata: { sequence: r.sequence, amount: r.amount, reason: outcome.reason, attempt: r.attempts }, customerVisible: true });
              notify(db, "sme", "repayment_failed", "Repayment attention required", `Repayment of ${formatNaira(r.amount)} could not be collected: ${outcome.reason}.`, "/sme/repayments");
              const existingOpen = db.cases.find((c) => c.applicationId === app.id && c.status !== "resolved" && c.trigger === "Repayment failure");
              if (!existingOpen) {
                openCase(db, { businessId: plan.businessId, applicationId: app.id, type: "repayment_failed", severity: "Medium", trigger: "Repayment failure", description: `Scheduled repayment ${r.sequence} (${formatNaira(r.amount)}) failed on attempt ${r.attempts}: ${outcome.reason}.`, owner: "Credit Operations", actor: SYSTEM_ACTOR });
              } else {
                notify(db, "bank", "repayment_failed", "Repayment failed", `${app.reference}: instalment ${r.sequence} failed again (${outcome.reason}).`, `/bank/monitoring/${existingOpen.id}`);
              }
            }
          });
          return outcome.status;
        },

        assignCase: (caseId, assigneeName) => {
          const actor = bankActor();
          mutate((db) => {
            const c = { ...db.cases.find((x) => x.id === caseId)! };
            const now = new Date().toISOString();
            c.assigneeName = assigneeName;
            c.status = c.status === "open" ? "assigned" : c.status;
            c.history = [...c.history, { at: now, byName: actor.name, action: `Assigned to ${assigneeName}` }];
            replaceCase(db, c);
            audit(db, { type: "CASE_UPDATED", actor, businessId: c.businessId, applicationId: c.applicationId, resource: "Risk case", metadata: { caseRef: c.reference, action: "assigned", status: c.status }, customerVisible: false });
          });
        },
        addCaseNote: (caseId, text) => {
          const actor = bankActor();
          mutate((db) => {
            const c = { ...db.cases.find((x) => x.id === caseId)! };
            const now = new Date().toISOString();
            c.notes = [...c.notes, { at: now, byName: actor.name, text }];
            c.history = [...c.history, { at: now, byName: actor.name, action: "Note added" }];
            replaceCase(db, c);
            audit(db, { type: "CASE_UPDATED", actor, businessId: c.businessId, applicationId: c.applicationId, resource: "Risk case", metadata: { caseRef: c.reference, action: "note_added", noteHash: sha256(text).slice(0, 16) }, customerVisible: false });
          });
        },
        escalateCase: (caseId) => {
          const actor = bankActor();
          mutate((db) => {
            const c = { ...db.cases.find((x) => x.id === caseId)! };
            const now = new Date().toISOString();
            c.status = "escalated";
            c.severity = c.severity === "Low" ? "Medium" : "High";
            c.history = [...c.history, { at: now, byName: actor.name, action: `Escalated — severity raised to ${c.severity}` }];
            replaceCase(db, c);
            audit(db, { type: "CASE_UPDATED", actor, businessId: c.businessId, applicationId: c.applicationId, resource: "Risk case", metadata: { caseRef: c.reference, action: "escalated", severity: c.severity }, customerVisible: false });
            notify(db, "bank", "case_updated", `Case ${c.reference} escalated`, `Severity raised to ${c.severity} by ${actor.name}.`, `/bank/monitoring/${c.id}`);
          });
        },
        resolveCase: (caseId, note) => {
          const actor = bankActor();
          mutate((db) => {
            const c = { ...db.cases.find((x) => x.id === caseId)! };
            const now = new Date().toISOString();
            c.status = "resolved";
            c.resolvedAt = now;
            if (note) c.notes = [...c.notes, { at: now, byName: actor.name, text: note }];
            c.history = [...c.history, { at: now, byName: actor.name, action: "Case resolved" }];
            replaceCase(db, c);
            if (c.applicationId) {
              const plan = db.plans.find((p) => p.applicationId === c.applicationId);
              const otherOpen = db.cases.some((x) => x.id !== c.id && x.applicationId === c.applicationId && x.status !== "resolved");
              if (plan && !otherOpen && plan.health !== "completed") {
                const reps = db.repayments.filter((r) => r.planId === plan.id);
                const unresolvedFailure = reps.some((r) => r.status === "failed" || r.status === "overdue");
                db.plans = db.plans.map((p) => (p.id === plan.id ? { ...p, health: unresolvedFailure ? "watch" : "healthy" } : p));
              }
            }
            audit(db, { type: "CASE_RESOLVED", actor, businessId: c.businessId, applicationId: c.applicationId, resource: "Risk case", metadata: { caseRef: c.reference }, customerVisible: false });
          });
        },

        updatePolicy: (patch) => {
          const actor = bankActor();
          mutate((db) => {
            const prev = db.policy;
            const [major, minor] = prev.version.replace("LP-", "").split(".").map(Number);
            db.policy = { ...prev, ...patch, version: `LP-${major}.${minor + 1}`, updatedAt: new Date().toISOString(), updatedByName: actor.name };
            const changed = Object.keys(patch).filter((k) => JSON.stringify((prev as unknown as Record<string, unknown>)[k]) !== JSON.stringify((patch as Record<string, unknown>)[k]));
            audit(db, { type: "POLICY_UPDATED", actor, resource: "Lending policy", metadata: { version: db.policy.version, previousVersion: prev.version, fieldsChanged: changed.join(", ") || "none" }, customerVisible: false });
          });
        },

        markNotificationsRead: (audience) => {
          mutate((db) => {
            db.notifications = db.notifications.map((n) => (n.audience === audience ? { ...n, read: true } : n));
          });
        },

        resetDemo: () => {
          set({ db: freshDb(), bankUserId: "u_officer", onboarding: { step: 0, draft: EMPTY_DRAFT, selectedInstitutions: [], analysisDone: false }, lastAccessLog: {} });
        },

        loadSampleApplication: async () => {
          const s = get();
          s.prefillDraft();
          get().saveBusiness();
          mutate((db) => {
            const now = new Date().toISOString();
            db.businesses = db.businesses.map((b) => (b.id === ADEBAYO_BUSINESS_ID ? { ...b, identityVerified: true, identityVerifiedAt: now } : b));
            audit(db, { type: "IDENTITY_VERIFIED", actor: SME_ACTOR, businessId: ADEBAYO_BUSINESS_ID, resource: "Identity", metadata: { method: "BVN", provider: "demo" }, customerVisible: true });
          });
          set({ onboarding: { ...get().onboarding, step: 2, selectedInstitutions: ["sterling", "firstbank", "uba"] } });
          for (const inst of ["sterling", "firstbank", "uba"]) {
            // Bypass the simulated delay by calling the service directly and committing synchronously
            const connectionId = uid("conn");
            const institution = institutionById(inst);
            const { generateInstitutionData } = await import("../seed/transactions");
            const data = generateInstitutionData({ businessId: ADEBAYO_BUSINESS_ID, institution, connectionId, asOf: new Date(), seedKey: "adebayo" });
            mutate((db) => {
              const now = new Date().toISOString();
              const consent: Consent = { id: uid("consent"), businessId: ADEBAYO_BUSINESS_ID, scope: ["account_information", "transaction_history_12m", "balance"], grantedAt: now, grantedByName: SME_ACTOR.name, hash: sha256(`${ADEBAYO_BUSINESS_ID}|${inst}|${now}`) };
              db.consents = [...db.consents, consent];
              db.connections = [...db.connections.filter((c) => !(c.businessId === ADEBAYO_BUSINESS_ID && c.institutionId === inst)), { id: connectionId, businessId: ADEBAYO_BUSINESS_ID, institutionId: inst, institutionName: institution.name, status: "connected", provider: "demo-open-banking", connectedAt: now, lastSyncedAt: now, consentId: consent.id }];
              db.accounts = [...db.accounts.filter((a) => !(a.businessId === ADEBAYO_BUSINESS_ID && a.institutionId === inst)), ...data.accounts];
              db.transactions = [...db.transactions.filter((t) => !data.accounts.some((a) => a.id === t.accountId)), ...data.transactions];
              audit(db, { type: "CONSENT_RECORDED", actor: SME_ACTOR, businessId: ADEBAYO_BUSINESS_ID, resource: `Open Banking consent — ${institution.name}`, metadata: { scopes: 3, consentHash: consent.hash.slice(0, 16) }, customerVisible: true });
              audit(db, { type: "ACCOUNT_CONNECTED", actor: SME_ACTOR, businessId: ADEBAYO_BUSINESS_ID, resource: `Connection — ${institution.name}`, metadata: { institution: institution.name, accounts: data.accounts.length }, customerVisible: true });
            });
          }
          const assessment = await (async () => {
            const { db } = get();
            const accounts = db.accounts.filter((a) => a.businessId === ADEBAYO_BUSINESS_ID);
            const transactions = db.transactions.filter((t) => t.businessId === ADEBAYO_BUSINESS_ID);
            const profile = buildFinancialProfile({ businessId: ADEBAYO_BUSINESS_ID, transactions, accounts, asOf: new Date(), institutionsConnected: 3 });
            const a = assessCredit(profile, db.policy);
            mutate((d) => {
              d.profiles = [...d.profiles.filter((p) => p.businessId !== ADEBAYO_BUSINESS_ID), profile];
              d.assessments = [...d.assessments, a];
              audit(d, { type: "FINANCIAL_PROFILE_GENERATED", actor: SYSTEM_ACTOR, businessId: ADEBAYO_BUSINESS_ID, resource: "Financial profile", metadata: { coverageMonths: profile.coverageMonths, institutions: 3 }, customerVisible: true });
              audit(d, { type: "ASSESSMENT_CREATED", actor: SYSTEM_ACTOR, businessId: ADEBAYO_BUSINESS_ID, resource: "Credit assessment", metadata: { score: a.score, modelVersion: a.modelVersion, policyVersion: d.policy.version }, customerVisible: true });
            });
            return a;
          })();
          set({ onboarding: { ...get().onboarding, analysisDone: true, step: 4 } });
          await get().submitApplication({ amount: assessment.recommendedAmount, purpose: "Working capital", tenorMonths: assessment.recommendedTenorMonths });
        },
      };
    },
    {
      name: "ireti-demo-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ db: s.db, bankUserId: s.bankUserId, onboarding: s.onboarding }),
    },
  ),
);

// ---- Selectors -----------------------------------------------------------

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    if (useStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

export const ADEBAYO_ID = ADEBAYO_BUSINESS_ID;

export function selectAdebayo(db: DB) {
  const business = db.businesses.find((b) => b.id === ADEBAYO_BUSINESS_ID);
  const connections = db.connections.filter((c) => c.businessId === ADEBAYO_BUSINESS_ID);
  const accounts = db.accounts.filter((a) => a.businessId === ADEBAYO_BUSINESS_ID);
  const profile = [...db.profiles].reverse().find((p) => p.businessId === ADEBAYO_BUSINESS_ID);
  const assessment = [...db.assessments].reverse().find((a) => a.businessId === ADEBAYO_BUSINESS_ID);
  const applications = db.applications.filter((a) => a.businessId === ADEBAYO_BUSINESS_ID).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const activeApplication = applications.find((a) => a.status !== "rejected") ?? applications[0];
  const plan = activeApplication?.repaymentPlanId ? db.plans.find((p) => p.id === activeApplication.repaymentPlanId) : undefined;
  const repayments = plan ? db.repayments.filter((r) => r.planId === plan.id).sort((a, b) => a.sequence - b.sequence) : [];
  const offer = activeApplication ? db.offers.find((o) => o.id === activeApplication.offerId) : undefined;
  return { business, connections, accounts, profile, assessment, applications, activeApplication, plan, repayments, offer };
}
