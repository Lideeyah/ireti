"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BankPolicy } from "@/lib/domain/types";
import { updatePolicyAction } from "@/app/actions";
import { Card, CardHeader, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Checkbox, Textarea, FieldError } from "@/components/ui/Input";
import { Banner } from "@/components/ui/Banner";

export function PolicyForm({ policy, readOnly }: { policy: BankPolicy; readOnly: boolean }) {
  const [draft, setDraft] = useState<BankPolicy>(policy);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();
  const num = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;
  const dirty = JSON.stringify(draft) !== JSON.stringify(policy);
  const save = () => start(async () => {
    const { version, updatedAt, updatedByName, ...patch } = draft; void version; void updatedAt; void updatedByName;
    const r = await updatePolicyAction(patch);
    if (!r.ok) { setError(r.error); return; }
    setError(undefined); setSaved(true); setTimeout(() => setSaved(false), 4000); router.refresh();
  });
  return (
    <div className="space-y-6">
      {saved && <Banner tone="success" title="Policy saved">A new policy version is active and the change has been recorded in the audit ledger.</Banner>}
      <div className="grid xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader eyebrow="Lending limits" title="Amounts and score" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div><Label hint="Naira">Maximum loan amount</Label><Input className="tnum" disabled={readOnly} value={draft.maxLoanAmount.toLocaleString("en-NG")} onChange={(e) => setDraft({ ...draft, maxLoanAmount: num(e.target.value) })} /></div>
            <div><Label hint="Naira">Minimum loan amount</Label><Input className="tnum" disabled={readOnly} value={draft.minLoanAmount.toLocaleString("en-NG")} onChange={(e) => setDraft({ ...draft, minLoanAmount: num(e.target.value) })} /></div>
            <div><Label hint="0 to 100">Minimum assessment score</Label><Input className="tnum" type="number" disabled={readOnly} value={draft.minAssessmentScore} onChange={(e) => setDraft({ ...draft, minAssessmentScore: num(e.target.value) })} /></div>
            <div><Label hint="Share of annualised net flow">Capacity ratio</Label><Input className="tnum" type="number" step="0.05" disabled={readOnly} value={draft.eligibility.capacityRatio} onChange={(e) => setDraft({ ...draft, eligibility: { ...draft.eligibility, capacityRatio: Number(e.target.value) } })} /></div>
            <div><Label hint="Share of eligibility">Recommended amount share</Label><Input className="tnum" type="number" step="0.05" disabled={readOnly} value={draft.eligibility.recommendedShare} onChange={(e) => setDraft({ ...draft, eligibility: { ...draft.eligibility, recommendedShare: Number(e.target.value) } })} /></div>
            <div><Label hint="Debt service ÷ net flow">Maximum debt-service ratio</Label><Input className="tnum" type="number" step="0.05" disabled={readOnly} value={draft.eligibility.maxDebtServiceRatio} onChange={(e) => setDraft({ ...draft, eligibility: { ...draft.eligibility, maxDebtServiceRatio: Number(e.target.value) } })} /></div>
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow="Pricing" title="Interest, fees and tenors" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div><Label hint="% annualised, reducing balance">Interest rate</Label><Input className="tnum" type="number" step="0.5" disabled={readOnly} value={+(draft.annualInterestRate * 100).toFixed(2)} onChange={(e) => setDraft({ ...draft, annualInterestRate: Number(e.target.value) / 100 })} /></div>
            <div><Label hint="% of principal">Processing fee</Label><Input className="tnum" type="number" step="0.1" disabled={readOnly} value={+(draft.processingFeeRate * 100).toFixed(2)} onChange={(e) => setDraft({ ...draft, processingFeeRate: Number(e.target.value) / 100 })} /></div>
          </div>
          <div className="mt-5">
            <Label hint="Months">Allowed tenors</Label>
            <div className="flex flex-wrap gap-2">{[3, 6, 9, 12, 18, 24].map((t) => { const on = draft.allowedTenors.includes(t); return <button key={t} disabled={readOnly} onClick={() => setDraft({ ...draft, allowedTenors: on ? draft.allowedTenors.filter((x) => x !== t) : [...draft.allowedTenors, t].sort((a, b) => a - b) })} className={`h-8 px-3.5 rounded-[6px] border text-[13px] tnum ${on ? "border-primary bg-selected text-info font-medium" : "border-line-strong hover:bg-hover"}`}>{t} months</button>; })}</div>
          </div>
          <Divider />
          <Label hint="One per line">Required documents</Label>
          <Textarea disabled={readOnly} value={draft.requiredDocuments.join("\n")} onChange={(e) => setDraft({ ...draft, requiredDocuments: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} placeholder="One per line" />
        </Card>
        <Card>
          <CardHeader eyebrow="Repayment rules" title="Mandate and collection" />
          <div className="space-y-5">
            <Checkbox checked={draft.repaymentRules.alignToInflowWindow} onChange={(v) => !readOnly && setDraft({ ...draft, repaymentRules: { ...draft.repaymentRules, alignToInflowWindow: v } })} label="Align repayment date to strongest observed inflow window" description="When off, repayments default to the disbursement anniversary date." />
            <div className="grid grid-cols-3 gap-x-6 gap-y-5">
              <div><Label hint="Days after disbursement">First repayment delay</Label><Input className="tnum" type="number" disabled={readOnly} value={draft.repaymentRules.minDaysBeforeFirstRepayment} onChange={(e) => setDraft({ ...draft, repaymentRules: { ...draft.repaymentRules, minDaysBeforeFirstRepayment: num(e.target.value) } })} /></div>
              <div><Label hint="Attempts per instalment">Maximum debit retries</Label><Input className="tnum" type="number" disabled={readOnly} value={draft.repaymentRules.maxDebitRetries} onChange={(e) => setDraft({ ...draft, repaymentRules: { ...draft.repaymentRules, maxDebitRetries: num(e.target.value) } })} /></div>
              <div><Label hint="Days after the window">Grace period</Label><Input className="tnum" type="number" disabled={readOnly} value={draft.repaymentRules.graceDays} onChange={(e) => setDraft({ ...draft, repaymentRules: { ...draft.repaymentRules, graceDays: num(e.target.value) } })} /></div>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow="Risk thresholds" title="Monitoring triggers" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div><Label hint="% below baseline">Inflow drop → watch</Label><Input className="tnum" type="number" disabled={readOnly} value={Math.round(draft.riskThresholds.inflowDropWatchPct * 100)} onChange={(e) => setDraft({ ...draft, riskThresholds: { ...draft.riskThresholds, inflowDropWatchPct: num(e.target.value) / 100 } })} /></div>
            <div><Label hint="% below baseline">Inflow drop → at risk</Label><Input className="tnum" type="number" disabled={readOnly} value={Math.round(draft.riskThresholds.inflowDropAtRiskPct * 100)} onChange={(e) => setDraft({ ...draft, riskThresholds: { ...draft.riskThresholds, inflowDropAtRiskPct: num(e.target.value) / 100 } })} /></div>
            <div><Label hint="Count per facility">Failed debits → at risk</Label><Input className="tnum" type="number" disabled={readOnly} value={draft.riskThresholds.failedDebitsAtRisk} onChange={(e) => setDraft({ ...draft, riskThresholds: { ...draft.riskThresholds, failedDebitsAtRisk: num(e.target.value) } })} /></div>
            <div><Label hint="Count per facility">Missed repayments → at risk</Label><Input className="tnum" type="number" disabled={readOnly} value={draft.riskThresholds.missedRepaymentsAtRisk} onChange={(e) => setDraft({ ...draft, riskThresholds: { ...draft.riskThresholds, missedRepaymentsAtRisk: num(e.target.value) } })} /></div>
          </div>
        </Card>
      </div>
      {!readOnly && (
        <div className="flex items-center justify-end gap-3">
          <FieldError>{error}</FieldError>
          <Button onClick={() => setDraft(policy)} disabled={!dirty || pending}>Discard changes</Button>
          <Button variant="primary" disabled={!dirty} loading={pending} onClick={save}>Save as new version</Button>
        </div>
      )}
    </div>
  );
}
