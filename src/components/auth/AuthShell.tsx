import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";

/** Two-column authentication layout: product statement on the left, form on the right. */
export function AuthShell({ children, title, subtitle, footer }: { children: React.ReactNode; title: string; subtitle: string; footer?: React.ReactNode }) {
  return (
    <main className="min-h-screen grid lg:grid-cols-[1fr_1fr]">
      <section className="hidden lg:flex flex-col justify-between bg-[var(--neutral-900)] text-white px-14 py-12">
        <Link href="/"><Wordmark size="md" tone="inverse" suffix="SME lending infrastructure" /></Link>
        <div className="max-w-[460px]">
          <h2 className="text-[34px] leading-[1.15] font-semibold tracking-[-0.015em]">Consolidated financials. Structured assessment. Auditable decisions.</h2>
        </div>
        <dl className="grid grid-cols-3 gap-8 text-[13px]">
          <div><dt className="text-white/50 uppercase tracking-[0.08em] text-[11px] font-semibold">Financial data</dt><dd className="mt-1.5 text-white/85">Open Banking connections</dd></div>
          <div><dt className="text-white/50 uppercase tracking-[0.08em] text-[11px] font-semibold">Decision support</dt><dd className="mt-1.5 text-white/85">Assessment, policy, human decision</dd></div>
          <div><dt className="text-white/50 uppercase tracking-[0.08em] text-[11px] font-semibold">Auditability</dt><dd className="mt-1.5 text-white/85">Permissioned ledger</dd></div>
        </dl>
      </section>
      <section className="flex flex-col px-6 py-8 sm:px-12 lg:px-20 lg:py-12">
        <div className="lg:hidden mb-10"><Link href="/"><Wordmark size="md" /></Link></div>
        <div className="my-auto w-full max-w-[400px] mx-auto">
          <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-ink">{title}</h1>
          <p className="text-[14px] text-ink-2 mt-2">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
        {footer && <div className="mt-10 text-[13px] text-ink-3 max-w-[400px] mx-auto w-full">{footer}</div>}
      </section>
    </main>
  );
}
