import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { getTransactions } from "@/lib/transactions";

function entryTotal(transaction: { entries: { entryType: string; amount: string }[] }): string {
  const total = transaction.entries.filter((e) => e.entryType === "DEBIT").reduce((sum, e) => sum + Number(e.amount), 0);
  return total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Bare-bones testing page for the Transaction Engine (Prompt 5) -- proves
// the engine works. Prompt 6 replaces this with the real non-accountant-
// friendly Income/Expense/Transfer screens.
export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const { data: transactions } = await getTransactions(activeBusinessId);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Transactions</h1>
          <p className="mt-1 text-sm text-neutral-500">Raw journal entries -- the advanced/testing view for the Transaction Engine.</p>
        </div>
        <Link
          href="/transactions/new"
          className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          + New Journal Entry
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3">
                  <Link href={`/transactions/${t.id}`} className="text-brand-primary hover:underline">
                    {new Date(t.transactionDate).toLocaleDateString()}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-500">{t.transactionType}</td>
                <td className="px-4 py-3 text-neutral-700">{t.description ?? "-"}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-neutral-800">{entryTotal(t)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.status === "VOIDED" ? "bg-neutral-100 text-neutral-400 line-through" : "bg-brand-primary/10 text-brand-primary"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
