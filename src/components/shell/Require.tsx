"use client";
import { Lock } from "lucide-react";
import { useStore } from "@/lib/store/store";
import { can, rolesWith, ROLE_LABELS, type Permission } from "@/lib/auth/roles";
import { USERS } from "@/lib/seed/demoData";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Gate UI behind a permission. Shows who can perform the action and offers a persona switch in demo mode. */
export function Require({ permission, children, inline = false, label }: { permission: Permission; children: React.ReactNode; inline?: boolean; label?: string }) {
  const user = useStore((s) => s.currentBankUser());
  const setBankUser = useStore((s) => s.setBankUser);
  if (can(user.role, permission)) return <>{children}</>;
  const roles = rolesWith(permission);
  const candidates = USERS.filter((u) => roles.includes(u.role));
  if (inline) {
    return (
      <div className="flex items-center gap-2 text-[12.5px] text-ink-3">
        <Lock size={13} />
        <span>{label ?? "Requires"} {roles.map((r) => ROLE_LABELS[r]).join(" or ")}.</span>
        {candidates[0] && (
          <Button size="sm" variant="ghost" onClick={() => setBankUser(candidates[0].id)}>
            Switch to {candidates[0].name.split(" ")[0]}
          </Button>
        )}
      </div>
    );
  }
  return (
    <Card className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-[6px] bg-sunken border border-line flex items-center justify-center text-ink-3 shrink-0">
        <Lock size={15} />
      </div>
      <div className="flex-1">
        <div className="text-[14px] font-medium text-ink">Permission required</div>
        <p className="text-[13px] text-ink-2 mt-0.5">
          Your role ({ROLE_LABELS[user.role]}) cannot access this area. It is available to {roles.map((r) => ROLE_LABELS[r]).join(", ")}.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {candidates.map((u) => (
            <Button key={u.id} size="sm" onClick={() => setBankUser(u.id)}>
              Switch to {u.name} · {ROLE_LABELS[u.role]}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}
