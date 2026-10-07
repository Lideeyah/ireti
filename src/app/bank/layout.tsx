import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { loadNotifications } from "@/server/queries";
import { prisma, isDemoMode } from "@/server/db";
import { AppShell, type NavItem } from "@/components/shell/AppShell";

export default async function BankLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/bank");
  if (user.organisationType !== "bank") redirect("/sme");
  const [notifications, awaiting, openCases] = await Promise.all([
    loadNotifications(user),
    prisma.loanApplication.count({ where: { status: "submitted" } }),
    prisma.case.count({ where: { status: { not: "resolved" } } }),
  ]);
  const nav: NavItem[] = [
    { href: "/bank", label: "Lending operations", icon: "LayoutDashboard", exact: true },
    { href: "/bank/applications", label: "Applications", icon: "Inbox", badge: awaiting || undefined },
    { href: "/bank/monitoring", label: "Monitoring", icon: "Radar", badge: openCases || undefined },
    { href: "/bank/audit", label: "Audit ledger", icon: "ScrollText" },
    { href: "/bank/policy", label: "Lending policy", icon: "SlidersHorizontal" },
  ];
  if (user.role === "ADMIN") nav.push({ href: "/bank/settings", label: "Administration", icon: "Settings2" });
  return (
    <AppShell area="bank" suffix="Lending Operations" user={user} notifications={notifications} demoMode={isDemoMode()} nav={nav}>
      {children}
    </AppShell>
  );
}
