"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useAdebayo } from "@/hooks/useAdebayo";
import { useStore } from "@/lib/store/store";
import { priceLoan } from "@/lib/loan/pricing";
import type { LoanPurpose } from "@/lib/domain/types";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Stat, Field, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError, Checkbox } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Banner } from "@/components/ui/Banner";
import { formatNaira, formatPercent, formatWindow } from "@/lib/format";
import { ordinal } from "@/lib/util/dates";

const PURPOSES: LoanPurpose[] = ["Working capital", "Inventory", "Equipment", "Expansion", "Contract execution", "Other"];

type Stage = "amount" | "preview" | "consent" | "submitting" | "submitted";

export default function ApplicationPage() {
  const { assessment, activeApplication, business } = useAdebayo();
  const policy = useStore((s) => s.db.policy);
  const submit = useStore((s) => s.submitApplication);
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("amount");
  const [amountInput, setAmountInput] = useState("");
  const [purpose, setPurpose] = useState<LoanPurpose | "">("");
  const [tenor, setTenor] = useState<number>(0);
  const [consents, setConsents] = useState({ data: false, accounts: false, repayment: false, terms: false });
  const [submittedId, setSubmittedId] = useState<{ id: string; reference: string } | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (assessment && !amountInput) {
      setAmountInput(String(assessment.recommendedAmount));
      setTenor(assessment.recommendedTenorMonths);
    }
  }, [assessment, amountInput]);

  const amount = Number(amountInput.replace(/[^\d]/g, "")) || 0;
  const offer = useMemo(() => {
    if (!assessment || !amount || !tenor) return null;
    return priceLoan({ principal: amount, tenorMonths: tenor, policy, businessId: assessment.businessId, repaymentWindow: assessment.repaymentWindow, recommendedRepaymentDay: assessment.recommendedRepaymentDay });
  }, [assessment, amount, tenor, policy]);

  if (!assessment || !business) {
    return (
      <>
        <PageHeader eyebrow="Application" title="Apply for credit" />
        <Card><EmptyState title="Credit assessment required" body="Complete onboarding to see your eligibility before applying." action={<Link href="/sme/onboarding"><Button size="sm" variant="primary">Go to onboarding</Button></Link>} /></Card>
      </>
    );
  }

  if (activeApplication && activeApplication.status !== "rejected" && stage !== "submitted") {
    return (
      <>
        <PageHeader eyebrow="Application" title="Active application" />
        <Card>
          <EmptyState title={`${activeApplication.reference} is in progress`} body="Only one application can be active at a time. Open it to track its status." action={<Link href={`/sme/application/${activeApplication.id}`}><Button size="sm" variant="primary">View application</Button></Link>} />
        </Card>
      </>
    );
  }

  const max = assessment.eligibleAmount;
  const amountError = amount <= 0 ? "Enter an amount." : amount > max ? `Amount cannot exceed your eligibility of ${formatNaira(max)}.` : amount < policy.minLoanAmount ? `Minimum amount is ${formatNaira(policy.minLoanAmount)}.` : "";
  const allConsented = Object.values(consents).every(Boolean);

  const onSubmit = async () => {
    if (!purpose) return;
    setStage("submitting");
    setError(undefined);
    try {
      const app = await submit({ amount, purpose, tenorMonths: tenor });
      setSubmittedId({ id: app.id, reference: app.reference });
      setStage("submitted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
      setStage("consent");
    }
  };

  return (
    <>
      <PageHeader eyebrow="Application" title="Apply for credit" description={`Eligible for up to ${formatNaira(max)}. Pricing follows the bank's configured lending policy (${policy.version}).`} />

      {stage === "amount" && (
        <div className="grid lg:grid-cols-[1fr_380px] gap-4 max-w-[1000px]">
          <Card>
            <CardHeader title="How much would you like to borrow?" />
            <div className="max-w-[360px]">
              <Label required hint={`Maximum ${formatNaira(max)}`}>Amount</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 text-[13.5px]">₦</span>
                <Input className="pl-6 tnum text-[15px]" inputMode="numeric" value={amount ? amount.toLocaleString("en-NG") : ""} onChange={(e) => { const v = Number(e.target.value.replace(/[^\d]/g, "")) || 0; setAmountInput(String(Math.min(v, max))); }} invalid={!!amountError} />
              </div>
              <FieldError>{amountError}</FieldError>
              <input type="range" min={policy.minLoanAmount} max={max} step={500000} value={Math.min(Math.max(amount, policy.minLoanAmount), max)} onChange={(e) => setAmountInput(e.target.value)} className="w-full mt-3 accent-[var(--action-primary)]" aria-label="Amount slider" />
              <div className="flex justify-between text-[11.5px] text-ink-3 tnum"><span>{formatNaira(policy.minLoanAmount)}</span><span>{formatNaira(max)}</span></div>
            </div>
            <Divider className="my-4" />
            <div className="grid md:grid-cols-2 gap-4 max-w-[560px]">
              <div>
                <Label required>Loan purpose</Label>
                <Select value={purpose} onChange={(e) => setPurpose(e.target.value as LoanPurpose)}>
                  <option value="">Select</option>
                  {PURPOSES.map((p) => <option key={p}>{p}</option>)}
                </Select>
              </div>
              <div>
                <Label required hint={`Recommended ${assessment.recommendedTenorMonths} months`}>Tenor</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {policy.allowedTenors.map((t) => (
                    <button key={t} onClick={() => setTenor(t)} className={`h-8 rounded-[6px] border text-[13px] tnum ${tenor === t ? "border-primary bg-selected text-info font-medium" : "border-line-strong hover:bg-hover"}`}>{t} mo</button>
                  ))}
                </div>
              </div>
            </div>
            <Divider className="my-4" />
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] text-ink-3">Interest rate: <span className="tnum text-ink">{formatPercent(policy.annualInterestRate)} annualised</span>, reducing balance · Processing fee {formatPercent(policy.processingFeeRate, 1)}</p>
              <Button variant="primary" disabled={!!amountError || !purpose || !tenor} onClick={() => setStage("preview")}>Continue <ArrowRight size={14} /></Button>
            </div>
          </Card>
          <Card className="bg-sunken self-start">
            <div className="eyebrow mb-2">From your assessment</div>
            <div className="space-y-3">
              <Field label="Eligible lending amount"><span className="tnum font-medium">{formatNaira(max)}</span></Field>
              <Field label="Recommended amount"><span className="tnum font-medium">{formatNaira(assessment.recommendedAmount)}</span></Field>
              <Field label="Recommended repayment window"><span className="tnum font-medium">{formatWindow(assessment.repaymentWindow)}</span></Field>
            </div>
            <p className="text-[12.5px] text-ink-3 mt-3">You may apply for any amount within your eligibility. The bank reviews every application; eligibility is not an approval.</p>
          </Card>
        </div>
      )}

      {stage === "preview" && offer && (
        <div className="max-w-[720px] space-y-4 fade-up">
          <Card>
            <CardHeader eyebrow="Repayment preview" title="What you would repay" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
              <Stat label="Requested" size="lg" value={formatNaira(offer.principal)} />
              <Stat label="Interest" size="lg" value={formatNaira(offer.interestAmount)} sub={`${formatPercent(offer.annualInterestRate)} annualised, reducing balance`} />
              <Stat label="Fees" size="lg" value={formatNaira(offer.feeAmount)} sub={`Processing fee ${formatPercent(offer.feeRate, 1)}`} />
              <Stat label="Total repayable" size="lg" value={formatNaira(offer.totalRepayable)} />
              <Stat label="Tenor" size="lg" value={`${offer.tenorMonths} months`} sub={`${offer.tenorMonths} instalments of ${formatNaira(offer.instalmentAmount)}`} />
              <Stat label="Expected repayment window" size="lg" value={`${formatWindow(offer.repaymentWindow)} monthly`} sub={`Recommended date: ${ordinal(offer.recommendedRepaymentDay)}`} />
            </div>
            <Divider className="my-4" />
            <p className="text-[13px] text-ink-2">Your repayment schedule is structured around the cash-flow pattern identified from your connected accounts. Processing fee is included in the total repayable and settled with the first instalment.</p>
          </Card>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStage("amount")}>Back</Button>
            <Button variant="primary" onClick={() => setStage("consent")}>Review application <ArrowRight size={14} /></Button>
          </div>
        </div>
      )}

      {(stage === "consent" || stage === "submitting") && offer && (
        <div className="max-w-[720px] space-y-4 fade-up">
          <Card>
            <CardHeader eyebrow="Consent" title="Review and consent" description="Confirm the application details and the permissions you are granting." />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-[6px] bg-sunken border border-line-subtle p-3">
              <Field label="Amount"><span className="tnum font-medium">{formatNaira(offer.principal)}</span></Field>
              <Field label="Tenor">{offer.tenorMonths} months</Field>
              <Field label="Total repayment"><span className="tnum font-medium">{formatNaira(offer.totalRepayable)}</span></Field>
              <Field label="Repayment schedule"><span className="tnum">{offer.tenorMonths} × {formatNaira(offer.instalmentAmount)}, {formatWindow(offer.repaymentWindow)} monthly</span></Field>
            </div>
            <div className="mt-4 space-y-3">
              <Checkbox checked={consents.data} onChange={(v) => setConsents({ ...consents, data: v })} label="Data-access permission" description="I authorise the bank to access the financial profile and consolidated account analysis generated from my connected accounts for the purpose of assessing this application." />
              <Checkbox checked={consents.accounts} onChange={(v) => setConsents({ ...consents, accounts: v })} label="Account connection permission" description="I confirm the connected institutions are accounts operated by the business and consent to their continued connection for the duration of any facility." />
              <Checkbox checked={consents.repayment} onChange={(v) => setConsents({ ...consents, repayment: v })} label="Repayment authorisation" description={`I authorise a direct-debit mandate for ${formatNaira(offer.instalmentAmount)} monthly within the ${formatWindow(offer.repaymentWindow)} window on the designated account if this application is approved.`} />
              <Checkbox checked={consents.terms} onChange={(v) => setConsents({ ...consents, terms: v })} label="Terms" description="I have read and accept the bank's SME credit facility terms, including interest, fees and the consequences of missed repayments." />
            </div>
            {error && <div className="mt-3"><Banner tone="danger" title="Submission failed">{error}</Banner></div>}
          </Card>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStage("preview")} disabled={stage === "submitting"}>Back</Button>
            <Button variant="primary" disabled={!allConsented || !purpose} loading={stage === "submitting"} onClick={onSubmit}>
              {stage === "submitting" ? "Submitting application" : "Submit application"}
            </Button>
          </div>
        </div>
      )}

      {stage === "submitted" && submittedId && (
        <Card className="max-w-[560px] fade-up">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} className="text-success mt-0.5" />
            <div className="flex-1">
              <div className="eyebrow">Application submitted</div>
              <div className="text-[20px] font-semibold text-ink tnum mt-1">{submittedId.reference}</div>
              <div className="text-[13px] text-ink-2 mt-1">Status: Under review. The bank has been notified and you will see every access to your financial profile in your activity log.</div>
              <div className="mt-4 flex gap-2">
                <Button variant="primary" onClick={() => router.push(`/sme/application/${submittedId.id}`)}>View application</Button>
                <Link href="/sme"><Button>Back to overview</Button></Link>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
