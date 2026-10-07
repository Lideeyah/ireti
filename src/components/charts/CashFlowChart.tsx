"use client";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Bar, BarChart } from "recharts";
import type { MonthlyAggregate } from "@/lib/domain/types";
import { formatNaira, formatNairaCompact } from "@/lib/format";
import { SegmentedControl } from "@/components/ui/Tabs";

type Range = 12 | 6 | 3;

const axisStyle = { fontSize: 11, fill: "var(--text-muted)", fontFamily: "inherit" };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="surface px-3 py-2 shadow-[0_4px_16px_rgba(27,34,48,0.1)] text-[12.5px]">
      <div className="font-medium text-ink mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="tnum text-ink">{formatNaira(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function CashFlowChart({ monthly, height = 260, showControls = true, defaultRange = 12 }: { monthly: MonthlyAggregate[]; height?: number; showControls?: boolean; defaultRange?: Range }) {
  const [range, setRange] = useState<Range>(defaultRange);
  const data = useMemo(() => monthly.slice(-range), [monthly, range]);
  const recentStart = data[Math.max(0, data.length - 3)]?.label;
  const recentEnd = data[data.length - 1]?.label;
  return (
    <div>
      {showControls && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4 text-[12px] text-ink-3">
            <LegendItem color="var(--chart-1)" label="Inflow" />
            <LegendItem color="var(--chart-other)" label="Outflow" dashed />
            <LegendItem color="var(--chart-2)" label="Net" />
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-selected border border-info-border" />Most recent 3 months</span>
          </div>
          <SegmentedControl size="sm" value={String(range) as "12" | "6" | "3"} onChange={(v) => setRange(Number(v) as Range)} options={[{ value: "12", label: "12 months" }, { value: "6", label: "6 months" }, { value: "3", label: "3 months" }]} />
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
          {range > 3 && recentStart && <ReferenceArea x1={recentStart} x2={recentEnd} fill="var(--bg-surface-selected)" fillOpacity={0.7} strokeOpacity={0} />}
          <XAxis dataKey="label" tick={axisStyle} axisLine={{ stroke: "var(--border-default)" }} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => formatNairaCompact(v, 0)} width={52} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border-strong)" }} />
          <Line type="monotone" dataKey="inflow" name="Inflow" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0, fill: "var(--chart-1)" }} activeDot={{ r: 4 }} isAnimationActive animationDuration={500} />
          <Line type="monotone" dataKey="outflow" name="Outflow" stroke="var(--chart-other)" strokeWidth={1.75} strokeDasharray="4 3" dot={false} isAnimationActive animationDuration={500} />
          <Line type="monotone" dataKey="net" name="Net" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0, fill: "var(--chart-2)" }} isAnimationActive animationDuration={500} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InflowOutflowBars({ monthly, height = 200 }: { monthly: MonthlyAggregate[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
        <XAxis dataKey="label" tick={axisStyle} axisLine={{ stroke: "var(--border-default)" }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => formatNairaCompact(v, 0)} width={52} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-surface-hover)" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} iconType="square" iconSize={8} />
        <Bar dataKey="inflow" name="Inflow" fill="var(--chart-1)" radius={[2, 2, 0, 0]} isAnimationActive animationDuration={500} />
        <Bar dataKey="outflow" name="Outflow" fill="var(--chart-other)" radius={[2, 2, 0, 0]} isAnimationActive animationDuration={500} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-4 h-0 border-t-2" style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }} />
      {label}
    </span>
  );
}

/** Compact sparkline for dashboard contexts. */
export function NetFlowSparkline({ monthly, height = 48 }: { monthly: MonthlyAggregate[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={monthly} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
        <Line type="monotone" dataKey="net" stroke="var(--chart-2)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
