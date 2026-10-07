"use client";
import { useMemo, useState } from "react";
import { ChevronDown, ScrollText } from "lucide-react";
import type { AuditEvent, AuditEventType } from "@/lib/domain/types";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatTime, formatNaira } from "@/lib/format";
import { EVENT_LABELS } from "@/lib/domain/labels";
import { ROLE_LABELS } from "@/lib/auth/roles";

const GROUPS: Record<string, AuditEventType[]> = {
  "Consent & access": ["CONSENT_RECORDED", "DATA_ACCESS", "ACCESS_REPORTED", "IDENTITY_VERIFIED", "ACCOUNT_CONNECTED", "ACCOUNT_CONNECTION_FAILED"],
  Assessment: ["FINANCIAL_PROFILE_GENERATED", "ASSESSMENT_CREATED"],
  Decisions: ["APPLICATION_SUBMITTED", "APPLICATION_REVIEW_STARTED", "INFORMATION_REQUESTED", "INFORMATION_PROVIDED", "APPLICATION_APPROVED", "APPLICATION_REJECTED"],
  "Disbursement & repayment": ["DISBURSEMENT_INITIATED", "DISBURSEMENT_CONFIRMED", "DISBURSEMENT_FAILED", "MANDATE_CREATED", "REPAYMENT_PROCESSED", "REPAYMENT_FAILED"],
  "Risk & policy": ["RISK_EVENT_CREATED", "CASE_UPDATED", "CASE_RESOLVED", "POLICY_UPDATED"],
};

function familyFor(type: AuditEventType): "neutral" | "info" | "success" | "warning" | "danger" {
  if (type === "DATA_ACCESS" || type === "APPLICATION_REVIEW_STARTED") return "info";
  if (type.endsWith("FAILED") || type === "APPLICATION_REJECTED" || type === "ACCESS_REPORTED") return "danger";
  if (type === "RISK_EVENT_CREATED") return "warning";
  if (type === "APPLICATION_APPROVED" || type === "DISBURSEMENT_CONFIRMED" || type === "REPAYMENT_PROCESSED") return "success";
  return "neutral";
}

export function AuditTable({ events }: { events: AuditEvent[] }) {
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const list = useMemo(() => {
    let l = events;
    if (group !== "all") l = l.filter((e) => GROUPS[group].includes(e.type));
    if (query.trim()) { const q = query.trim().toLowerCase(); l = l.filter((e) => e.applicationRef?.toLowerCase().includes(q) || e.actorName.toLowerCase().includes(q) || EVENT_LABELS[e.type].toLowerCase().includes(q) || e.hash.startsWith(q)); }
    return l;
  }, [events, group, query]);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Select value={group} onChange={(e) => setGroup(e.target.value)} className="w-[240px]"><option value="all">All event types</option>{Object.keys(GROUPS).map((g) => <option key={g}>{g}</option>)}</Select>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Application ID, actor, event or hash prefix" className="w-[340px]" />
      </div>
      <Card padded={false}>
        {list.length === 0 ? <EmptyState icon={ScrollText} title="No events match" /> : (
          <table className="data-table">
            <thead><tr><th>Timestamp</th><th>Event</th><th>Actor</th><th>Application</th><th>Resource</th><th>Reference</th><th>Integrity</th><th></th></tr></thead>
            <tbody>
              {list.map((e) => {
                const meta = Object.entries(e.metadata);
                const open = expanded === e.id;
                return (
                  <FragmentRow key={e.id}>
                    <tr className="row-link" onClick={() => setExpanded(open ? null : e.id)}>
                      <td className="tnum whitespace-nowrap"><div className="text-ink">{formatDate(e.timestamp)}</div><div className="text-[12.5px] text-ink-3">{formatTime(e.timestamp, true)}</div></td>
                      <td><Chip family={familyFor(e.type)} style={e.type === "APPLICATION_REJECTED" ? "outline" : "subtle"}>{e.type}</Chip></td>
                      <td><div className="text-ink">{e.actorName}</div><div className="text-[12.5px] text-ink-3">{e.actorRole === "SYSTEM" ? "System" : ROLE_LABELS[e.actorRole]}</div></td>
                      <td className="tnum text-ink-2">{e.applicationRef ?? "—"}</td>
                      <td className="text-ink-2">{e.resource ?? "—"}</td>
                      <td className="tnum text-[12.5px] text-ink-3 font-mono">#{e.seq} · {e.hash.slice(0, 12)}</td>
                      <td><Chip family="success">Verified</Chip></td>
                      <td><ChevronDown size={15} className={`text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} /></td>
                    </tr>
                    {open && (
                      <tr><td colSpan={8} className="!bg-sunken">
                        <div className="grid md:grid-cols-2 gap-8 py-2 fade-up">
                          <div>
                            <div className="eyebrow mb-2">Event metadata</div>
                            {meta.length === 0 ? <div className="text-[13px] text-ink-3">No additional metadata.</div> : <dl className="grid grid-cols-[150px_1fr] gap-y-1.5 text-[13px]">{meta.map(([k, v]) => <div key={k} className="contents"><dt className="text-ink-3">{k}</dt><dd className="text-ink tnum">{typeof v === "number" && (k.toLowerCase().includes("amount") || k === "totalRepayable") ? formatNaira(v) : String(v)}</dd></div>)}</dl>}
                          </div>
                          <div>
                            <div className="eyebrow mb-2">Integrity</div>
                            <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-[12.5px] font-mono break-all">
                              <dt className="text-ink-3 font-sans">Event ID</dt><dd className="text-ink">{e.id}</dd>
                              <dt className="text-ink-3 font-sans">Payload hash</dt><dd className="text-ink">{e.payloadHash}</dd>
                              <dt className="text-ink-3 font-sans">Previous hash</dt><dd className="text-ink">{e.previousHash}</dd>
                              <dt className="text-ink-3 font-sans">Event hash</dt><dd className="text-ink">{e.hash}</dd>
                            </dl>
                          </div>
                        </div>
                      </td></tr>
                    )}
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
