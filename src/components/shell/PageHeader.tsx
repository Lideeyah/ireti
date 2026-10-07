export function PageHeader({ eyebrow, title, description, actions, meta }: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-5">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink leading-tight">{title}</h1>
        {description && <p className="text-[13.5px] text-ink-2 mt-1 max-w-[720px]">{description}</p>}
        {meta && <div className="mt-2 flex items-center gap-3 text-[12.5px] text-ink-3">{meta}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
