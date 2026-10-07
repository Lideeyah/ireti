"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store/store";
import type { BankPolicy } from "@/lib/domain/types";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Checkbox, Textarea } from "@/components/ui/Input";
import { Banner } from "@/components/ui/Banner";
import { Require } from "@/components/shell/Require";
import { formatDateTime } from "@/lib/format";

export default function PolicyPage() {
  const policy = useStore((s) => s.db.policy);
  const update = useStore((s) => s.updatePolicy);
  const [draft, setDraft] = useState<BankPolicy>(policy);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(policy), [policy]);

  const num = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;
  const dirty = JSON.stringify(draft) !== JSON.stringify(policy);
  const invalid = draft.minAssessmentScore < 0 || draft.minAssessmentScore > 100 || draft.maxLoanAmount <= draft.minLoanAmount || draft.allowedTenors.length === 0 || draft.annualInterestRate <= 0;

  return (
    <Require permission="bank:configure_policy">
      <PageHeader eyebrow="Ìrètí / Lending policy" title="Lending policy configuration" description="Every figure the product uses for eligibility, pricing, repayment and risk comes from this policy. Changes create a new policy version; existing applications keep the version they were assessed under." meta={<><span>Version {policy.version}</span><span>·</span><span>Updated {formatDateTime(policy.updatedAt)} by {policy.updatedByName}</span></>} actions={<><Button onClick={() => setDraft(policy)} disabled={!dirty}>Discard</Button><Button variant="primary" disabled={!dirty || invalid} onClick={() => { update(draft); setSaved(true); setTimeout(() => setSaved(false), 3000); }}>Save as new version</Button></>} />
      {saved && <div className="mb-4"><Banner tone="success" title="Policy saved">A new policy version is active and the change has been recorded in the audit ledger.</Banner></div>}
      <div className="grid xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader eyebrow="Lending limits" title="Amounts and score" />
          <div className="grid grid-cols-2 gap-4">
            <div><Label hint="₦">Maximum loan amount</Label><Input className="tnum" value={draft.maxLoanAmount.toLocaleString("en-NG")} onChange={(e) => setDraft({ ...draft, maxLoanAmount: num(e.target.value) })} /></div>
            <div><Label hint="₦">Minimum loan amount</Label><Input className="tnum" value={draft.minLoanAmount.toLocaleString("en-NG")} onChange={(e) => setDraft({ ...draft, minLoanAmount: num(e.target.value) })} /></div>
            <div><Label hint="0–100">Minimum assessment score</Label><Input className="tnum" type="number" value={draft.minAssessmentScore} onChange={(e) => setDraft({ ...draft, minAssessmentScore: num(e.target.value) })} /></div>
            <div><Label hint="share of annualised net flow">Capacity ratio</Label><Input className="tnum" type="number" step="0.05" value={draft.eligibility.capacityRatio} onChange={(e) => setDraft({ ...draft, eligibility: { ...draft.eligibility, capacityRatio: Number(e.target.value) } })} /></div>
            <div><Label hint="share of eligibility">Recommended amount share</Label><Input className="tnum" type="number" step="0.05" value={draft.eligibility.recommendedShare} onChange={(e) => setDraft({ ...draft, eligibility: { ...draft.eligibility, recommendedShare: Number(e.target.value) } })} /></div>
            <div><Label hint="debt service / net flow">Maximum debt-service ratio</Label><Input className="tnum" type="number" step="0.05" value={draft.eligibility.maxDebtServiceRatio} onChange={(e) => setDraft({ ...draft, eligibility: { ...draft.eligibility, maxDebtServiceRatio: Number(e.target.value) } })} /></div>
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow="Pricing" title="Interest, fees and tenors" />
          <div className="grid grid-cols-2 gap-4">
            <div><Label hint="annualised, reducing balance">Interest rate</Label><Input className="tnum" type="number" step="0.5" value={+(draft.annualInterestRate * 100).toFixed(2)} onChange={(e) => setDraft({ ...draft, annualInterestRate: Number(e.target.value) / 100 })} /></div>
            <div><Label hint="% of principal">Processing fee</Label><Input className="tnum" type="number" step="0.1" value={+(draft.processingFeeRate * 100).toFixed(2)} onChange={(e) => setDraft({ ...draft, processingFeeRate: Number(e.target.value) / 100 })} /></div>
          </div>
          <div className="mt-4">
            <Label>Allowed tenors</Label>
            <div className="flex flex-wrap gap-1.5">
              {[3, 6, 9, 12, 18, 24].map((t) => {
                const on = draft.allowedTenors.includes(t);
                return <button key={t} onClick={() => setDraft({ ...draft, allowedTenors: on ? draft.allowedTenors.filter((x) => x !== t) : [...draft.allowedTenors, t].sort((a, b) => a - b) })} className={`h-7 px-3 rounded-[6px] border text-[12.5px] tnum ${on ? "border-primary bg-selected text-info font-medium" : "border-line-strong hover:bg-hover"}`}>{t} months</button>;
              })}
            </div>
          </div>
          <Divider className="my-4" />
          <Label>Required documents</Label>
          <Textarea value={draft.requiredDocuments.join("\n")} onChange={(e) => setDraft({ ...draft, requiredDocuments: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} placeholder="One per line" />
        </Card>
        <Card>
          <CardHeader eyebrow="Repayment rules" title="Mandate and collection" />
          <div className="space-y-3">
            <Checkbox checked={draft.repaymentRules.alignToInflowWindow} onChange={(v) => setDraft({ ...draft, repaymentRules: { ...draft.repaymentRules, alignToInflowWindow: v } })} label="Align repayment date to strongest observed inflow window" description="When off, repayments default to the disbursement anniversary date." />
            <div className="grid grid-cols-3 gap-4">
              <div><Label hint="days">Minimum days before first repayment</Label><Input className="tnum" type="number" value={draft.repaymentRules.minDaysBeforeFirstRepayment} onChange={(e) => setDraft({ ...draft, repaymentRules: { ...draft.repaymentRules, minDaysBeforeFirstRepayment: num(e.target.value) } })} /></div>
              <div><Label>Maximum debit retries</Label><Input className="tnum" type="number" value={draft.repaymentRules.maxDebitRetries} onChange={(e) => setDraft({ ...draft, repaymentRules: { ...draft.repaymentRules, maxDebitRetries: num(e.target.value) } })} /></div>
              <div><Label hint="days">Grace period</Label><Input className="tnum" type="number" value={draft.repaymentRules.graceDays} onChange={(e) => setDraft({ ...draft, repaymentRules: { ...draft.repaymentRules, graceDays: num(e.target.value) } })} /></div>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow="Risk thresholds" title="Monitoring triggers" />
          <div className="grid grid-cols-2 gap-4">
            <div><Label hint="% drop → watch">Inflow drop (watch)</Label><Input className="tnum" type="number" value={Math.round(draft.riskThresholds.inflowDropWatchPct * 100)} onChange={(e) => setDraft({ ...draft, riskThresholds: { ...draft.riskThresholds, inflowDropWatchPct: num(e.target.value) / 100 } })} /></div>
            <div><Label hint="% drop → at risk">Inflow drop (at risk)</Label><Input className="tnum" type="number" value={Math.round(draft.riskThresholds.inflowDropAtRiskPct * 100)} onChange={(e) => setDraft({ ...draft, riskThresholds: { ...draft.riskThresholds, inflowDropAtRiskPct: num(e.target.value) / 100 } })} /></div>
            <div><Label>Failed debits → at risk</Label><Input className="tnum" type="number" value={draft.riskThresholds.failedDebitsAtRisk} onChange={(e) => setDraft({ ...draft, riskThresholds: { ...draft.riskThresholds, failedDebitsAtRisk: num(e.target.value) } })} /></div>
            <div><Label>Missed repayments → at risk</Label><Input className="tnum" type="number" value={draft.riskThresholds.missedRepaymentsAtRisk} onChange={(e) => setDraft({ ...draft, riskThresholds: { ...draft.riskThresholds, missedRepaymentsAtRisk: num(e.target.value) } })} /></div>
          </div>
        </Card>
      </div>
    </Require>
  );
}
