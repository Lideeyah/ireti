"use client";
import { LayoutDashboard, ListChecks, Gauge, FileText, CalendarClock, Landmark, Activity } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";

export default function SmeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      area="sme"
      suffix="Business portal"
      nav={[
        { href: "/sme", label: "Overview", icon: LayoutDashboard, exact: true },
        { href: "/sme/onboarding", label: "Onboarding", icon: ListChecks },
        { href: "/sme/credit-profile", label: "Credit profile", icon: Gauge },
        { href: "/sme/application", label: "Application", icon: FileText },
        { href: "/sme/repayments", label: "Repayments", icon: CalendarClock },
        { href: "/sme/accounts", label: "Connected accounts", icon: Landmark },
        { href: "/sme/activity", label: "Data access", icon: Activity },
      ]}
    >
      {children}
    </AppShell>
  );
}
