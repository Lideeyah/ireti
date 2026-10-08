"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import type { BankAccount, BankConnection, Business, CreditAssessment, FinancialProfile } from "@/lib/domain/types";
import { connectInstitutionAction, loadSampleApplicationAction, runAnalysisAction, saveBusinessAction, verifyIdentityAction } from "@/app/actions";
import { ANALYSIS_STEPS } from "@/lib/domain/constants";
import { INSTITUTIONS } from "@/lib/seed/institutions";
import { BUSINESS_TYPES, INDUSTRIES } from "@/lib/domain/labels";
import { ADEBAYO_PREFILL } from "@/lib/seed/demoData";
import { StepIndicator, ProcessingList } from "@/components/ui/Steps";
import { Card, CardHeader, Field, Stat, Divider, ListHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Input";
import { ConnectionStatusChip, RatingChip } from "@/components/ui/Chip";
import { Banner, DemoTag } from "@/components/ui/Banner";
import { formatNaira, formatNairaCompact, formatRelative, formatWindow } from "@/lib/format";
import { ordinal } from "@/lib/util/dates";

const STEPS = ["Business", "Identity", "Accounts", "Analysis", "Profile"];

interface Props {
  business: Business | null;
  connections: BankConnection[];
  accounts: BankAccount[];
  profile?: FinancialProfile;
  assessment?: CreditAssessment;
  demoMode: boolean;
  hasApplication: boolean;
}

export function OnboardingFlow(props: Props) {
  const { business, connections, assessment } = props;
  const connected = connections.filter((c) => c.status === "connected").length;
  // The furthest step the data allows; the user may step back within the allowed range.
  const derived = !business ? 0 : !business.identityVerified ? 1 : connected === 0 ? 2 : !assessment ? 2 : 4;
  const [step, setStep] = useState(derived);
  const [analysing, setAnalysing] = useState(false);
  useEffect(() => {
    // Never show a step the data does not support; auto-advance only from Business to Identity.
    if (!analysing) setStep((s) => (s > derived ? derived : s === 0 && derived >= 1 ? 1 : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derived]);

  return (
    <>
      <div className="mb-6"><StepIndicator steps={STEPS} current={analysing ? 3 : step} /></div>
      <div className="max-w-[920px]">
        {analysing ? (
          <AnalysisStep onDone={() => { setAnalysing(false); setStep(4); }} />
        ) : step === 0 ? (
          <BusinessStep business={business} demoMode={props.demoMode} />
        ) : step === 1 ? (
          <IdentityStep business={business!} onBack={() => setStep(0)} onNext={() => setStep(2)} />
        ) : step === 2 ? (
          <AccountsStep {...props} onRun={() => setAnalysing(true)} />
        ) : (
          <ProfileStep profile={props.profile!} assessment={props.assessment!} onBack={() => setStep(2)} />
        )}
      </div>
    </>
  );
}

function BusinessStep({ business, demoMode }: { business: Business | null; demoMode: boolean }) {
  const [d, setD] = useState({
    name: business?.name ?? "",
    cacNumber: business?.cacNumber ?? "",
    businessType: business?.businessType ?? "",
    industry: business?.industry ?? "",
    location: business?.location ?? "",
    yearsOperating: business ? String(business.yearsOperating) : "",
    declaredMonthlyRevenue: business ? String(business.declaredMonthlyRevenue) : "",
  });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();

  const errors = {
    name: d.name.trim().length < 3 ? "Enter the registered business name." : "",
    cacNumber: !/^(RC|BN)\s?\d{5,8}$/i.test(d.cacNumber.trim()) ? "Enter a CAC number such as RC 1482930 or BN 2345678." : "",
    businessType: !d.businessType ? "Select a business type." : "",
    industry: !d.industry ? "Select an industry." : "",
    location: d.location.trim().length < 2 ? "Enter the business location." : "",
    yearsOperating: d.yearsOperating === "" || Number(d.yearsOperating) < 0 ? "Enter years operating." : "",
    declaredMonthlyRevenue: !(Number(d.declaredMonthlyRevenue) > 0) ? "Enter average monthly revenue." : "",
  };
  const valid = Object.values(errors).every((e) => !e);
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    start(async () => {
      const r = await saveBusinessAction({ ...d, yearsOperating: Number(d.yearsOperating), declaredMonthlyRevenue: Number(d.declaredMonthlyRevenue) });
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader eyebrow="Step 01" title="Business details" description="Tell us about the business applying for credit." action={demoMode && !business ? <Button size="sm" variant="ghost" onClick={() => setD({ name: ADEBAYO_PREFILL.name, cacNumber: ADEBAYO_PREFILL.cacNumber, businessType: ADEBAYO_PREFILL.businessType, industry: ADEBAYO_PREFILL.industry, location: ADEBAYO_PREFILL.location, yearsOperating: String(ADEBAYO_PREFILL.yearsOperating), declaredMonthlyRevenue: String(ADEBAYO_PREFILL.declaredMonthlyRevenue) })}>Use demo business details</Button> : undefined} />
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
        <div className="md:col-span-2"><Label required>Business name</Label><Input value={d.name} onChange={set("name")} placeholder="Registered name" invalid={touched && !!errors.name} />{touched && <FieldError>{errors.name}</FieldError>}</div>
        <div><Label required>CAC registration number</Label><Input value={d.cacNumber} onChange={set("cacNumber")} placeholder="RC 1234567" invalid={touched && !!errors.cacNumber} />{touched && <FieldError>{errors.cacNumber}</FieldError>}</div>
        <div><Label required>Business type</Label><Select value={d.businessType} onChange={set("businessType")}><option value="">Select</option>{BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>{touched && <FieldError>{errors.businessType}</FieldError>}</div>
        <div><Label required>Industry</Label><Select value={d.industry} onChange={set("industry")}><option value="">Select</option>{INDUSTRIES.map((t) => <option key={t}>{t}</option>)}</Select>{touched && <FieldError>{errors.industry}</FieldError>}</div>
        <div><Label required>Business location</Label><Input value={d.location} onChange={set("location")} placeholder="City or state" invalid={touched && !!errors.location} />{touched && <FieldError>{errors.location}</FieldError>}</div>
        <div><Label required>Years operating</Label><Input type="number" min={0} value={d.yearsOperating} onChange={set("yearsOperating")} placeholder="0" className="tnum" invalid={touched && !!errors.yearsOperating} />{touched && <FieldError>{errors.yearsOperating}</FieldError>}</div>
        <div><Label required hint="Naira, as declared">Average monthly revenue</Label><Input type="number" min={0} step={50000} value={d.declaredMonthlyRevenue} onChange={set("declaredMonthlyRevenue")} placeholder="0" className="tnum" invalid={touched && !!errors.declaredMonthlyRevenue} />{touched && <FieldError>{errors.declaredMonthlyRevenue}</FieldError>}</div>
      </div>
      <FieldError>{error}</FieldError>
      <Divider />
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-ink-3">Declared revenue is compared against observed account inflows during analysis.</p>
        <Button variant="primary" disabled={touched && !valid} loading={pending} onClick={submit}>Continue <ArrowRight size={14} /></Button>
      </div>
    </Card>
  );
}

function IdentityStep({ business, onBack, onNext }: { business: Business; onBack: () => void; onNext: () => void }) {
  const [bvn, setBvn] = useState("");
  const [state, setState] = useState<"idle" | "verifying" | "failed">("idle");
  const [reason, setReason] = useState<string>();
  const router = useRouter();
  const verify = async () => {
    setState("verifying");
    const r = await verifyIdentityAction(bvn);
    if (r.ok && r.data.verified) { setState("idle"); router.refresh(); }
    else { setState("failed"); setReason(r.ok ? r.data.reason : r.error); }
  };
  return (
    <Card>
      <CardHeader eyebrow="Step 02" title="Verify your identity" description="Your BVN is used to verify your identity before financial accounts are connected. The number itself is not stored by Ìrètí; only the verification outcome is recorded." />
      {!business.identityVerified ? (
        <div className="max-w-[380px]">
          <Label required>BVN</Label>
          <Input inputMode="numeric" maxLength={11} value={bvn} onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))} placeholder="11-digit number" className="tnum" disabled={state === "verifying"} />
          <p className="text-[12.5px] text-ink-3 mt-2">The verification adapter is simulated in this environment: any 11-digit number verifies.</p>
          {state === "failed" && <div className="mt-4"><Banner tone="danger" title="Identity could not be verified">{reason}</Banner></div>}
          <div className="mt-6 flex items-center gap-2">
            <Button variant="primary" onClick={verify} loading={state === "verifying"} disabled={bvn.length !== 11}>{state === "verifying" ? "Verifying identity" : "Verify identity"}</Button>
            <Button variant="ghost" onClick={onBack}>Back</Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 rounded-[8px] border border-success-border bg-success-bg px-5 py-4 max-w-[440px]">
            <ShieldCheck size={20} className="text-success" />
            <div>
              <div className="text-[15px] font-semibold text-success">Identity verified</div>
              <div className="text-[13px] text-success/80">{business.identityVerifiedAt ? formatRelative(business.identityVerifiedAt) : ""}</div>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2"><Button variant="primary" onClick={onNext}>Continue to accounts <ArrowRight size={14} /></Button><Button variant="ghost" onClick={onBack}>Back</Button></div>
        </div>
      )}
    </Card>
  );
}

function AccountsStep({ connections, accounts, assessment, onRun }: Props & { onRun: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const connectionFor = (id: string) => connections.find((c) => c.institutionId === id);
  const visible = INSTITUTIONS.filter((i) => selected.includes(i.id) || connectionFor(i.id));
  const connected = connections.filter((c) => c.status === "connected");

  const connect = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: true }));
    setErrors((e) => ({ ...e, [id]: "" }));
    const r = await connectInstitutionAction(id);
    if (!r.ok) setErrors((e) => ({ ...e, [id]: r.error }));
    setBusy((b) => ({ ...b, [id]: false }));
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader eyebrow="Step 03" title="Connect your business accounts" description="Ìrètí uses authorised Open Banking connections to understand the business's financial position across institutions. You authorise each connection with the institution; no banking passwords are entered here." action={<DemoTag>Simulated bank connection</DemoTag>} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {INSTITUTIONS.map((inst) => {
            const conn = connectionFor(inst.id);
            const isSelected = selected.includes(inst.id) || !!conn;
            return (
              <button key={inst.id} onClick={() => !conn && setSelected((s) => (s.includes(inst.id) ? s.filter((x) => x !== inst.id) : [...s, inst.id]))} disabled={!!conn} className={`flex items-center justify-between h-11 px-4 rounded-[6px] border text-left transition-colors ${isSelected ? "border-primary bg-selected text-info" : "border-line hover:bg-hover text-ink"} disabled:cursor-default`}>
                <span className="text-[14px] font-medium">{inst.name}</span>
                {conn?.status === "connected" ? <CheckCircle2 size={16} className="text-success" /> : isSelected ? <span className="w-2 h-2 rounded-full bg-primary" /> : null}
              </button>
            );
          })}
        </div>
      </Card>

      {visible.length > 0 && (
        <Card padded={false}>
          <ListHeader title="Selected institutions" description={`${connected.length} of ${visible.length} connected`} />
          <ul className="divide-y divide-line-subtle">
            {visible.map((inst) => {
              const conn = connectionFor(inst.id);
              const status = busy[inst.id] ? "connecting" : (conn?.status ?? "not_connected");
              const acc = conn ? accounts.find((a) => a.connectionId === conn.id) : undefined;
              return (
                <li key={inst.id} className="px-6 py-4 grid grid-cols-2 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-5 items-center fade-up">
                  <div>
                    <div className="text-[14px] font-medium text-ink">{inst.name}</div>
                    <div className="mt-1.5"><ConnectionStatusChip status={status} /></div>
                  </div>
                  <Field label="Account ending"><span className="tnum">{acc?.accountNumberMasked ?? "—"}</span></Field>
                  <Field label="Current balance"><span className="tnum">{acc ? formatNaira(acc.balance) : "—"}</span></Field>
                  <Field label="Last synced">{conn?.lastSyncedAt ? formatRelative(conn.lastSyncedAt) : "—"}</Field>
                  <div className="flex justify-end">
                    {status === "not_connected" && <Button size="sm" variant="primary" onClick={() => connect(inst.id)}>Connect</Button>}
                    {status === "connecting" && <Button size="sm" loading disabled>Connecting</Button>}
                    {status === "failed" && <Button size="sm" onClick={() => connect(inst.id)}><RefreshCw size={12} /> Try again</Button>}
                  </div>
                  {(status === "failed" || errors[inst.id]) && (
                    <div className="col-span-full"><Banner tone="danger" title="Account connection failed">We couldn&apos;t complete the connection to this institution. {conn?.failureReason ?? errors[inst.id]} Try again.</Banner></div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-[13px] text-ink-3">Connect every account the business operates. The analysis consolidates all connected institutions.</p>
        <div className="flex items-center gap-2">
          {assessment && <Link href="/sme/credit-profile"><Button>View existing profile</Button></Link>}
          <Button variant="primary" disabled={connected.length === 0 || Object.values(busy).some(Boolean)} onClick={onRun}>{assessment ? "Re-run analysis" : "Run financial analysis"} <ArrowRight size={14} /></Button>
        </div>
      </div>
    </div>
  );
}

function AnalysisStep({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string>();
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Staged progress runs client-side; the analysis itself is one server call.
      const timers: Promise<void>[] = [];
      for (let i = 1; i < ANALYSIS_STEPS.length; i++) timers.push(new Promise((r) => setTimeout(() => { if (!cancelled) setCurrent(i); r(); }, 900 * i)));
      const [result] = await Promise.all([runAnalysisAction(), ...timers]);
      if (cancelled) return;
      if (!result.ok) { setError(result.error); return; }
      setCurrent(ANALYSIS_STEPS.length);
      router.refresh();
      setTimeout(onDone, 400);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Card className="max-w-[600px]">
      <CardHeader eyebrow="Step 04" title="Building your financial profile" description="Consolidating approximately 12 months of transaction history across connected institutions, with greater weight placed on recent activity." action={<DemoTag>Demo credit assessment</DemoTag>} />
      <ProcessingList steps={ANALYSIS_STEPS} current={current} />
      {error && <div className="mt-5"><Banner tone="danger" title="Analysis could not be completed">{error}</Banner></div>}
    </Card>
  );
}

function ProfileStep({ profile, assessment, onBack }: { profile: FinancialProfile; assessment: CreditAssessment; onBack: () => void }) {
  const consistency = profile.revenueConsistency === "High" ? "Strong" : profile.revenueConsistency === "Medium" ? "Moderate" : "Weak";
  return (
    <div className="space-y-6 fade-up">
      <Card>
        <CardHeader eyebrow="Step 05 · Financial profile" title="Consolidated financial profile" description={`Based on ${profile.coverageMonths} months of transactions across ${profile.institutionsConnected} connected ${profile.institutionsConnected === 1 ? "institution" : "institutions"}. Generated ${formatRelative(profile.generatedAt)}.`} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-8 [&>*]:min-w-0 [&>*]:lg:border-l [&>*]:lg:border-line-subtle [&>*:first-child]:lg:border-l-0 [&>*]:lg:pl-6 [&>*:first-child]:lg:pl-0">
          <div><div className="eyebrow mb-3">Revenue</div><Stat label="Monthly inflow" size="lg" value={formatNairaCompact(profile.avgMonthlyInflow)} /><div className="mt-4"><Field label="Revenue consistency"><RatingChip rating={profile.revenueConsistency} /></Field></div></div>
          <div><div className="eyebrow mb-3">Expenses</div><Stat label="Monthly outflow" size="lg" value={formatNairaCompact(profile.avgMonthlyOutflow)} /><div className="mt-4"><Field label="Expense ratio"><span className="tnum">{Math.round(profile.expenseRatio * 100)}%</span></Field></div></div>
          <div><div className="eyebrow mb-3">Cash flow</div><Stat label="Net monthly flow" size="lg" value={formatNairaCompact(profile.avgNetMonthlyFlow)} /><div className="mt-4"><Field label="Cash-positive months"><span className="tnum">{profile.positiveNetMonths} of {profile.coverageMonths}</span></Field></div></div>
          <div><div className="eyebrow mb-3">Credit behaviour</div><Stat label="Obligations" size="lg" value={formatNairaCompact(profile.existingObligations)} /><div className="mt-4"><Field label="Payment consistency"><RatingChip rating={profile.paymentConsistency} /></Field></div></div>
          <div><div className="eyebrow mb-3">Liquidity</div><Stat label="Inflow window" size="lg" value={formatWindow(profile.strongestInflowWindow)} /><div className="mt-4"><Field label="Window inflow"><span className="tnum">{formatNairaCompact(profile.avgInflowDuringWindow)}</span></Field></div></div>
        </div>
        <Divider />
        <p className="text-[14px] text-ink-2 leading-relaxed">{profile.narrative} Overall financial profile: <strong className="text-ink font-medium">{consistency}</strong>. Repayments are best placed on the {ordinal(profile.recommendedRepaymentDay)}.</p>
      </Card>
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>Back to accounts</Button>
        <Link href="/sme/credit-profile"><Button variant="primary">View credit profile <ArrowRight size={14} /></Button></Link>
      </div>
    </div>
  );
}

export function LoadSampleButton({ disabled }: { disabled: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const router = useRouter();
  return (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="ghost" disabled={disabled} loading={pending} onClick={() => start(async () => { const r = await loadSampleApplicationAction(); if (!r.ok) setError(r.error); else router.push(`/sme/application/${r.data.id}`); })}>Load sample application</Button>
      {error && <span className="text-[12.5px] text-danger">{error}</span>}
    </div>
  );
}
