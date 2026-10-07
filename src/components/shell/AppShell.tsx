"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, Wrench } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { DemoTag } from "@/components/ui/Banner";
import { NotificationCenter } from "./NotificationCenter";
import { PersonaSwitcher } from "./PersonaSwitcher";
import { HydrationGate } from "./HydrationGate";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  exact?: boolean;
}

export function AppShell({ area, suffix, nav, children }: { area: "sme" | "bank"; suffix: string; nav: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-[236px] shrink-0 border-r border-line bg-surface flex-col sticky top-0 h-screen">
        <div className="h-14 flex items-center px-4 border-b border-line-subtle">
          <Link href={area === "sme" ? "/sme" : "/bank"} className="flex flex-col leading-tight">
            <Wordmark size="md" />
            <span className="text-[11px] text-ink-3 mt-0.5 pl-[22px]">{suffix}</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-0.5">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-2.5 h-8 px-2.5 rounded-[6px] text-[13.5px] transition-colors border-l-2",
                      active ? "bg-selected text-info font-medium border-primary" : "text-ink-2 hover:bg-hover hover:text-ink border-transparent",
                    )}
                  >
                    <item.icon size={15} className={active ? "text-primary" : "text-ink-3"} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? <span className="tnum text-[11px] font-semibold px-1.5 h-[18px] rounded-[4px] bg-info-bg text-info inline-flex items-center">{item.badge}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-line-subtle p-2 space-y-0.5">
          <Link href={area === "sme" ? "/bank" : "/sme"} className="flex items-center gap-2.5 h-8 px-2.5 rounded-[6px] text-[13px] text-ink-2 hover:bg-hover hover:text-ink">
            <ArrowLeftRight size={14} className="text-ink-3" />
            Switch to {area === "sme" ? "Bank" : "SME"}
          </Link>
          <Link href="/dev" className="flex items-center gap-2.5 h-8 px-2.5 rounded-[6px] text-[13px] text-ink-3 hover:bg-hover hover:text-ink">
            <Wrench size={14} className="text-ink-4" />
            Demo controls
          </Link>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 shrink-0 border-b border-line bg-surface flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={area === "sme" ? "/sme" : "/bank"} className="lg:hidden"><Wordmark size="sm" /></Link>
            <span className="hidden sm:inline text-[13px] text-ink-2">{area === "sme" ? "Business portal" : "Operations console"}</span>
            <DemoTag />
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter audience={area} />
            <PersonaSwitcher area={area} />
          </div>
        </header>
        {/* Compact navigation for tablet and phone widths; the sidebar is desktop-only. */}
        <nav className="lg:hidden border-b border-line bg-surface overflow-x-auto">
          <ul className="flex items-center gap-1 px-2 h-10 min-w-max">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link href={item.href} className={clsx("flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] text-[12.5px] whitespace-nowrap", active ? "bg-selected text-info font-medium" : "text-ink-2 hover:bg-hover")}>
                    <item.icon size={13} className={active ? "text-primary" : "text-ink-3"} />
                    {item.label}
                    {item.badge ? <span className="tnum text-[10.5px] font-semibold px-1 h-4 rounded-[3px] bg-info-bg text-info inline-flex items-center">{item.badge}</span> : null}
                  </Link>
                </li>
              );
            })}
            <li><Link href={area === "sme" ? "/bank" : "/sme"} className="flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] text-[12.5px] text-ink-3 whitespace-nowrap"><ArrowLeftRight size={13} /> {area === "sme" ? "Bank" : "SME"}</Link></li>
          </ul>
        </nav>
        <main className="flex-1 px-4 lg:px-6 py-5 max-w-[1440px] w-full mx-auto">
          <HydrationGate>{children}</HydrationGate>
        </main>
      </div>
    </div>
  );
}
