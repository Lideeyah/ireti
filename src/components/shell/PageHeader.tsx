/**
 * Page header: one title line, optional metadata row, actions on the right.
 * No explanatory paragraphs: screens explain themselves through their data.
 */
export function PageHeader({ eyebrow, title, description, actions, meta }: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-8 mb-7">
      <div className="min-w-0">
        {eyebrow && <div className="text-[12px] font-medium text-ink-3 mb-1.5">{eyebrow}</div>}
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink leading-none">{title}</h1>
        {description && <p className="text-[13.5px] text-ink-3 mt-2 max-w-[640px]">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink-3">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
