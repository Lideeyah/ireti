"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { provideInformationAction, reportAccessAction, retryOwnRepaymentAction, disconnectInstitutionAction, refreshConnectionAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Banner } from "@/components/ui/Banner";
import { Divider } from "@/components/ui/Card";

export function ProvideInformationButton({ applicationId }: { applicationId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return <Button size="sm" variant="primary" loading={pending} onClick={() => start(async () => { await provideInformationAction(applicationId); router.refresh(); })}>Provide information</Button>;
}

export function ReportAccessButton({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Flag size={13} /> Report unusual access</Button>
      <Modal open={open} onClose={() => setOpen(false)} eyebrow="Customer control" title="Report unusual access" footer={ref ? <Button variant="primary" onClick={() => setOpen(false)}>Done</Button> : <><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={pending} onClick={() => start(async () => { const r = await reportAccessAction(applicationId); if (r.ok) { setRef(r.data.reference); router.refresh(); } })}>Submit report</Button></>}>
        {ref ? (
          <Banner tone="info" title={`Report received — case ${ref}`}>Compliance has been notified and will review the access record. The report itself is recorded in the audit ledger.</Banner>
        ) : (
          <>
            <p className="text-[14px] text-ink-2 leading-relaxed">If you do not recognise an access event listed on this application, submit a report. A compliance case is opened and the access record is reviewed against the ledger. Your application is not affected.</p>
            <Divider />
            <p className="text-[13px] text-ink-3">Reports are themselves recorded in the audit ledger.</p>
          </>
        )}
      </Modal>
    </>
  );
}

export function RetryRepaymentButton({ repaymentId, variant = "secondary", label = "Retry" }: { repaymentId: string; variant?: "primary" | "secondary"; label?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const router = useRouter();
  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant={variant} loading={pending} onClick={() => start(async () => { const r = await retryOwnRepaymentAction(repaymentId); if (!r.ok) setError(r.error); router.refresh(); })}>{label}</Button>
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </span>
  );
}

export function ConnectionButtons({ connectionId, status }: { connectionId: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      {status === "connected" && <Button size="sm" loading={pending} onClick={() => start(async () => { await refreshConnectionAction(connectionId); router.refresh(); })}>Refresh</Button>}
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await disconnectInstitutionAction(connectionId); router.refresh(); })}>Disconnect</Button>
    </div>
  );
}
