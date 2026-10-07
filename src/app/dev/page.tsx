"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store/store";
import { useAdebayo } from "@/hooks/useAdebayo";
import { HydrationGate } from "@/components/shell/HydrationGate";
import { Wordmark } from "@/components/ui/Wordmark";
import { Card, CardHeader, Field } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApplicationStatusChip, HealthChip } from "@/components/ui/Chip";
import { DemoTag } from "@/components/ui/Banner";
import { USERS } from "@/lib/seed/demoData";
import { ROLE_LABELS } from "@/lib/auth/roles";

export default function DevPage() {
  return (
    <main className="min-h-screen">
      <header className="h-14 flex items-center justify-between px-8 border-b border-line bg-surface">
        <Wordmark suffix="Demo controls" />
        <DemoTag>Development route</DemoTag>
      </header>
      <div className="max-w-[900px] mx-auto px-8 py-6">
        <Link href="/" className="inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-ink mb-4"><ArrowLeft size={13} /> Entry</Link>
        <HydrationGate><Controls /></HydrationGate>
      </div>
    </main>
  );
}

function Controls() {
  const s = useStore();
  const { business, activeApplication, plan, repayments, assessment } = useAdebayo();
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const run = async (key: string, fn: () => Promise<unknown> | unknown, msg: string) => {
    setBusy(key);
    try {
      await fn();
      setLog((l) => [`${new Date().toLocaleTimeString("en-GB")} · ${msg}`, ...l]);
    } catch (e) {
      setLog((l) => [`${new Date().toLocaleTimeString("en-GB")} · Failed: ${e instanceof Error ? e.message : String(e)}`, ...l]);
    }
    setBusy(null);
  };
  const nextRep = repayments.find((r) => r.status === "scheduled" || r.status === "failed");
  const canApprove = activeApplication && ["submitted", "under_review", "additional_information"].includes(activeApplication.status);
  const canDisburse = activeApplication && ["disbursement_pending", "disbursement_failed"].includes(activeApplication.status) && activeApplication.disbursement?.status !== "processing";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader eyebrow="Current demo state" title={business ? business.name : "No business onboarded"} />
        <div className="grid grid-cols-4 gap-4">
          <Field label="Assessment">{assessment ? `${assessment.score} / 100` : "—"}</Field>
          <Field label="Application">{activeApplication ? <span className="inline-flex items-center gap-2 tnum">{activeApplication.reference} <ApplicationStatusChip status={activeApplication.status} health={plan?.health} /></span> : "None"}</Field>
          <Field label="Facility health">{plan ? <HealthChip health={plan.health} /> : "—"}</Field>
          <Field label="Bank persona">{s.currentBankUser().name} · {ROLE_LABELS[s.currentBankUser().role]}</Field>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader eyebrow="Environment" title="Reset and role" />
          <div className="space-y-2">
            <Button variant="destructive" loading={busy === "reset"} onClick={() => run("reset", () => s.resetDemo(), "Demo reset to seeded state")}>Reset demo</Button>
            <div className="pt-2">
              <div className="text-[12px] text-ink-3 mb-1.5">Switch bank persona</div>
              <div className="flex flex-wrap gap-1.5">
                {USERS.filter((u) => u.organisationId === "org_bank").map((u) => (
                  <Button key={u.id} size="sm" variant={s.bankUserId === u.id ? "primary" : "secondary"} onClick={() => s.setBankUser(u.id)}>{ROLE_LABELS[u.role]}</Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Link href="/sme"><Button size="sm">Open SME</Button></Link>
              <Link href="/bank"><Button size="sm">Open Bank</Button></Link>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow="Journey shortcuts" title="Simulate" description="Each shortcut runs the real use-case through the same services and records the same audit events as the UI." />
          <div className="space-y-2">
            <Button className="w-full justify-start" disabled={!!activeApplication && activeApplication.status !== "rejected"} loading={busy === "load"} onClick={() => run("load", () => s.loadSampleApplication(), "Sample application loaded (Adebayo Foods, onboarded, connected, assessed, submitted)")}>Load sample application</Button>
            <Button className="w-full justify-start" disabled={!canApprove} loading={busy === "approve"} onClick={() => run("approve", () => s.approveApplication(activeApplication!.id), "Application approved; preparing disbursement")}>Simulate approval</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={!canDisburse} loading={busy === "disb"} onClick={() => run("disb", () => s.initiateDisbursement(activeApplication!.id, "success"), "Disbursement confirmed")}>Simulate disbursement</Button>
              <Button disabled={!canDisburse} loading={busy === "disbf"} variant="destructive" onClick={() => run("disbf", () => s.initiateDisbursement(activeApplication!.id, "failure"), "Disbursement failed")}>Simulate disbursement failure</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={!nextRep} loading={busy === "rep"} onClick={() => run("rep", () => s.processRepayment(nextRep!.id, "success"), "Repayment processed")}>Simulate repayment</Button>
              <Button disabled={!nextRep} loading={busy === "repf"} variant="destructive" onClick={() => run("repf", () => s.processRepayment(nextRep!.id, "failure"), "Repayment failed; risk case opened")}>Simulate repayment failure</Button>
            </div>
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="px-4 py-3 border-b border-line-subtle eyebrow">Log</div>
        {log.length === 0 ? <div className="px-4 py-6 text-[13px] text-ink-3">No actions yet.</div> : <ul className="divide-y divide-line-subtle">{log.map((l, i) => <li key={i} className="px-4 py-2 text-[12.5px] text-ink-2 tnum">{l}</li>)}</ul>}
      </Card>
    </div>
  );
}
