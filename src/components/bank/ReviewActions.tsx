"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CreditAssessment, LoanApplication, LoanOffer } from "@/lib/domain/types";
import { approveApplicationAction, rejectApplicationAction, requestInformationAction, initiateDisbursementAction, escalateDisbursementAction, processRepaymentAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Banner } from "@/components/ui/Banner";
import { Stat, Divider } from "@/components/ui/Card";
import { Checkbox, Label, Textarea, FieldError } from "@/components/ui/Input";
import { INFORMATION_ITEMS } from "@/lib/domain/labels";
import { formatNaira, formatWindow } from "@/lib/format";
import { ordinal } from "@/lib/util/dates";

export function DecisionActions({ app, offer, assessment, reviewerName, reviewerTitle }: { app: LoanApplication; offer: LoanOffer; assessment: CreditAssessment; reviewerName: string; reviewerTitle: string }) {
  const router = useRouter();
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoItems, setInfoItems] = useState<string[]>([]);
  const [infoMessage, setInfoMessage] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveState, setApproveState] = useState<"idle" | "submitting" | "confirmed">("idle");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const approve = async () => {
    setApproveState("submitting");
    setError(undefined);
    const r = await approveApplicationAction(app.id);
    if (!r.ok) { setError(r.error); setApproveState("idle"); return; }
    setApproveState("confirmed");
    // The page re-renders into the disbursement state; the confirmation is shown there.
    router.replace("?approved=1");
    router.refresh();
  };
  const awaitingInfo = app.status === "additional_information" && !app.informationRequest?.respondedAt;

  return (
    <>
      <Button variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button>
      <Button onClick={() => setInfoOpen(true)} disabled={awaitingInfo}>Request information</Button>
      <Button variant="primary" onClick={() => { setApproveState("idle"); setError(undefined); setApproveOpen(true); }}>Approve</Button>

      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} eyebrow="Bank review" title="Request additional information" footer={<><Button onClick={() => setInfoOpen(false)}>Cancel</Button><Button variant="primary" disabled={infoItems.length === 0} loading={pending} onClick={() => start(async () => { const r = await requestInformationAction(app.id, infoItems, infoMessage.trim() || undefined); if (!r.ok) { setError(r.error); return; } setInfoOpen(false); setInfoItems([]); setInfoMessage(""); router.refresh(); })}>Send request</Button></>}>
        <div className="space-y-3">{INFORMATION_ITEMS.map((item) => <Checkbox key={item} checked={infoItems.includes(item)} onChange={(v) => setInfoItems(v ? [...infoItems, item] : infoItems.filter((i) => i !== item))} label={item} />)}</div>
        <div className="mt-5"><Label>Message to applicant (optional)</Label><Textarea value={infoMessage} onChange={(e) => setInfoMessage(e.target.value)} placeholder="Describe what is needed and why." /></div>
        <FieldError>{error}</FieldError>
      </Modal>

      <Modal open={approveOpen} onClose={() => approveState !== "submitting" && setApproveOpen(false)} eyebrow="Approve application" title={approveState === "confirmed" ? "Approval confirmed" : `Approve ${formatNaira(app.amount)}`} footer={approveState === "confirmed" ? <Button variant="primary" onClick={() => setApproveOpen(false)}>Done</Button> : <><Button onClick={() => setApproveOpen(false)} disabled={approveState === "submitting"}>Cancel</Button><Button variant="primary" loading={approveState === "submitting"} onClick={approve}>{approveState === "submitting" ? "Submitting approval to banking system" : "Confirm approval"}</Button></>}>
        {approveState === "confirmed" ? (
          <div className="space-y-4">
            <Banner tone="success" title="Approval recorded in the audit ledger">The application has moved to Preparing disbursement. Operations can now initiate disbursement to the applicant&apos;s designated account.</Banner>
            <p className="text-[13px] text-ink-3">Disbursement is a separate, explicitly initiated step and is only confirmed on a successful banking response.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <Stat label="Amount" value={formatNaira(app.amount)} />
              <Stat label="Tenor" value={`${app.tenorMonths} months`} />
              <Stat label="Total expected repayment" value={formatNaira(offer.totalRepayable)} />
              <Stat label="Repayment window" value={`${formatWindow(offer.repaymentWindow)} · ${ordinal(offer.recommendedRepaymentDay)}`} />
            </div>
            <Divider />
            <p className="text-[13px] text-ink-3 leading-relaxed">Approving records your decision as {reviewerName}{reviewerTitle ? ` (${reviewerTitle})` : ""}. The system recommendation was “{assessment.recommendation.headline}” with {assessment.recommendation.confidence.toLowerCase()} confidence; the decision is yours.</p>
            <FieldError>{error}</FieldError>
          </div>
        )}
      </Modal>

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} eyebrow="Decision" title="Reject application" footer={<><Button onClick={() => setRejectOpen(false)}>Cancel</Button><Button variant="destructive" disabled={rejectNote.trim().length < 10} loading={pending} onClick={() => start(async () => { const r = await rejectApplicationAction(app.id, rejectNote.trim()); if (!r.ok) { setError(r.error); return; } setRejectOpen(false); router.refresh(); })}>Confirm rejection</Button></>}>
        <Label required hint="Shared with the applicant">Reason</Label>
        <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="State the basis for the decision." />
        <FieldError>{error}</FieldError>
      </Modal>
    </>
  );
}

export function DisbursementActions({ applicationId, status }: { applicationId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(key); setError(undefined);
    const r = await fn();
    if (!r.ok) setError(r.error);
    setBusy(null);
    router.refresh();
  };
  return (
    <div className="flex items-center gap-2 shrink-0 flex-nowrap">
      {error && <span className="text-[12.5px] text-danger">{error}</span>}
      {status === "failed" && <Button loading={busy === "esc"} onClick={() => run("esc", () => escalateDisbursementAction(applicationId))}>Escalate to operations</Button>}
      <Button variant="primary" loading={busy === "init" || status === "processing"} disabled={status === "processing"} onClick={() => run("init", () => initiateDisbursementAction(applicationId))}>{status === "failed" ? "Retry disbursement" : status === "processing" ? "Initiating disbursement" : "Initiate disbursement"}</Button>
    </div>
  );
}

export function RepaymentActions({ repaymentId, failed }: { repaymentId: string; failed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const run = async (key: string, force?: "success" | "failure") => {
    setBusy(key); setError(undefined);
    const r = await processRepaymentAction(repaymentId, force);
    if (!r.ok) setError(r.error);
    setBusy(null);
    router.refresh();
  };
  return (
    <div className="flex items-center gap-2 shrink-0 flex-nowrap">
      {error && <span className="text-[12.5px] text-danger">{error}</span>}
      <Button loading={busy === "ok"} onClick={() => run("ok")}>{failed ? "Retry debit" : "Process next repayment"}</Button>
    </div>
  );
}
