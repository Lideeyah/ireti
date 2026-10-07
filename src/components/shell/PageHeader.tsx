export function PageHeader({ eyebrow, title, description, actions, meta }: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-8 mb-8">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-ink leading-tight">{title}</h1>
        {description && <p className="text-[14px] text-ink-2 mt-2 max-w-[760px] leading-relaxed">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink-3">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
