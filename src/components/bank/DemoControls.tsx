"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetDemoAction, simulateRepaymentAction } from "@/app/actions";
import { Card, CardHeader, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Select, FieldError } from "@/components/ui/Input";
import { Banner } from "@/components/ui/Banner";

export function DemoControls({ facilities }: { facilities: { id: string; reference: string; business: string }[] }) {
  const router = useRouter();
  const [facility, setFacility] = useState(facilities[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string }>();
  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => {
    setBusy(key); setMsg(undefined);
    const r = await fn();
    setMsg(r.ok ? { tone: "success", text: ok } : { tone: "danger", text: r.error ?? "Failed" });
    setBusy(null);
    router.refresh();
  };
  return (
    <Card>
      <CardHeader eyebrow="Demo controls" title="Reset and simulate" description="Each control runs the real services and records the same audit events as the normal flow. Approval and disbursement are performed from the application review screen." />
      {msg && <div className="mb-5"><Banner tone={msg.tone}>{msg.text}</Banner></div>}
      <div className="space-y-5">
        <div>
          <Label>Repayment simulation</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={facility} onChange={(e) => setFacility(e.target.value)} className="sm:w-[320px]">{facilities.length === 0 && <option value="">No disbursed facilities</option>}{facilities.map((f) => <option key={f.id} value={f.id}>{f.reference} · {f.business}</option>)}</Select>
            <Button disabled={!facility} loading={busy === "ok"} onClick={() => run("ok", () => simulateRepaymentAction(facility, "success"), "Repayment processed.")}>Simulate repayment</Button>
            <Button variant="destructive" disabled={!facility} loading={busy === "fail"} onClick={() => run("fail", () => simulateRepaymentAction(facility, "failure"), "Repayment failed; a risk case was opened.")}>Simulate repayment failure</Button>
          </div>
        </div>
        <Divider />
        <div>
          <Label>Environment</Label>
          <p className="text-[13px] text-ink-3 mb-3">Wipes all data, reseeds the demo bank, staff and queue, and signs everyone out. The demo SME account starts un-onboarded.</p>
          <Button variant="destructive" loading={busy === "reset"} onClick={() => run("reset", async () => { const r = await resetDemoAction(); if (r.ok) router.push("/sign-in"); return r; }, "Demo reset.")}>Reset demo environment</Button>
          <FieldError />
        </div>
      </div>
    </Card>
  );
}
