import { clsx } from "clsx";
import type { Repayment } from "@/lib/domain/types";
import { formatDateShort, formatNairaCompact } from "@/lib/format";

const STATUS_COLOR: Record<Repayment["status"], string> = {
  paid: "bg-success",
  scheduled: "bg-[var(--border-strong)]",
  processing: "bg-info",
  failed: "bg-danger",
  overdue: "bg-warning",
};

export function RepaymentTimeline({ repayments }: { repayments: Repayment[] }) {
  const paidCount = repayments.filter((r) => r.status === "paid").length;
  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-neutral-bg overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-success rounded-full transition-all duration-500" style={{ width: `${(paidCount / Math.max(1, repayments.length)) * 100}%` }} />
      </div>
      <ol className="grid mt-3" style={{ gridTemplateColumns: `repeat(${repayments.length}, minmax(0, 1fr))` }}>
        {repayments.map((r) => (
          <li key={r.id} className="flex flex-col items-start pr-2 min-w-0">
            <span className={clsx("w-2.5 h-2.5 rounded-full", STATUS_COLOR[r.status], r.status === "processing" && "pulse-dot")} />
            <span className="text-[11.5px] text-ink-3 mt-1.5 tnum">{formatDateShort(r.dueDate)}</span>
            <span className="text-[12px] text-ink tnum">{formatNairaCompact(r.amount, 2)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
