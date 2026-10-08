import { Activity } from "lucide-react";
import { requireSmeUser } from "@/server/auth";
import { loadSmeBundle } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Chip } from "@/components/ui/Chip";
import { formatDate, formatTime } from "@/lib/format";
import { EVENT_LABELS } from "@/lib/domain/labels";
import { ROLE_LABELS } from "@/lib/auth/roles";

export default async function ActivityPage() {
  const user = await requireSmeUser();
  const { activity } = await loadSmeBundle(user);
  const accessEvents = activity.filter((e) => e.type === "DATA_ACCESS").length;
  return (
    <>
      <PageHeader title="Data access" meta={<><span className="tnum">{activity.length} events</span><span>·</span><span className="tnum">{accessEvents} data-access events</span></>} />
      <Card padded={false}>
        {activity.length === 0 ? <EmptyState icon={Activity} title="No activity yet" body="Activity appears once your business is onboarded and accounts are connected." /> : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Time</th><th>Event</th><th>Actor</th><th>Resource</th><th>Application</th><th>Ledger</th></tr></thead>
            <tbody>
              {activity.map((e) => (
                <tr key={e.id}>
                  <td className="tnum text-ink-2">{formatDate(e.timestamp)}</td>
                  <td className="tnum text-ink-2">{formatTime(e.timestamp, true)}</td>
                  <td>{e.type === "DATA_ACCESS" ? <Chip family="info">{EVENT_LABELS[e.type]}</Chip> : <span className="text-ink">{EVENT_LABELS[e.type]}</span>}</td>
                  <td><div className="text-ink">{e.actorRole === "SYSTEM" ? "Ìrètí platform" : e.actorRole === "SME_USER" ? "You" : e.actorName}</div><div className="text-[12.5px] text-ink-3">{e.actorRole === "SYSTEM" ? "System" : ROLE_LABELS[e.actorRole]}</div></td>
                  <td className="text-ink-2">{e.resource ?? "—"}</td>
                  <td className="tnum text-ink-2">{e.applicationRef ?? "—"}</td>
                  <td className="tnum text-[12px] text-ink-3 font-mono">#{e.seq} · {e.hash.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
