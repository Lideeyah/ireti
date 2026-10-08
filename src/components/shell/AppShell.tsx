import Link from "next/link";
import type { Notification, Role } from "@/lib/domain/types";
import { Wordmark } from "@/components/ui/Wordmark";
import { NotificationCenter } from "./NotificationCenter";
import { UserMenu } from "./UserMenu";
import { SidebarNav, CompactNav, type NavItem } from "./Nav";

export type { NavItem };
export interface ShellUser {
  name: string;
  email: string;
  role: Role;
  title: string | null;
}

/**
 * Application shell: dark navigation rail, light content canvas.
 * The rail carries identity, navigation and the signed-in user; the content header
 * carries only the current section, notifications and the environment marker.
 */
export function AppShell({ area, suffix, nav, user, notifications, demoMode, children }: { area: "sme" | "bank"; suffix: string; nav: NavItem[]; user: ShellUser; notifications: Notification[]; demoMode: boolean; children: React.ReactNode }) {
  const home = area === "sme" ? "/sme" : "/bank";
  return (
    <div className="min-h-screen flex bg-canvas">
      <aside className="hidden lg:flex w-[248px] shrink-0 flex-col sticky top-0 h-screen bg-[var(--neutral-900)] text-white">
        <div className="h-16 flex items-center px-5">
          <Link href={home} className="flex items-center">
            <Wordmark size="md" tone="inverse" />
          </Link>
        </div>
        <div className="px-5 pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">{suffix}</span>
        </div>
        <SidebarNav items={nav} />
        <div className="mt-auto border-t border-white/10">
          <UserMenu user={user} demoMode={demoMode} />
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 shrink-0 bg-surface border-b border-line flex items-center justify-between px-5 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={home} className="lg:hidden"><Wordmark size="sm" /></Link>
            <span className="hidden lg:inline text-[13px] text-ink-3">{area === "sme" ? "Business portal" : "Operations console"}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter notifications={notifications} />
          </div>
        </header>
        <CompactNav items={nav} />
        <main className="flex-1 px-5 lg:px-8 py-7 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
