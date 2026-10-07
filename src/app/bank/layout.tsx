"use client";
import { LayoutDashboard, Inbox, Radar, ScrollText, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useStore } from "@/lib/store/store";

export default function BankLayout({ children }: { children: React.ReactNode }) {
  const applications = useStore((s) => s.db.applications);
  const cases = useStore((s) => s.db.cases);
  const awaiting = applications.filter((a) => a.status === "submitted").length;
  const openCases = cases.filter((c) => c.status !== "resolved").length;
  return (
    <AppShell
      area="bank"
      suffix="Lending Operations"
      nav={[
        { href: "/bank", label: "Lending operations", icon: LayoutDashboard, exact: true },
        { href: "/bank/applications", label: "Applications", icon: Inbox, badge: awaiting || undefined },
        { href: "/bank/monitoring", label: "Monitoring", icon: Radar, badge: openCases || undefined },
        { href: "/bank/audit", label: "Audit ledger", icon: ScrollText },
        { href: "/bank/policy", label: "Lending policy", icon: SlidersHorizontal },
      ]}
    >
      {children}
    </AppShell>
  );
}
