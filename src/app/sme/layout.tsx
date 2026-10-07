import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { loadNotifications } from "@/server/queries";
import { isDemoMode } from "@/server/db";
import { AppShell } from "@/components/shell/AppShell";

export default async function SmeLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/sme");
  if (user.organisationType !== "sme") redirect("/bank");
  const notifications = await loadNotifications(user);
  return (
    <AppShell
      area="sme"
      suffix="Business portal"
      user={user}
      notifications={notifications}
      demoMode={isDemoMode()}
      nav={[
        { href: "/sme", label: "Overview", icon: "LayoutDashboard", exact: true },
        { href: "/sme/onboarding", label: "Onboarding", icon: "ListChecks" },
        { href: "/sme/credit-profile", label: "Credit profile", icon: "Gauge" },
        { href: "/sme/application", label: "Application", icon: "FileText" },
        { href: "/sme/repayments", label: "Repayments", icon: "CalendarClock" },
        { href: "/sme/accounts", label: "Connected accounts", icon: "Landmark" },
        { href: "/sme/activity", label: "Data access", icon: "Activity" },
      ]}
    >
      {children}
    </AppShell>
  );
}
