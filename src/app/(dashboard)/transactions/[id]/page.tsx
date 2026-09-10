import { notFound, redirect } from "next/navigation";
import { VoidTransactionButton } from "@/components/transactions/VoidTransactionButton";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { getTransaction } from "@/lib/transactions";

export default async function TransactionDetailPage({ params }: PageProps<"/transactions/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const transaction = await getTransaction(activeBusinessId, id);
  if (!transaction) notFound();

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const debitTotal = transaction.entries.filter((e) => e.entryType === "DEBIT").reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{transaction.description ?? "Journal Entry"}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {new Date(transaction.transactionDate).toLocaleDateString()} · {transaction.transactionType} ·{" "}
            <span className={transaction.status === "VOIDED" ? "text-neutral-400 line-through" : "text-brand-primary"}>{transaction.status}</span>
          </p>
          {transaction.reversalOfId && <p className="mt-1 text-xs text-neutral-400">Reversal of transaction {transaction.reversalOfId}</p>}
          {transaction.voidedReason && <p className="mt-1 text-xs text-neutral-400">Voided: {transaction.voidedReason}</p>}
        </div>
        {canManage && transaction.status === "POSTED" && !transaction.reversalOfId && (
          <VoidTransactionButton businessId={activeBusinessId} transactionId={transaction.id} />
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium text-right">Debit</th>
              <th className="px-4 py-3 font-medium text-right">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {transaction.entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-3 text-neutral-800">{entry.account?.name ?? entry.accountId}</td>
                <td className="px-4 py-3 text-neutral-500">{entry.account?.accountType}</td>
                <td className="px-4 py-3 text-right tabular-nums">{entry.entryType === "DEBIT" ? Number(entry.amount).toFixed(2) : ""}</td>
                <td className="px-4 py-3 text-right tabular-nums">{entry.entryType === "CREDIT" ? Number(entry.amount).toFixed(2) : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-100 font-medium">
              <td className="px-4 py-3" colSpan={2}>
                Total
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{debitTotal.toFixed(2)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{debitTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
