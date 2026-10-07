"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { BankPolicy, CreditAssessment, LoanPurpose } from "@/lib/domain/types";
import { submitApplicationAction } from "@/app/actions";
import { priceLoan } from "@/lib/loan/pricing";
import { Card, CardHeader, Stat, Field, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError, Checkbox } from "@/components/ui/Input";
import { Banner } from "@/components/ui/Banner";
import { formatNaira, formatPercent, formatWindow } from "@/lib/format";
import { ordinal } from "@/lib/util/dates";

const PURPOSES: LoanPurpose[] = ["Working capital", "Inventory", "Equipment", "Expansion", "Contract execution", "Other"];
type Stage = "amount" | "preview" | "consent" | "submitting" | "submitted";

export function ApplicationFlow({ assessment, policy }: { assessment: CreditAssessment; policy: BankPolicy }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("amount");
  const [amount, setAmount] = useState(assessment.recommendedAmount);
  const [purpose, setPurpose] = useState<LoanPurpose | "">("");
  const [tenor, setTenor] = useState(assessment.recommendedTenorMonths);
  const [consents, setConsents] = useState({ data: false, accounts: false, repayment: false, terms: false });
  const [submitted, setSubmitted] = useState<{ id: string; reference: string } | null>(null);
  const [error, setError] = useState<string>();

  const max = assessment.eligibleAmount;
  const offer = useMemo(() => (amount && tenor ? priceLoan({ principal: amount, tenorMonths: tenor, policy, businessId: assessment.businessId, repaymentWindow: assessment.repaymentWindow, recommendedRepaymentDay: assessment.recommendedRepaymentDay }) : null), [amount, tenor, policy, assessment]);
  const amountError = amount <= 0 ? "Enter an amount." : amount > max ? `Amount cannot exceed your eligibility of ${formatNaira(max)}.` : amount < policy.minLoanAmount ? `Minimum amount is ${formatNaira(policy.minLoanAmount)}.` : "";
  const allConsented = Object.values(consents).every(Boolean);

  const submit = async () => {
    if (!purpose) return;
    setStage("submitting");
    setError(undefined);
    const r = await submitApplicationAction({ amount, purpose, tenorMonths: tenor });
    if (!r.ok) { setError(r.error); setStage("consent"); return; }
    setSubmitted({ id: r.data.id, reference: r.data.reference });
    setStage("submitted");
    // The server re-renders this route once the application exists, so the confirmation lives on the application page.
    router.push(`/sme/application/${r.data.id}?submitted=1`);
  };

  if (stage === "submitted" && submitted) {
    return (
      <Card className="max-w-[600px] fade-up">
        <div className="flex items-start gap-4">
          <CheckCircle2 size={24} className="text-success mt-0.5" />
          <div className="flex-1">
            <div className="eyebrow">Application submitted</div>
            <div className="text-[22px] font-semibold text-ink tnum mt-1.5">{submitted.reference}</div>
            <div className="text-[14px] text-ink-2 mt-2 leading-relaxed">Status: Under review. The bank has been notified and you will see every access to your financial profile in your activity log.</div>
            <div className="mt-6 flex gap-2">
              <Button variant="primary" onClick={() => router.push(`/sme/application/${submitted.id}`)}>View application</Button>
              <Link href="/sme"><Button>Back to overview</Button></Link>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (stage === "amount") {
    return (
      <div className="grid xl:grid-cols-[1fr_380px] gap-6 max-w-[1060px]">
        <Card>
          <CardHeader title="How much would you like to borrow?" />
          <div className="max-w-[380px]">
            <Label required hint={`Maximum ${formatNaira(max)}`}>Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-[14px]">₦</span>
              <Input className="pl-7 tnum text-[16px] h-10" inputMode="numeric" value={amount ? amount.toLocaleString("en-NG") : ""} onChange={(e) => setAmount(Math.min(Number(e.target.value.replace(/[^\d]/g, "")) || 0, max))} invalid={!!amountError} />
            </div>
            <FieldError>{amountError}</FieldError>
            <input type="range" min={policy.minLoanAmount} max={max} step={500000} value={Math.min(Math.max(amount, policy.minLoanAmount), max)} onChange={(e) => setAmount(Number(e.target.value))} className="w-full mt-4 accent-[var(--action-primary)]" aria-label="Amount slider" />
            <div className="flex justify-between text-[12px] text-ink-3 tnum mt-1"><span>{formatNaira(policy.minLoanAmount)}</span><span>{formatNaira(max)}</span></div>
          </div>
          <Divider />
          <div className="grid md:grid-cols-2 gap-6 max-w-[620px]">
            <div>
              <Label required>Loan purpose</Label>
              <Select value={purpose} onChange={(e) => setPurpose(e.target.value as LoanPurpose)}><option value="">Select</option>{PURPOSES.map((p) => <option key={p}>{p}</option>)}</Select>
            </div>
            <div>
              <Label required hint={`Recommended ${assessment.recommendedTenorMonths} months`}>Tenor</Label>
              <div className="grid grid-cols-4 gap-2">
                {policy.allowedTenors.map((t) => <button key={t} onClick={() => setTenor(t)} className={`h-9 rounded-[6px] border text-[13.5px] tnum ${tenor === t ? "border-primary bg-selected text-info font-medium" : "border-line-strong hover:bg-hover"}`}>{t} mo</button>)}
              </div>
            </div>
          </div>
          <Divider />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-[13px] text-ink-3">Interest rate <span className="tnum text-ink">{formatPercent(policy.annualInterestRate)} annualised</span>, reducing balance · Processing fee {formatPercent(policy.processingFeeRate, 1)}</p>
            <Button variant="primary" disabled={!!amountError || !purpose || !tenor} onClick={() => setStage("preview")}>Continue <ArrowRight size={14} /></Button>
          </div>
        </Card>
        <Card className="bg-sunken self-start">
          <div className="eyebrow mb-4">From your assessment</div>
          <div className="space-y-4">
            <Field label="Eligible lending amount"><span className="tnum font-medium">{formatNaira(max)}</span></Field>
            <Field label="Recommended amount"><span className="tnum font-medium">{formatNaira(assessment.recommendedAmount)}</span></Field>
            <Field label="Recommended repayment window"><span className="tnum font-medium">{formatWindow(assessment.repaymentWindow)}</span></Field>
          </div>
          <p className="text-[13px] text-ink-3 mt-5 leading-relaxed">You may apply for any amount within your eligibility. The bank reviews every application; eligibility is not an approval.</p>
        </Card>
      </div>
    );
  }

  if (stage === "preview" && offer) {
    return (
      <div className="max-w-[760px] space-y-6 fade-up">
        <Card>
          <CardHeader eyebrow="Repayment preview" title="What you would repay" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
            <Stat label="Requested" size="lg" value={formatNaira(offer.principal)} />
            <Stat label="Interest" size="lg" value={formatNaira(offer.interestAmount)} sub={`${formatPercent(offer.annualInterestRate)} annualised, reducing balance`} />
            <Stat label="Fees" size="lg" value={formatNaira(offer.feeAmount)} sub={`Processing fee ${formatPercent(offer.feeRate, 1)}`} />
            <Stat label="Total repayable" size="lg" value={formatNaira(offer.totalRepayable)} />
            <Stat label="Tenor" size="lg" value={`${offer.tenorMonths} months`} sub={`${offer.tenorMonths} instalments of ${formatNaira(offer.instalmentAmount)}`} />
            <Stat label="Expected repayment window" size="lg" value={`${formatWindow(offer.repaymentWindow)} monthly`} sub={`Recommended date: ${ordinal(offer.recommendedRepaymentDay)}`} />
          </div>
          <Divider />
          <p className="text-[14px] text-ink-2 leading-relaxed">Your repayment schedule is structured around the cash-flow pattern identified from your connected accounts. The processing fee is included in the total repayable and settled with the first instalment.</p>
        </Card>
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStage("amount")}>Back</Button>
          <Button variant="primary" onClick={() => setStage("consent")}>Review application <ArrowRight size={14} /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[760px] space-y-6 fade-up">
      <Card>
        <CardHeader eyebrow="Consent" title="Review and consent" description="Confirm the application details and the permissions you are granting." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 rounded-[6px] bg-sunken border border-line-subtle p-4">
          <Field label="Amount"><span className="tnum font-medium">{formatNaira(offer!.principal)}</span></Field>
          <Field label="Tenor">{offer!.tenorMonths} months</Field>
          <Field label="Total repayment"><span className="tnum font-medium">{formatNaira(offer!.totalRepayable)}</span></Field>
          <Field label="Repayment schedule"><span className="tnum">{offer!.tenorMonths} × {formatNaira(offer!.instalmentAmount)}, {formatWindow(offer!.repaymentWindow)} monthly</span></Field>
        </div>
        <div className="mt-6 space-y-4">
          <Checkbox checked={consents.data} onChange={(v) => setConsents({ ...consents, data: v })} label="Data-access permission" description="I authorise the bank to access the financial profile and consolidated account analysis generated from my connected accounts for the purpose of assessing this application." />
          <Checkbox checked={consents.accounts} onChange={(v) => setConsents({ ...consents, accounts: v })} label="Account connection permission" description="I confirm the connected institutions are accounts operated by the business and consent to their continued connection for the duration of any facility." />
          <Checkbox checked={consents.repayment} onChange={(v) => setConsents({ ...consents, repayment: v })} label="Repayment authorisation" description={`I authorise a direct-debit mandate for ${formatNaira(offer!.instalmentAmount)} monthly within the ${formatWindow(offer!.repaymentWindow)} window on the designated account if this application is approved.`} />
          <Checkbox checked={consents.terms} onChange={(v) => setConsents({ ...consents, terms: v })} label="Terms" description="I have read and accept the bank's SME credit facility terms, including interest, fees and the consequences of missed repayments." />
        </div>
        {error && <div className="mt-5"><Banner tone="danger" title="Submission failed">{error}</Banner></div>}
      </Card>
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStage("preview")} disabled={stage === "submitting"}>Back</Button>
        <Button variant="primary" disabled={!allConsented || !purpose} loading={stage === "submitting"} onClick={submit}>{stage === "submitting" ? "Submitting application" : "Submit application"}</Button>
      </div>
    </div>
  );
}
