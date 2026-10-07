import { clsx } from "clsx";
import { Check } from "lucide-react";

export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-0 border border-line rounded-[8px] bg-surface overflow-hidden">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className={clsx("flex items-center gap-2 px-3.5 h-10 flex-1 min-w-0 border-r border-line-subtle last:border-r-0", active && "bg-selected")}>
            <span className={clsx("tnum text-[11px] font-semibold w-5 h-5 rounded-[4px] inline-flex items-center justify-center shrink-0", done ? "bg-success text-white" : active ? "bg-primary text-white" : "bg-neutral-bg text-ink-3")}>
              {done ? <Check size={11} strokeWidth={3} /> : String(i + 1).padStart(2, "0")}
            </span>
            <span className={clsx("text-[13px] truncate", active ? "text-ink font-medium" : done ? "text-ink-2" : "text-ink-3")}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ProcessingList({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-3 h-7">
            <span className={clsx("w-4 h-4 rounded-full inline-flex items-center justify-center shrink-0 border", done ? "bg-success border-success text-white" : active ? "border-primary" : "border-line-strong")}>
              {done && <Check size={10} strokeWidth={3} />}
              {active && <span className="pulse-dot w-2 h-2 rounded-full bg-primary" />}
            </span>
            <span className={clsx("text-[13.5px]", done ? "text-ink-2" : active ? "text-ink font-medium" : "text-ink-4")}>{s}{active ? "…" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}
