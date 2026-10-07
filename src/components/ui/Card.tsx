import { clsx } from "clsx";

export function Card({ children, className, padded = true }: { children: React.ReactNode; className?: string; padded?: boolean }) {
  return <section className={clsx("surface", padded && "p-4", className)}>{children}</section>;
}

export function CardHeader({ title, eyebrow, action, description, className }: { title?: React.ReactNode; eyebrow?: string; action?: React.ReactNode; description?: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-0.5">{eyebrow}</div>}
        {title && <h2 className="text-[15px] font-semibold text-ink leading-tight">{title}</h2>}
        {description && <p className="text-[13px] text-ink-2 mt-1">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={clsx("border-0 border-t border-line-subtle my-3", className)} />;
}

/** Label/value pair in a definition list. */
export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("min-w-0", className)}>
      <div className="text-[12px] text-ink-3 mb-0.5">{label}</div>
      <div className="text-[13.5px] text-ink">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, size = "md", className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; size?: "md" | "lg" | "xl"; className?: string }) {
  return (
    <div className={clsx("min-w-0", className)}>
      <div className="eyebrow">{label}</div>
      <div className={clsx("tnum text-ink font-semibold leading-tight mt-1", size === "xl" ? "text-[30px]" : size === "lg" ? "text-[22px]" : "text-[17px]")}>{value}</div>
      {sub && <div className="text-[12.5px] text-ink-2 mt-0.5">{sub}</div>}
    </div>
  );
}
