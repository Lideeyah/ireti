import Link from "next/link";
import type { Notification, Role } from "@/lib/domain/types";
import { Wordmark } from "@/components/ui/Wordmark";
import { DemoTag } from "@/components/ui/Banner";
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

export function AppShell({ area, suffix, nav, user, notifications, demoMode, children }: { area: "sme" | "bank"; suffix: string; nav: NavItem[]; user: ShellUser; notifications: Notification[]; demoMode: boolean; children: React.ReactNode }) {
  const home = area === "sme" ? "/sme" : "/bank";
  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-[240px] shrink-0 border-r border-line bg-surface flex-col sticky top-0 h-screen">
        <div className="h-16 flex items-center px-5 border-b border-line-subtle">
          <Link href={home} className="flex flex-col leading-tight">
            <Wordmark size="md" />
            <span className="text-[11.5px] text-ink-3 mt-1 pl-[26px]">{suffix}</span>
          </Link>
        </div>
        <SidebarNav items={nav} />
        <div className="border-t border-line-subtle px-5 py-4 text-[12px] text-ink-3 leading-relaxed">
          Signed in as <span className="text-ink-2">{user.name}</span>
          <br />
          {user.title ?? user.role}
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 border-b border-line bg-surface flex items-center justify-between px-5 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={home} className="lg:hidden"><Wordmark size="sm" /></Link>
            <span className="hidden sm:inline text-[13.5px] text-ink-2">{area === "sme" ? "Business portal" : "Operations console"}</span>
            {demoMode && <DemoTag />}
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter notifications={notifications} />
            <UserMenu user={user} />
          </div>
        </header>
        <CompactNav items={nav} />
        <main className="flex-1 px-5 lg:px-8 py-8 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
