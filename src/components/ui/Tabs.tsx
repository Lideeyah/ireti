"use client";
import { clsx } from "clsx";

export function SegmentedControl<T extends string>({ options, value, onChange, size = "md" }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className="inline-flex items-center border border-line rounded-[6px] bg-surface overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "px-2.5 font-medium border-r border-line-subtle last:border-r-0 transition-colors whitespace-nowrap",
            size === "sm" ? "h-6 text-[12px]" : "h-7 text-[12.5px]",
            o.value === value ? "bg-selected text-info" : "text-ink-2 hover:bg-hover",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={clsx("tnum ml-1.5", o.value === value ? "text-info/70" : "text-ink-4")}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
