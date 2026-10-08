/**
 * Landing-page visual: a consolidated cash-flow chart that draws itself, with the
 * assessment result settling in beneath it. Pure SVG and CSS so it costs nothing at
 * runtime and stills completely under prefers-reduced-motion.
 */
const INFLOW = [52, 48, 58, 54, 44, 50, 46, 72, 51, 55, 62, 58];
const OUTFLOW = [30, 26, 24, 31, 25, 25, 32, 24, 29, 31, 24, 25];

function path(series: number[], height: number, width: number) {
  const step = width / (series.length - 1);
  const max = 80;
  return series
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(height - (v / max) * height).toFixed(1)}`)
    .join(" ");
}

export function HeroVisual() {
  const w = 440;
  const h = 150;
  return (
    <div className="relative">
      <div className="surface p-6 overflow-hidden relative rise" style={{ "--d": "180ms" } as React.CSSProperties}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[var(--bg-surface-selected)] to-transparent" />
        </div>
        <div className="relative">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="eyebrow">Consolidated cash flow</div>
              <div className="text-[13px] text-ink-3 mt-1">3 institutions · 12 months</div>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[12px] text-ink-3">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0 border-t-2 border-[var(--chart-1)]" />Inflow</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0 border-t-2 border-dashed border-[var(--chart-other)]" />Outflow</span>
            </div>
          </div>

          <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} aria-hidden>
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="var(--border-subtle)" strokeWidth="1" />
            ))}
            <rect x={w * 0.75} y="0" width={w * 0.25} height={h} fill="var(--bg-surface-selected)" opacity="0.7" />
            <path d={path(OUTFLOW, h, w)} fill="none" stroke="var(--chart-other)" strokeWidth="2" strokeDasharray="4 3" className="draw" style={{ "--len": 1400, "--d": "700ms" } as React.CSSProperties} />
            <path d={path(INFLOW, h, w)} fill="none" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinecap="round" className="draw" style={{ "--len": 1400, "--d": "420ms" } as React.CSSProperties} />
          </svg>

          <div className="grid grid-cols-3 gap-5 mt-6 pt-5 border-t border-line-subtle">
            {[
              ["Avg inflow", "₦6.8m", "320ms"],
              ["Net monthly", "₦2.8m", "420ms"],
              ["Inflow window", "22nd–24th", "520ms"],
            ].map(([label, value, d]) => (
              <div key={label} className="rise" style={{ "--d": d } as React.CSSProperties}>
                <div className="eyebrow">{label}</div>
                <div className="tnum text-[17px] font-semibold text-ink mt-1.5">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="surface p-5 mt-4 flex items-center gap-5 rise float-soft" style={{ "--d": "900ms" } as React.CSSProperties}>
        <div className="flex items-baseline gap-2">
          <span className="tnum text-[34px] font-semibold text-ink leading-none">82</span>
          <span className="text-[14px] text-ink-3">/ 100</span>
        </div>
        <div className="h-9 w-px bg-line-subtle" />
        <div className="min-w-0">
          <div className="eyebrow">Eligible</div>
          <div className="tnum text-[18px] font-semibold text-ink mt-1">₦18,500,000</div>
        </div>
        <span className="ml-auto inline-flex items-center h-[26px] px-2.5 rounded-[6px] bg-success-bg border border-success-border text-success text-[12.5px] font-medium whitespace-nowrap">
          Within policy
        </span>
      </div>
    </div>
  );
}
