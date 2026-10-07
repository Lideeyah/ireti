"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AssessmentFactor } from "@/lib/domain/types";
import { RatingChip } from "@/components/ui/Chip";

/** Expandable assessment factor with its evidence. Shared by the SME credit profile and bank review. */
export function FactorRow({ factor }: { factor: AssessmentFactor }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-hover text-left" aria-expanded={open}>
        <span className="flex-1 text-[14px] text-ink">{factor.label}</span>
        <span className="tnum text-[13px] text-ink-3 w-20 text-right">{factor.score} <span className="text-ink-4">· {Math.round(factor.weight * 100)}%</span></span>
        <RatingChip rating={factor.rating} />
        <ChevronDown size={15} className={`text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-6 pb-4 -mt-1 fade-up">
          <div className="rounded-[6px] bg-sunken border border-line-subtle px-4 py-3">
            <div className="eyebrow mb-1.5">Evidence</div>
            <p className="text-[13.5px] text-ink-2 leading-relaxed">{factor.evidence}</p>
          </div>
        </div>
      )}
    </li>
  );
}
