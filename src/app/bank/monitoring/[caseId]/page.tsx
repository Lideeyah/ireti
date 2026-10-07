"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store/store";
import { USERS } from "@/lib/seed/demoData";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardHeader, Field, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SeverityChip, CaseStatusChip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Label, Select, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Require } from "@/components/shell/Require";
import { formatDateTime, formatDate } from "@/lib/format";

export default function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  const db = useStore((s) => s.db);
  const assign = useStore((s) => s.assignCase);
  const addNote = useStore((s) => s.addCaseNote);
  const escalate = useStore((s) => s.escalateCase);
  const resolve = useStore((s) => s.resolveCase);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignee, setAssignee] = useState(USERS[2].name);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState("");

  const c = db.cases.find((x) => x.id === caseId);
  if (!c) return <Card><EmptyState title="Case not found" action={<Link href="/bank/monitoring"><Button size="sm">Back to monitoring</Button></Link>} /></Card>;
  const business = db.businesses.find((b) => b.id === c.businessId);
  const app = c.applicationId ? db.applications.find((a) => a.id === c.applicationId) : undefined;
  const event = db.riskEvents.find((e) => e.id === c.riskEventId);
  const history = [...c.history].reverse();

  return (
    <Require permission="bank:view_risk">
      <Link href="/bank/monitoring" className="inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-ink mb-2"><ArrowLeft size={13} /> Monitoring</Link>
      <PageHeader
        eyebrow="Ìrètí / Risk case"
        title={c.reference}
        meta={<><CaseStatusChip status={c.status} /><SeverityChip severity={c.severity} /><span>{business?.name}</span>{app && <><span>·</span><Link href={`/bank/applications/${app.id}`} className="text-link hover:underline tnum">{app.reference}</Link></>}</>}
        actions={
          c.status !== "resolved" ? (
            <Require permission="bank:manage_cases" inline label="Case actions require">
              <Button onClick={() => setAssignOpen(true)}>Assign</Button>
              <Button onClick={() => setNoteOpen(true)}>Add note</Button>
              <Button onClick={() => escalate(c.id)} disabled={c.status === "escalated"}>Escalate</Button>
              <Button variant="primary" onClick={() => setResolveOpen(true)}>Resolve</Button>
            </Require>
          ) : undefined
        }
      />
      <div className="grid xl:grid-cols-[1fr_1fr] gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader eyebrow="Case" title={c.trigger} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Case ID"><span className="tnum">{c.reference}</span></Field>
              <Field label="Severity"><SeverityChip severity={c.severity} /></Field>
              <Field label="Trigger">{c.trigger}</Field>
              <Field label="Created">{formatDate(c.createdAt)}</Field>
              <Field label="Owner">{c.owner}</Field>
              <Field label="Assigned to">{c.assigneeName ?? "Unassigned"}</Field>
              <Field label="Status"><CaseStatusChip status={c.status} /></Field>
              {c.resolvedAt && <Field label="Resolved">{formatDateTime(c.resolvedAt)}</Field>}
            </div>
            <Divider className="my-4" />
            <div className="eyebrow mb-1">Trigger detail</div>
            <p className="text-[13px] text-ink-2">{event?.description}</p>
          </Card>
          <Card>
            <CardHeader eyebrow="Notes" title={c.notes.length ? `${c.notes.length} note${c.notes.length === 1 ? "" : "s"}` : "No notes"} />
            {c.notes.length === 0 ? (
              <p className="text-[13px] text-ink-3">Record the outcome of calls, agreed arrangements and verification steps here. Notes are hashed into the audit ledger.</p>
            ) : (
              <ul className="space-y-3">
                {[...c.notes].reverse().map((n, i) => (
                  <li key={i} className="rounded-[6px] bg-sunken border border-line-subtle px-3 py-2.5">
                    <div className="text-[12px] text-ink-3 mb-1">{n.byName} · {formatDateTime(n.at)}</div>
                    <p className="text-[13px] text-ink">{n.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card padded={false}>
          <div className="px-4 py-3 border-b border-line-subtle"><div className="eyebrow">State history</div><div className="text-[13px] text-ink-2 mt-0.5">Every state change is logged to the audit ledger.</div></div>
          <ol className="divide-y divide-line-subtle">
            {history.map((h, i) => (
              <li key={i} className="px-4 py-2.5 flex items-start gap-3 text-[13px]">
                <span className="tnum text-ink-3 w-[150px] shrink-0">{formatDateTime(h.at)}</span>
                <span className="flex-1 text-ink">{h.action}</span>
                <span className="text-ink-3">{h.byName}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign case" footer={<><Button onClick={() => setAssignOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => { assign(c.id, assignee); setAssignOpen(false); }}>Assign</Button></>}>
        <Label>Assignee</Label>
        <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          {USERS.filter((u) => u.organisationId === "org_bank").map((u) => <option key={u.id} value={u.name}>{u.name} · {u.title}</option>)}
        </Select>
      </Modal>
      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Add note" footer={<><Button onClick={() => setNoteOpen(false)}>Cancel</Button><Button variant="primary" disabled={note.trim().length < 3} onClick={() => { addNote(c.id, note.trim()); setNote(""); setNoteOpen(false); }}>Save note</Button></>}>
        <Label>Note</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done, agreed or observed." />
      </Modal>
      <Modal open={resolveOpen} onClose={() => setResolveOpen(false)} title="Resolve case" footer={<><Button onClick={() => setResolveOpen(false)}>Cancel</Button><Button variant="primary" disabled={resolveNote.trim().length < 3} onClick={() => { resolve(c.id, resolveNote.trim()); setResolveOpen(false); }}>Resolve case</Button></>}>
        <p className="text-[13px] text-ink-2 mb-3">Resolving closes the case and, if no other cases are open on the facility, returns its health to Watch or Healthy depending on the repayment position.</p>
        <Label required>Resolution</Label>
        <Textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="How the case was resolved." />
      </Modal>
    </Require>
  );
}
