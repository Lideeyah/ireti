import { clsx } from "clsx";
import type { ApplicationStatus, LoanHealth, Rating, RepaymentStatus, Severity, CaseStatus, ConnectionStatus } from "@/lib/domain/types";

type Family = "neutral" | "info" | "success" | "warning" | "danger";
type Style = "subtle" | "solid" | "outline" | "dashed";

const FAMILY_CLASSES: Record<Family, Record<Style, string>> = {
  neutral: {
    subtle: "bg-neutral-bg text-neutral-fg border-neutral-border",
    solid: "bg-[var(--neutral-700)] text-white border-transparent",
    outline: "bg-transparent text-neutral-fg border-neutral-border",
    dashed: "bg-transparent text-neutral-fg border-neutral-border border-dashed",
  },
  info: {
    subtle: "bg-info-bg text-info border-info-border",
    solid: "bg-info text-white border-transparent",
    outline: "bg-transparent text-info border-info-border",
    dashed: "bg-transparent text-info border-info-border border-dashed",
  },
  success: {
    subtle: "bg-success-bg text-success border-success-border",
    solid: "bg-success text-white border-transparent",
    outline: "bg-transparent text-success border-success-border",
    dashed: "bg-transparent text-success border-success-border border-dashed",
  },
  warning: {
    subtle: "bg-warning-bg text-warning border-warning-border",
    solid: "bg-warning text-white border-transparent",
    outline: "bg-transparent text-warning border-warning-border",
    dashed: "bg-transparent text-warning border-warning-border border-dashed",
  },
  danger: {
    subtle: "bg-danger-bg text-danger border-danger-border",
    solid: "bg-danger text-white border-transparent",
    outline: "bg-transparent text-danger border-danger-border",
    dashed: "bg-transparent text-danger border-danger-border border-dashed",
  },
};

export function Chip({ family = "neutral", style = "subtle", dot = false, children, className, title }: { family?: Family; style?: Style; dot?: boolean; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={clsx("inline-flex items-center gap-1.5 h-[22px] px-2 rounded-[5px] border text-[12px] font-medium whitespace-nowrap leading-none", FAMILY_CLASSES[family][style], className)}>
      {dot && <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Loan lifecycle status mapping — one token pair per state. */
export function ApplicationStatusChip({ status, health }: { status: ApplicationStatus; health?: LoanHealth }) {
  if (status === "disbursed" && health) {
    if (health === "at_risk") return <Chip family="warning" style="solid">At risk</Chip>;
    if (health === "watch") return <Chip family="warning">Watch</Chip>;
    if (health === "completed") return <Chip family="neutral">Settled</Chip>;
    return <Chip family="success">Repaying</Chip>;
  }
  switch (status) {
    case "submitted": return <Chip family="info">Submitted</Chip>;
    case "under_review": return <Chip family="info" dot>In review</Chip>;
    case "additional_information": return <Chip family="warning">Additional info</Chip>;
    case "approved": return <Chip family="success">Approved</Chip>;
    case "rejected": return <Chip family="danger" style="outline">Declined</Chip>;
    case "disbursement_pending": return <Chip family="success" dot>Preparing disbursement</Chip>;
    case "disbursed": return <Chip family="success" style="solid">Disbursed</Chip>;
    case "disbursement_failed": return <Chip family="danger">Disbursement failed</Chip>;
  }
}

export function RepaymentStatusChip({ status }: { status: RepaymentStatus }) {
  switch (status) {
    case "paid": return <Chip family="success">Paid</Chip>;
    case "scheduled": return <Chip family="neutral">Scheduled</Chip>;
    case "processing": return <Chip family="info" dot>Processing</Chip>;
    case "failed": return <Chip family="danger">Failed</Chip>;
    case "overdue": return <Chip family="warning" style="solid">Overdue</Chip>;
  }
}

export function HealthChip({ health }: { health: LoanHealth }) {
  switch (health) {
    case "healthy": return <Chip family="success">Healthy</Chip>;
    case "watch": return <Chip family="warning">Watch</Chip>;
    case "at_risk": return <Chip family="warning" style="solid">At risk</Chip>;
    case "completed": return <Chip family="neutral">Settled</Chip>;
  }
}

export function RatingChip({ rating }: { rating: Rating | "High" | "Medium" | "Low" }) {
  const family = rating === "Strong" || rating === "High" ? "success" : rating === "Moderate" || rating === "Medium" ? "warning" : "danger";
  return <Chip family={family}>{rating}</Chip>;
}

export function SeverityChip({ severity }: { severity: Severity }) {
  return <Chip family={severity === "High" ? "danger" : severity === "Medium" ? "warning" : "neutral"}>{severity}</Chip>;
}

export function CaseStatusChip({ status }: { status: CaseStatus }) {
  switch (status) {
    case "open": return <Chip family="info">Open</Chip>;
    case "assigned": return <Chip family="info" dot>Assigned</Chip>;
    case "escalated": return <Chip family="warning" style="solid">Escalated</Chip>;
    case "resolved": return <Chip family="neutral">Resolved</Chip>;
  }
}

export function ConnectionStatusChip({ status }: { status: ConnectionStatus }) {
  switch (status) {
    case "not_connected": return <Chip family="neutral">Not connected</Chip>;
    case "connecting": return <Chip family="info" dot>Connecting</Chip>;
    case "connected": return <Chip family="success">Connected</Chip>;
    case "failed": return <Chip family="danger">Connection failed</Chip>;
  }
}

/** Risk grade chip — violet intensity ramp, letter always shown. Score buckets to five grades. */
export function gradeForScore(score: number): "A" | "B" | "C" | "D" | "E" {
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "E";
}

export function RiskGradeChip({ score }: { score: number }) {
  const g = gradeForScore(score).toLowerCase();
  return (
    <span
      className="inline-flex items-center justify-center h-[22px] min-w-[26px] px-1.5 rounded-[5px] border text-[12px] font-semibold tnum"
      style={{ background: `var(--risk-${g}-bg)`, borderColor: `var(--risk-${g}-border)`, color: `var(--risk-${g}-fg)` }}
      title={`Risk grade ${g.toUpperCase()} (score ${score})`}
    >
      {g.toUpperCase()}
    </span>
  );
}
