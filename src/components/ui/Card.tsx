import { clsx } from "clsx";

export function Card({ children, className, padded = true }: { children: React.ReactNode; className?: string; padded?: boolean }) {
  return <section className={clsx("surface", padded && "p-6", className)}>{children}</section>;
}

export function CardHeader({ title, eyebrow, action, description, className }: { title?: React.ReactNode; eyebrow?: string; action?: React.ReactNode; description?: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 mb-5", className)}>
      <div className="min-w-0">
        {eyebrow && !title && <div className="eyebrow">{eyebrow}</div>}
        {title && <h2 className="text-[15px] font-semibold text-ink leading-snug">{title}</h2>}
        {description && <p className="text-[13px] text-ink-3 mt-1 max-w-[640px]">{description}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}

/** Header strip for list cards (table or list below, no padding on the card). */
export function ListHeader({ title, eyebrow, description, action }: { title?: React.ReactNode; eyebrow?: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 h-14 border-b border-line-subtle">
      <div className="min-w-0 flex items-baseline gap-3">
        {title ? <h2 className="text-[15px] font-semibold text-ink">{title}</h2> : eyebrow ? <h2 className="text-[15px] font-semibold text-ink">{eyebrow}</h2> : null}
        {description && <span className="text-[13px] text-ink-3 truncate">{description}</span>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={clsx("border-0 border-t border-line-subtle my-5", className)} />;
}

/** Label/value pair in a definition list. */
export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("min-w-0", className)}>
      <div className="text-[12.5px] text-ink-3 mb-1 whitespace-nowrap truncate">{label}</div>
      <div className="text-[14px] text-ink leading-snug">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, size = "md", className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; size?: "md" | "lg" | "xl"; className?: string }) {
  return (
    <div className={clsx("min-w-0", className)}>
      <div className="eyebrow whitespace-nowrap truncate">{label}</div>
      <div className={clsx("tnum text-ink font-semibold leading-none mt-2 whitespace-nowrap", size === "xl" ? "text-[32px]" : size === "lg" ? "text-[24px]" : "text-[18px]")}>{value}</div>
      {sub && <div className="text-[13px] text-ink-2 mt-2 flex items-center gap-2 min-h-[22px]">{sub}</div>}
    </div>
  );
}

/** Evenly divided row of stats inside a card. */
export function StatRow({ children, columns = 4 }: { children: React.ReactNode; columns?: 2 | 3 | 4 | 5 }) {
  if (columns === 2) {
    return <div className="grid grid-cols-2 gap-x-6 gap-y-8 items-start [&>*]:min-w-0 [&>*:nth-child(even)]:border-l [&>*:nth-child(even)]:border-line-subtle [&>*:nth-child(even)]:pl-6">{children}</div>;
  }
  const cols = columns === 5 ? "xl:grid-cols-5" : columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return <div className={clsx("grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-6 items-start", cols, "[&>*]:lg:border-l [&>*]:lg:border-line-subtle [&>*:first-child]:lg:border-l-0 [&>*]:lg:pl-6 [&>*:first-child]:lg:pl-0 [&>*]:min-w-0")}>{children}</div>;
}
