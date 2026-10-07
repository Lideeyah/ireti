"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { useStore, ANALYSIS_STEPS } from "@/lib/store/store";
import { useAdebayo } from "@/hooks/useAdebayo";
import { INSTITUTIONS } from "@/lib/seed/institutions";
import { BUSINESS_TYPES, INDUSTRIES } from "@/lib/domain/labels";
import { PageHeader } from "@/components/shell/PageHeader";
import { StepIndicator, ProcessingList } from "@/components/ui/Steps";
import { Card, CardHeader, Field, Stat, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Input";
import { ConnectionStatusChip, RatingChip } from "@/components/ui/Chip";
import { Banner, DemoTag } from "@/components/ui/Banner";
import { formatNaira, formatNairaCompact, formatRelative, formatWindow } from "@/lib/format";
import { ordinal } from "@/lib/util/dates";

const STEPS = ["Business", "Identity", "Accounts", "Analysis", "Profile"];

export default function OnboardingPage() {
  const step = useStore((s) => s.onboarding.step);
  const setStep = useStore((s) => s.setOnboardingStep);
  const { business, connections, assessment } = useAdebayo();

  // Keep the step consistent with persisted state (e.g. revisiting the page).
  const effectiveStep = useMemo(() => {
    if (!business) return 0;
    if (!business.identityVerified) return 1;
    if (connections.filter((c) => c.status === "connected").length === 0) return Math.min(Math.max(step, 1), 2);
    if (!assessment) return Math.min(Math.max(step, 2), 3);
    return Math.max(2, step);
  }, [business, connections, assessment, step]);

  return (
    <>
      <PageHeader eyebrow="Onboarding" title="Build your financial profile" description="Five steps: business details, identity verification, account connection, analysis and your credit profile." />
      <div className="mb-5"><StepIndicator steps={STEPS} current={effectiveStep} /></div>
      <div className="max-w-[860px]">
        {effectiveStep === 0 && <BusinessStep />}
        {effectiveStep === 1 && <IdentityStep />}
        {effectiveStep === 2 && <AccountsStep onContinue={() => setStep(3)} />}
        {effectiveStep === 3 && <AnalysisStep />}
        {effectiveStep === 4 && <ProfileStep onBack={() => setStep(2)} />}
      </div>
    </>
  );
}

function BusinessStep() {
  const draft = useStore((s) => s.onboarding.draft);
  const updateDraft = useStore((s) => s.updateDraft);
  const prefill = useStore((s) => s.prefillDraft);
  const save = useStore((s) => s.saveBusiness);
  const [touched, setTouched] = useState(false);

  const errors = {
    name: draft.name.trim().length < 3 ? "Enter the registered business name." : "",
    cacNumber: !/^(RC|BN)\s?\d{5,8}$/i.test(draft.cacNumber.trim()) ? "Enter a CAC number such as RC 1482930 or BN 2345678." : "",
    businessType: !draft.businessType ? "Select a business type." : "",
    industry: !draft.industry ? "Select an industry." : "",
    location: draft.location.trim().length < 2 ? "Enter the business location." : "",
    yearsOperating: !(Number(draft.yearsOperating) >= 0 && draft.yearsOperating !== "") ? "Enter years operating." : "",
    declaredMonthlyRevenue: !(Number(draft.declaredMonthlyRevenue) > 0) ? "Enter average monthly revenue." : "",
  };
  const valid = Object.values(errors).every((e) => !e);

  return (
    <Card>
      <CardHeader eyebrow="Step 01" title="Business details" description="Tell us about the business applying for credit." action={<Button size="sm" variant="ghost" onClick={prefill}>Use demo business details</Button>} />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label required>Business name</Label>
          <Input value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} placeholder="Registered name" invalid={touched && !!errors.name} />
          {touched && <FieldError>{errors.name}</FieldError>}
        </div>
        <div>
          <Label required>CAC registration number</Label>
          <Input value={draft.cacNumber} onChange={(e) => updateDraft({ cacNumber: e.target.value })} placeholder="RC 1234567" invalid={touched && !!errors.cacNumber} />
          {touched && <FieldError>{errors.cacNumber}</FieldError>}
        </div>
        <div>
          <Label required>Business type</Label>
          <Select value={draft.businessType} onChange={(e) => updateDraft({ businessType: e.target.value })}>
            <option value="">Select</option>
            {BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
          {touched && <FieldError>{errors.businessType}</FieldError>}
        </div>
        <div>
          <Label required>Industry</Label>
          <Select value={draft.industry} onChange={(e) => updateDraft({ industry: e.target.value })}>
            <option value="">Select</option>
            {INDUSTRIES.map((t) => <option key={t}>{t}</option>)}
          </Select>
          {touched && <FieldError>{errors.industry}</FieldError>}
        </div>
        <div>
          <Label required>Business location</Label>
          <Input value={draft.location} onChange={(e) => updateDraft({ location: e.target.value })} placeholder="City or state" invalid={touched && !!errors.location} />
          {touched && <FieldError>{errors.location}</FieldError>}
        </div>
        <div>
          <Label required>Years operating</Label>
          <Input type="number" min={0} value={draft.yearsOperating} onChange={(e) => updateDraft({ yearsOperating: e.target.value })} placeholder="0" className="tnum" invalid={touched && !!errors.yearsOperating} />
          {touched && <FieldError>{errors.yearsOperating}</FieldError>}
        </div>
        <div>
          <Label required hint="₦, declared">Average monthly revenue</Label>
          <Input type="number" min={0} step={50000} value={draft.declaredMonthlyRevenue} onChange={(e) => updateDraft({ declaredMonthlyRevenue: e.target.value })} placeholder="0" className="tnum" invalid={touched && !!errors.declaredMonthlyRevenue} />
          {touched && <FieldError>{errors.declaredMonthlyRevenue}</FieldError>}
        </div>
      </div>
      <Divider className="my-4" />
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-ink-3">Declared revenue is compared against observed account inflows during analysis.</p>
        <Button
          variant="primary"
          disabled={touched && !valid}
          onClick={() => {
            setTouched(true);
            if (valid) save();
          }}
        >
          Continue <ArrowRight size={14} />
        </Button>
      </div>
    </Card>
  );
}

function IdentityStep() {
  const verify = useStore((s) => s.verifyIdentity);
  const setStep = useStore((s) => s.setOnboardingStep);
  const { business } = useAdebayo();
  const [bvn, setBvn] = useState("");
  const [state, setState] = useState<"idle" | "verifying" | "verified" | "failed">(business?.identityVerified ? "verified" : "idle");
  const [reason, setReason] = useState<string>();

  const onVerify = async () => {
    setState("verifying");
    const result = await verify(bvn);
    if (result.verified) setState("verified");
    else {
      setState("failed");
      setReason(result.reason);
    }
  };

  return (
    <Card>
      <CardHeader eyebrow="Step 02" title="Verify your identity" description="Your BVN is used to verify your identity before financial accounts are connected. The number itself is not stored by Ìrètí; only the verification outcome is recorded." />
      {state !== "verified" ? (
        <div className="max-w-[360px]">
          <Label required>BVN</Label>
          <Input inputMode="numeric" maxLength={11} value={bvn} onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))} placeholder="11-digit number" className="tnum" disabled={state === "verifying"} />
          <p className="text-[12px] text-ink-3 mt-1.5">Demo environment: any 11-digit number verifies. The verification adapter is simulated.</p>
          {state === "failed" && <div className="mt-3"><Banner tone="danger" title="Identity could not be verified">{reason}</Banner></div>}
          <div className="mt-4 flex items-center gap-2">
            <Button variant="primary" onClick={onVerify} loading={state === "verifying"} disabled={bvn.length !== 11}>
              {state === "verifying" ? "Verifying identity" : "Verify identity"}
            </Button>
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 rounded-[8px] border border-success-border bg-success-bg px-4 py-3 max-w-[420px]">
            <ShieldCheck size={18} className="text-success" />
            <div>
              <div className="text-[14px] font-semibold text-success">Identity verified</div>
              <div className="text-[12.5px] text-success/80">{business?.identityVerifiedAt ? formatRelative(business.identityVerifiedAt) : ""}</div>
            </div>
          </div>
          <div className="mt-4"><Button variant="primary" onClick={() => setStep(2)}>Continue to accounts <ArrowRight size={14} /></Button></div>
        </div>
      )}
    </Card>
  );
}

function AccountsStep({ onContinue }: { onContinue: () => void }) {
  const { connections, accounts, assessment } = useAdebayo();
  const connect = useStore((s) => s.connectInstitution);
  const retry = useStore((s) => s.retryConnection);
  const selected = useStore((s) => s.onboarding.selectedInstitutions);
  const toggle = useStore((s) => s.toggleInstitution);
  const connected = connections.filter((c) => c.status === "connected");
  const router = useRouter();

  const connectionFor = (id: string) => connections.find((c) => c.institutionId === id);
  const visible = INSTITUTIONS.filter((i) => selected.includes(i.id) || connectionFor(i.id));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader eyebrow="Step 03" title="Connect your business accounts" description="Ìrètí uses authorised Open Banking connections to understand the business's financial position across institutions. You authorise each connection with the institution; no banking passwords are entered here." action={<DemoTag>Simulated bank connection</DemoTag>} />
        <div className="grid grid-cols-3 gap-2">
          {INSTITUTIONS.map((inst) => {
            const conn = connectionFor(inst.id);
            const isSelected = selected.includes(inst.id) || !!conn;
            return (
              <button
                key={inst.id}
                onClick={() => !conn && toggle(inst.id)}
                disabled={!!conn}
                className={`flex items-center justify-between h-10 px-3 rounded-[6px] border text-left transition-colors ${isSelected ? "border-primary bg-selected text-info" : "border-line hover:bg-hover text-ink"} disabled:cursor-default`}
              >
                <span className="text-[13.5px] font-medium">{inst.name}</span>
                {conn?.status === "connected" ? <CheckCircle2 size={15} className="text-success" /> : isSelected ? <span className="w-2 h-2 rounded-full bg-primary" /> : null}
              </button>
            );
          })}
        </div>
      </Card>

      {visible.length > 0 && (
        <Card padded={false}>
          <div className="px-4 py-3 border-b border-line-subtle flex items-center justify-between">
            <div className="text-[13.5px] font-semibold text-ink">Selected institutions</div>
            <div className="text-[12.5px] text-ink-3">{connected.length} of {visible.length} connected</div>
          </div>
          <ul className="divide-y divide-line-subtle">
            {visible.map((inst) => {
              const conn = connectionFor(inst.id);
              const status = conn?.status ?? "not_connected";
              const acc = conn ? accounts.find((a) => a.connectionId === conn.id) : undefined;
              return (
                <li key={inst.id} className="px-4 py-3 grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-4 items-center fade-up">
                  <div>
                    <div className="text-[13.5px] font-medium text-ink">{inst.name}</div>
                    <div className="mt-1"><ConnectionStatusChip status={status} /></div>
                  </div>
                  <Field label="Account ending"><span className="tnum">{acc?.accountNumberMasked ?? "—"}</span></Field>
                  <Field label="Current balance"><span className="tnum">{acc ? formatNaira(acc.balance) : "—"}</span></Field>
                  <Field label="Last synced">{conn?.lastSyncedAt ? formatRelative(conn.lastSyncedAt) : "—"}</Field>
                  <div className="flex justify-end">
                    {status === "not_connected" && <Button size="sm" variant="primary" onClick={() => connect(inst.id)}>Connect</Button>}
                    {status === "connecting" && <Button size="sm" loading disabled>Connecting</Button>}
                    {status === "failed" && conn && <Button size="sm" onClick={() => retry(conn.id)}><RefreshCw size={12} /> Try again</Button>}
                  </div>
                  {status === "failed" && (
                    <div className="col-span-5">
                      <Banner tone="danger" title="Account connection failed">We couldn&apos;t complete the connection to this institution. {conn?.failureReason} Try again.</Banner>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-ink-3">Connect every account the business operates. The analysis consolidates all connected institutions.</p>
        <div className="flex items-center gap-2">
          {assessment && <Button onClick={() => router.push("/sme/credit-profile")}>View existing profile</Button>}
          <Button variant="primary" disabled={connected.length === 0 || connections.some((c) => c.status === "connecting")} onClick={onContinue}>
            {assessment ? "Re-run analysis" : "Run financial analysis"} <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AnalysisStep() {
  const run = useStore((s) => s.runAnalysis);
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (started) return;
    setStarted(true);
    run((i) => setCurrent(i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Card className="max-w-[560px]">
      <CardHeader eyebrow="Step 04" title="Building your financial profile" description="Consolidating approximately 12 months of transaction history across connected institutions, with greater weight placed on recent activity." action={<DemoTag>Demo credit assessment</DemoTag>} />
      <ProcessingList steps={ANALYSIS_STEPS} current={current} />
    </Card>
  );
}

function ProfileStep({ onBack }: { onBack: () => void }) {
  const { profile, assessment } = useAdebayo();
  if (!profile || !assessment) return null;
  const consistency = profile.revenueConsistency === "High" ? "Strong" : profile.revenueConsistency === "Medium" ? "Moderate" : "Weak";
  return (
    <div className="space-y-4 fade-up">
      <Card>
        <CardHeader eyebrow="Step 05 · Financial profile" title="Consolidated financial profile" description={`Based on ${profile.coverageMonths} months of transactions across ${profile.institutionsConnected} connected ${profile.institutionsConnected === 1 ? "institution" : "institutions"}. Generated ${formatRelative(profile.generatedAt)}.`} />
        <div className="grid md:grid-cols-5 gap-x-6 gap-y-5">
          <div>
            <div className="eyebrow mb-2">Revenue</div>
            <Stat label="Average monthly inflow" value={formatNairaCompact(profile.avgMonthlyInflow)} />
            <div className="mt-3"><Field label="Revenue consistency"><RatingChip rating={profile.revenueConsistency} /></Field></div>
          </div>
          <div>
            <div className="eyebrow mb-2">Expenses</div>
            <Stat label="Average monthly outflow" value={formatNairaCompact(profile.avgMonthlyOutflow)} />
            <div className="mt-3"><Field label="Expense ratio"><span className="tnum">{Math.round(profile.expenseRatio * 100)}%</span></Field></div>
          </div>
          <div>
            <div className="eyebrow mb-2">Cash flow</div>
            <Stat label="Average net monthly flow" value={formatNairaCompact(profile.avgNetMonthlyFlow)} />
            <div className="mt-3"><Field label="Cash-positive months"><span className="tnum">{profile.positiveNetMonths} of {profile.coverageMonths}</span></Field></div>
          </div>
          <div>
            <div className="eyebrow mb-2">Credit behaviour</div>
            <Stat label="Existing obligations" value={formatNairaCompact(profile.existingObligations)} />
            <div className="mt-3"><Field label="Payment consistency"><RatingChip rating={profile.paymentConsistency} /></Field></div>
          </div>
          <div>
            <div className="eyebrow mb-2">Liquidity</div>
            <Stat label="Strongest inflow window" value={formatWindow(profile.strongestInflowWindow)} />
            <div className="mt-3"><Field label="Average inflow in window"><span className="tnum">{formatNairaCompact(profile.avgInflowDuringWindow)}</span></Field></div>
          </div>
        </div>
        <Divider className="my-4" />
        <p className="text-[13.5px] text-ink-2">{profile.narrative} Overall financial profile: <strong className="text-ink font-medium">{consistency}</strong>. Repayments are best placed on the {ordinal(profile.recommendedRepaymentDay)}.</p>
      </Card>
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>Back to accounts</Button>
        <Link href="/sme/credit-profile"><Button variant="primary">View credit profile <ArrowRight size={14} /></Button></Link>
      </div>
    </div>
  );
}
