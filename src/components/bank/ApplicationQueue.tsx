"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Search } from "lucide-react";
import type { Business, CreditAssessment, LoanApplication, RepaymentPlan } from "@/lib/domain/types";
import { ApplicationStatusChip, RiskGradeChip, RatingChip } from "@/components/ui/Chip";
import { SegmentedControl } from "@/components/ui/Tabs";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatNaira, formatRelative } from "@/lib/format";

export interface QueueRow { app: LoanApplication; business: Business; assessment: CreditAssessment; plan?: RepaymentPlan }
type Filter = "all" | "new" | "under_review" | "additional_information" | "approved" | "rejected" | "disbursed" | "at_risk";
type Sort = "newest" | "amount" | "risk" | "score";

const matches = (f: Filter, { app, plan }: QueueRow) => {
  switch (f) {
    case "all": return true;
    case "new": return app.status === "submitted";
    case "under_review": return app.status === "under_review";
    case "additional_information": return app.status === "additional_information";
    case "approved": return ["approved", "disbursement_pending", "disbursement_failed"].includes(app.status);
    case "rejected": return app.status === "rejected";
    case "disbursed": return app.status === "disbursed";
    case "at_risk": return plan?.health === "at_risk" || plan?.health === "watch";
  }
};

export function ApplicationQueue({ rows, limit, compact = false }: { rows: QueueRow[]; limit?: number; compact?: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");

  const list = useMemo(() => {
    let l = rows.filter((r) => matches(filter, r));
    if (query.trim()) { const q = query.trim().toLowerCase(); l = l.filter(({ app, business }) => app.reference.toLowerCase().includes(q) || business.name.toLowerCase().includes(q)); }
    l = [...l].sort((a, b) => sort === "newest" ? b.app.submittedAt.localeCompare(a.app.submittedAt) : sort === "amount" ? b.app.amount - a.app.amount : sort === "risk" ? a.assessment.score - b.assessment.score : b.assessment.score - a.assessment.score);
    return limit ? l.slice(0, limit) : l;
  }, [rows, filter, query, sort, limit]);

  const count = (f: Filter) => rows.filter((r) => matches(f, r)).length;

  return (
    <div>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <SegmentedControl value={filter} onChange={setFilter} options={[
            { value: "all", label: "All", count: count("all") }, { value: "new", label: "New", count: count("new") }, { value: "under_review", label: "Under review", count: count("under_review") },
            { value: "additional_information", label: "Additional information", count: count("additional_information") }, { value: "approved", label: "Approved", count: count("approved") },
            { value: "rejected", label: "Rejected", count: count("rejected") }, { value: "disbursed", label: "Disbursed", count: count("disbursed") }, { value: "at_risk", label: "At risk", count: count("at_risk") },
          ]} />
          <div className="flex items-center gap-2">
            <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Business name / application ID" className="pl-8 w-[280px]" /></div>
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-[140px]"><option value="newest">Newest</option><option value="amount">Amount</option><option value="risk">Risk</option><option value="score">Score</option></Select>
          </div>
        </div>
      )}
      <div className="surface overflow-hidden">
        {list.length === 0 ? <EmptyState icon={Inbox} title="No applications match" body={query ? "Try a different business name or application ID." : "Applications in this state will appear here."} /> : (
          <table className="data-table">
            <thead><tr><th>Application</th><th>Business</th><th className="num">Requested</th><th>Assessment</th><th>Risk</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>
              {list.map(({ app, business, assessment, plan }) => (
                <tr key={app.id} className="row-link" onClick={() => router.push(`/bank/applications/${app.id}`)}>
                  <td className="tnum font-medium text-ink whitespace-nowrap">{app.reference}</td>
                  <td><div className="text-ink">{business.name}</div><div className="text-[12.5px] text-ink-3">{business.industry} · {business.location}</div></td>
                  <td className="num tnum text-ink">{formatNaira(app.amount)}</td>
                  <td><div className="flex items-center gap-2.5"><span className="tnum text-ink w-7">{assessment.score}</span><RatingChip rating={assessment.band} /></div></td>
                  <td><RiskGradeChip score={assessment.score} /></td>
                  <td><ApplicationStatusChip status={app.status} health={plan?.health} /></td>
                  <td className="text-ink-2 whitespace-nowrap">{formatRelative(app.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
