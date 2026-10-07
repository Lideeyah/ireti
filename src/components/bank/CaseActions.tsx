"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignCaseAction, addCaseNoteAction, escalateCaseAction, resolveCaseAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Select, Textarea, FieldError } from "@/components/ui/Input";

export function CaseActions({ caseId, status, staff }: { caseId: string; status: string; staff: { name: string; title: string }[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "assign" | "note" | "resolve">(null);
  const [assignee, setAssignee] = useState(staff[0]?.name ?? "");
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const close = () => { setModal(null); setText(""); setError(undefined); };
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) => start(async () => { const r = await fn(); if (!r.ok) { setError(r.error); return; } close(); router.refresh(); });
  return (
    <>
      <Button onClick={() => setModal("assign")}>Assign</Button>
      <Button onClick={() => setModal("note")}>Add note</Button>
      <Button disabled={status === "escalated"} loading={pending && modal === null} onClick={() => act(() => escalateCaseAction(caseId))}>Escalate</Button>
      <Button variant="primary" onClick={() => setModal("resolve")}>Resolve</Button>
      <Modal open={modal === "assign"} onClose={close} title="Assign case" footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" loading={pending} onClick={() => act(() => assignCaseAction(caseId, assignee))}>Assign</Button></>}>
        <Label>Assignee</Label>
        <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>{staff.map((s) => <option key={s.name} value={s.name}>{s.name} · {s.title}</option>)}</Select>
        <FieldError>{error}</FieldError>
      </Modal>
      <Modal open={modal === "note"} onClose={close} title="Add note" footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={text.trim().length < 3} loading={pending} onClick={() => act(() => addCaseNoteAction(caseId, text))}>Save note</Button></>}>
        <Label>Note</Label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What was done, agreed or observed." />
        <FieldError>{error}</FieldError>
      </Modal>
      <Modal open={modal === "resolve"} onClose={close} title="Resolve case" footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={text.trim().length < 3} loading={pending} onClick={() => act(() => resolveCaseAction(caseId, text))}>Resolve case</Button></>}>
        <p className="text-[13.5px] text-ink-2 mb-4 leading-relaxed">Resolving closes the case and, if no other cases are open on the facility, returns its health to Watch or Healthy depending on the repayment position.</p>
        <Label required>Resolution</Label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="How the case was resolved." />
        <FieldError>{error}</FieldError>
      </Modal>
    </>
  );
}
