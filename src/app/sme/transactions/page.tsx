import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { requireSmeUser } from "@/server/auth";
import { loadTransactions } from "@/server/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, Stat, StatRow } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionFilters } from "@/components/sme/TransactionFilters";
import { formatNaira, formatDate } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/domain/labels";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ account?: string; direction?: string; q?: string }> }) {
  const user = await requireSmeUser();
  const sp = await searchParams;
  const direction = sp.direction === "in" || sp.direction === "out" ? sp.direction : undefined;
  const { transactions, accounts, total, inflow, outflow } = await loadTransactions(user, { accountId: sp.account, direction, query: sp.q });

  return (
    <>
      <PageHeader title="Transactions" meta={<span>Consolidated across {accounts.length} {accounts.length === 1 ? "account" : "accounts"}</span>} />
      <Card className="mb-6">
        <StatRow columns={4}>
          <Stat label="Transactions" size="lg" value={total.toLocaleString("en-NG")} sub={sp.account || direction || sp.q ? "Matching filters" : "All time"} />
          <Stat label="Inflow" size="lg" value={formatNaira(inflow)} />
          <Stat label="Outflow" size="lg" value={formatNaira(outflow)} />
          <Stat label="Net" size="lg" value={formatNaira(inflow - outflow)} />
        </StatRow>
      </Card>
      <TransactionFilters accounts={accounts.map((a) => ({ id: a.id, label: `${a.institutionName} ${a.accountNumberMasked}` }))} />
      <Card padded={false} className="mt-4">
        {transactions.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions match" body="Adjust the filters, or connect another account to widen the view." />
        ) : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Counterparty</th><th>Narration</th><th>Category</th><th>Account</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="tnum text-ink-2 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="text-ink whitespace-nowrap">{t.counterparty}</td>
                  <td className="text-ink-2">{t.narration}</td>
                  <td className="text-ink-3 whitespace-nowrap">{CATEGORY_LABELS[t.category] ?? t.category}</td>
                  <td className="text-ink-3 whitespace-nowrap">{t.institutionName} <span className="tnum">{t.accountMasked}</span></td>
                  <td className="num tnum">
                    <span className={`inline-flex items-center gap-1.5 ${t.amount > 0 ? "text-[var(--delta-positive)]" : "text-ink"}`}>
                      {t.amount > 0 ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} className="text-ink-3" />}
                      {formatNaira(Math.abs(t.amount))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
