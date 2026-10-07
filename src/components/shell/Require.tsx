import { Lock } from "lucide-react";
import type { Role } from "@/lib/domain/types";
import { can, rolesWith, ROLE_LABELS, type Permission } from "@/lib/auth/roles";
import { Card } from "@/components/ui/Card";

/** Gates UI behind a permission for the signed-in role. Server-side checks remain authoritative. */
export function Require({ role, permission, children, inline = false, label }: { role: Role; permission: Permission; children: React.ReactNode; inline?: boolean; label?: string }) {
  if (can(role, permission)) return <>{children}</>;
  const roles = rolesWith(permission).map((r) => ROLE_LABELS[r]).join(", ");
  if (inline) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-ink-3">
        <Lock size={13} />
        <span>{label ?? "Requires"} {roles}.</span>
      </div>
    );
  }
  return (
    <Card className="flex items-start gap-4">
      <div className="w-9 h-9 rounded-[6px] bg-sunken border border-line flex items-center justify-center text-ink-3 shrink-0"><Lock size={16} /></div>
      <div>
        <div className="text-[15px] font-medium text-ink">Permission required</div>
        <p className="text-[13.5px] text-ink-2 mt-1">Your role ({ROLE_LABELS[role]}) cannot access this area. It is available to {roles}. Ask your administrator if you need access.</p>
      </div>
    </Card>
  );
}
