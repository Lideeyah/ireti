"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LayoutDashboard, ListChecks, Gauge, FileText, CalendarClock, Landmark, Activity, Inbox, Radar, ScrollText, SlidersHorizontal, Settings2, type LucideIcon } from "lucide-react";

/** Icons are referenced by name so nav definitions can cross the server/client boundary. */
export const NAV_ICONS = { LayoutDashboard, ListChecks, Gauge, FileText, CalendarClock, Landmark, Activity, Inbox, Radar, ScrollText, SlidersHorizontal, Settings2 } satisfies Record<string, LucideIcon>;
export type NavIcon = keyof typeof NAV_ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  badge?: number;
  exact?: boolean;
}

function useActive() {
  const pathname = usePathname();
  return (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"));
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  return (
    <nav className="flex-1 overflow-y-auto px-3">
      <ul className="space-y-px">
        {items.map((item) => {
          const active = isActive(item);
          const Icon = NAV_ICONS[item.icon];
          return (
            <li key={item.href}>
              <Link href={item.href} className={clsx("flex items-center gap-3 h-9 px-2.5 rounded-[6px] text-[13.5px] transition-colors", active ? "bg-white/10 text-white font-medium" : "text-white/65 hover:bg-white/[0.06] hover:text-white")}>
                <Icon size={16} className={active ? "text-white" : "text-white/45"} strokeWidth={1.75} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge ? <span className={clsx("tnum text-[11px] font-semibold min-w-[20px] h-5 px-1.5 rounded-full inline-flex items-center justify-center", active ? "bg-white text-[var(--neutral-900)]" : "bg-white/15 text-white")}>{item.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function CompactNav({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  return (
    <nav className="lg:hidden border-b border-line bg-surface overflow-x-auto">
      <ul className="flex items-center gap-1 px-3 h-11 min-w-max">
        {items.map((item) => {
          const active = isActive(item);
          const Icon = NAV_ICONS[item.icon];
          return (
            <li key={item.href}>
              <Link href={item.href} className={clsx("flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[13px] whitespace-nowrap", active ? "bg-selected text-info font-medium" : "text-ink-2 hover:bg-hover")}>
                <Icon size={14} className={active ? "text-primary" : "text-ink-3"} />
                {item.label}
                {item.badge ? <span className="tnum text-[10.5px] font-semibold px-1 h-4 rounded-[3px] bg-info-bg text-info inline-flex items-center">{item.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
