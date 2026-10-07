"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Search } from "lucide-react";
import { useStore } from "@/lib/store/store";
import type { LoanApplication } from "@/lib/domain/types";
import { ApplicationStatusChip, RiskGradeChip, RatingChip } from "@/components/ui/Chip";
import { SegmentedControl } from "@/components/ui/Tabs";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatNaira, formatRelative } from "@/lib/format";

type Filter = "all" | "new" | "under_review" | "additional_information" | "approved" | "rejected" | "disbursed" | "at_risk";
type Sort = "newest" | "amount" | "risk" | "score";

export function ApplicationQueue({ limit, compact = false }: { limit?: number; compact?: boolean }) {
  const db = useStore((s) => s.db);
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");

  const rows = useMemo(() => {
    const planFor = (a: LoanApplication) => (a.repaymentPlanId ? db.plans.find((p) => p.id === a.repaymentPlanId) : undefined);
    let list = db.applications.map((a) => ({
      app: a,
      business: db.businesses.find((b) => b.id === a.businessId),
      assessment: db.assessments.find((x) => x.id === a.assessmentId),
      plan: planFor(a),
    }));
    list = list.filter(({ app, plan }) => {
      switch (filter) {
        case "all": return true;
        case "new": return app.status === "submitted";
        case "under_review": return app.status === "under_review";
        case "additional_information": return app.status === "additional_information";
        case "approved": return app.status === "approved" || app.status === "disbursement_pending" || app.status === "disbursement_failed";
        case "rejected": return app.status === "rejected";
        case "disbursed": return app.status === "disbursed";
        case "at_risk": return plan?.health === "at_risk" || plan?.health === "watch";
      }
    });
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(({ app, business }) => app.reference.toLowerCase().includes(q) || business?.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      switch (sort) {
        case "newest": return b.app.submittedAt.localeCompare(a.app.submittedAt);
        case "amount": return b.app.amount - a.app.amount;
        case "risk": return (a.assessment?.score ?? 0) - (b.assessment?.score ?? 0);
        case "score": return (b.assessment?.score ?? 0) - (a.assessment?.score ?? 0);
      }
    });
    return limit ? list.slice(0, limit) : list;
  }, [db, filter, query, sort, limit]);

  const counts = useMemo(() => {
    const c = { all: db.applications.length, new: 0, under_review: 0, additional_information: 0, approved: 0, rejected: 0, disbursed: 0, at_risk: 0 };
    for (const a of db.applications) {
      if (a.status === "submitted") c.new++;
      else if (a.status === "under_review") c.under_review++;
      else if (a.status === "additional_information") c.additional_information++;
      else if (a.status === "approved" || a.status === "disbursement_pending" || a.status === "disbursement_failed") c.approved++;
      else if (a.status === "rejected") c.rejected++;
      else if (a.status === "disbursed") c.disbursed++;
      const plan = a.repaymentPlanId ? db.plans.find((p) => p.id === a.repaymentPlanId) : undefined;
      if (plan?.health === "at_risk" || plan?.health === "watch") c.at_risk++;
    }
    return c;
  }, [db]);

  return (
    <div>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "new", label: "New", count: counts.new },
              { value: "under_review", label: "Under review", count: counts.under_review },
              { value: "additional_information", label: "Additional information", count: counts.additional_information },
              { value: "approved", label: "Approved", count: counts.approved },
              { value: "rejected", label: "Rejected", count: counts.rejected },
              { value: "disbursed", label: "Disbursed", count: counts.disbursed },
              { value: "at_risk", label: "At risk", count: counts.at_risk },
            ]}
          />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Business name / application ID" className="pl-7 w-[260px] h-7 text-[12.5px]" />
            </div>
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-7 text-[12.5px] w-[130px]">
              <option value="newest">Newest</option>
              <option value="amount">Amount</option>
              <option value="risk">Risk</option>
              <option value="score">Score</option>
            </Select>
          </div>
        </div>
      )}
      <div className="surface overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Inbox} title="No applications match" body={query ? "Try a different business name or application ID." : "Applications in this state will appear here."} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Application</th>
                <th>Business</th>
                <th className="num">Requested</th>
                <th>Assessment</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ app, business, assessment, plan }) => (
                <tr key={app.id} className="row-link" onClick={() => router.push(`/bank/applications/${app.id}`)}>
                  <td className="tnum font-medium text-ink whitespace-nowrap">{app.reference}</td>
                  <td>
                    <div className="text-ink">{business?.name}</div>
                    <div className="text-[12px] text-ink-3">{business?.industry} · {business?.location}</div>
                  </td>
                  <td className="num tnum text-ink">{formatNaira(app.amount)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="tnum text-ink w-7">{assessment?.score ?? "—"}</span>
                      {assessment && <RatingChip rating={assessment.band} />}
                    </div>
                  </td>
                  <td>{assessment ? <RiskGradeChip score={assessment.score} /> : "—"}</td>
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
