import { clsx } from "clsx";
import { AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";

export function Banner({ tone = "info", title, children, action, className }: { tone?: "info" | "success" | "warning" | "danger"; title?: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? AlertTriangle : tone === "danger" ? XCircle : Info;
  return (
    <div className={clsx("flex items-start gap-3 rounded-[8px] border px-3.5 py-3", tone === "info" && "bg-info-bg border-info-border text-info", tone === "success" && "bg-success-bg border-success-border text-success", tone === "warning" && "bg-warning-bg border-warning-border text-warning", tone === "danger" && "bg-danger-bg border-danger-border text-danger", className)}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        {title && <div className="text-[13.5px] font-semibold">{title}</div>}
        {children && <div className={clsx("text-[13px]", title && "mt-0.5")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function DemoTag({ children = "Demo environment" }: { children?: React.ReactNode }) {
  return <span className="inline-flex items-center h-5 px-1.5 rounded-[4px] bg-warning-bg border border-warning-border text-warning text-[10.5px] font-semibold tracking-[0.06em] uppercase">{children}</span>;
}
