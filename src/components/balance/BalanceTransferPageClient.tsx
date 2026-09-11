"use client";

import { ArrowRight, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TransferModal } from "@/components/quick-entry/TransferModal";
import type { Transaction } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { DateRangePreset } from "@/lib/dateRangePresets";
import { voidTransactionAction } from "@/lib/transactionActions";

interface BalanceTransferPageClientProps {
  businessId: string;
  transfers: Transaction[];
  currency: string;
  canManage: boolean;
  range: DateRangePreset;
}

function amountFor(transaction: Transaction): number {
  return Number(transaction.entries[0]?.amount ?? 0);
}

// Transfers are always exactly 2 entries: the DEBIT side is where the
// money landed ("To"), the CREDIT side is where it came from ("From") --
// same convention as TransferModal's own construction (createTransferAction).
function partiesFor(transaction: Transaction): { from: string; to: string } {
  const from = transaction.entries.find((e) => e.entryType === "CREDIT")?.account?.name ?? "--";
  const to = transaction.entries.find((e) => e.entryType === "DEBIT")?.account?.name ?? "--";
  return { from, to };
}

const RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-year", label: "This Year" },
];

export function BalanceTransferPageClient({ businessId, transfers, currency, canManage, range }: BalanceTransferPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // The summary cards count real, standing transfers only -- a voided
  // transfer's reversal is a cancellation artifact, not a second transfer
  // the user made, so counting both would overstate the total. The table
  // below still lists every row (voided included, struck through) for a
  // full audit trail, same convention as the /transactions page.
  const activeTransfers = transfers.filter((t) => t.status === "POSTED" && !t.reversalOfId);
  const totalTransfer = activeTransfers.reduce((sum, t) => sum + amountFor(t), 0);

  function updateRange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("range");
    else params.set("range", next);
    router.push(`/balance/transfer?${params.toString()}`);
  }

  function handleVoid(transaction: Transaction) {
    const reason = window.prompt(`Void this transfer of ${formatCurrency(amountFor(transaction), currency)}? Enter a reason (min 5 characters):`);
    if (reason === null) return;
    if (reason.trim().length < 5) {
      toast.error("Reason must be at least 5 characters");
      return;
    }
    startTransition(async () => {
      const result = await voidTransactionAction(businessId, transaction.id, reason.trim());
      if (result.success) {
        toast.success("Transfer voided");
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to void transfer");
      }
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Balance Transfer</h1>
          <p className="mt-1 text-sm text-neutral-500">Account Balance Transfer</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> New Transfer
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Total Transfer</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{formatCurrency(totalTransfer, currency)}</p>
        </div>
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Total Transactions</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{activeTransfers.length}</p>
        </div>
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Note</p>
          <p className="mt-1 text-sm text-neutral-600">Total balance remains unchanged on transfer. Only moves between accounts.</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-900">Transfer List</h2>
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => updateRange(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>
        </div>

        {transfers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No transfers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium"></th>
                  <th className="px-4 py-3 font-medium">To</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  {canManage && <th className="px-4 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {transfers.map((t, index) => {
                  const { from, to } = partiesFor(t);
                  const isVoided = t.status === "VOIDED";
                  return (
                    <tr key={t.id} className={isVoided ? "opacity-50" : ""}>
                      <td className="px-4 py-3 text-neutral-400">{index + 1}</td>
                      <td className="px-4 py-3 text-neutral-600">{new Date(t.transactionDate).toLocaleDateString()}</td>
                      <td className={`px-4 py-3 font-medium ${isVoided ? "text-neutral-400 line-through" : "text-brand-danger"}`}>{from}</td>
                      <td className="px-4 py-3 text-neutral-300">
                        <ArrowRight className="h-4 w-4" />
                      </td>
                      <td className={`px-4 py-3 font-medium ${isVoided ? "text-neutral-400 line-through" : "text-brand-primary"}`}>{to}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-neutral-900">{formatCurrency(amountFor(t), currency)}</td>
                      <td className="px-4 py-3 text-neutral-400">
                        {t.description ?? ""}
                        {isVoided && <span className="text-brand-danger"> · Voided</span>}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/transactions/${t.id}`}
                              title="View"
                              className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                            {!isVoided && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleVoid(t)}
                                title="Void"
                                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TransferModal open={modalOpen} onClose={() => setModalOpen(false)} businessId={businessId} />
    </div>
  );
}
