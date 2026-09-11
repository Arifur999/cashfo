"use client";

import { Pencil, Plus, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Contact, Transaction } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { DateRangePreset } from "@/lib/dateRangePresets";
import { voidTransactionAction } from "@/lib/transactionActions";
import { NewLoanTransactionModal } from "./NewLoanTransactionModal";

interface LoanTransactionsPageClientProps {
  businessId: string;
  transactions: Transaction[];
  loanContacts: Contact[];
  canManage: boolean;
  currency: string;
  range: DateRangePreset;
  selectedContactId: string;
}

// Money accounts are always this subtype set (same list the backend's
// MONEY_ACCOUNT_SUBTYPES uses) -- needed here to find WHICH of a
// transaction's two entries is the money-account side, since both a money
// account and Accounts Receivable/Payable share accountType "ASSET"/
// "LIABILITY" and can't be told apart by type alone.
const MONEY_SUBTYPES = ["cash", "bank", "mfs"];

const RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-year", label: "This Year" },
];

function moneyEntry(transaction: Transaction) {
  return transaction.entries.find((e) => e.account?.accountSubtype && MONEY_SUBTYPES.includes(e.account.accountSubtype));
}

// DEBIT on the money account = cash increased = Received; CREDIT = cash
// decreased = Paid. Holds for all three transaction types this page shows
// (a loan given/taken, or a repayment either direction) since each is
// always exactly one entry against a money account and one against
// Accounts Receivable/Payable.
function directionFor(transaction: Transaction): "PAID" | "RECEIVED" | null {
  const entry = moneyEntry(transaction);
  if (!entry) return null;
  return entry.entryType === "DEBIT" ? "RECEIVED" : "PAID";
}

function amountFor(transaction: Transaction): number {
  return Number(moneyEntry(transaction)?.amount ?? transaction.entries[0]?.amount ?? 0);
}

export function LoanTransactionsPageClient({
  businessId,
  transactions,
  loanContacts,
  canManage,
  currency,
  range,
  selectedContactId,
}: LoanTransactionsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeTransactions = transactions.filter((t) => t.status === "POSTED" && !t.reversalOfId);
  const totalReceive = activeTransactions.filter((t) => directionFor(t) === "RECEIVED").reduce((sum, t) => sum + amountFor(t), 0);
  const totalPayment = activeTransactions.filter((t) => directionFor(t) === "PAID").reduce((sum, t) => sum + amountFor(t), 0);

  const selectedContactName = loanContacts.find((c) => c.id === selectedContactId)?.name ?? "All";
  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label ?? "All Time";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.push(`/loan-management/transactions?${params.toString()}`);
  }

  function handleVoid(transaction: Transaction) {
    const reason = window.prompt(`Void this transaction of ${formatCurrency(amountFor(transaction), currency)}? Enter a reason (min 5 characters):`);
    if (reason === null) return;
    if (reason.trim().length < 5) {
      toast.error("Reason must be at least 5 characters");
      return;
    }
    startTransition(async () => {
      const result = await voidTransactionAction(businessId, transaction.id, reason.trim());
      if (result.success) {
        toast.success("Transaction voided");
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to void transaction");
      }
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Loan Transactions</h1>
          <p className="mt-1 text-sm text-neutral-500">Receive and payment records</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> New Transaction
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Receive</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-primary">{formatCurrency(totalReceive, currency)}</p>
        </div>
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Payment</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-danger">{formatCurrency(totalPayment, currency)}</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Transaction List</h2>
            <p className="text-xs text-neutral-400">
              Date range: {rangeLabel} · Bank / Person: {selectedContactName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-400">Bank / Person</label>
              <select
                value={selectedContactId}
                onChange={(e) => updateParam("contactId", e.target.value)}
                className="rounded-xl border border-neutral-200 bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
              >
                <option value="">All Bank / Person</option>
                {loanContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-400">Period</label>
              <select
                value={range}
                onChange={(e) => updateParam("range", e.target.value)}
                className="rounded-xl border border-neutral-200 bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
              >
                {RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="mt-4 flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>
        </div>

        {transactions.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No loan transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Bank / Person</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium text-right">Receive</th>
                  <th className="px-4 py-3 font-medium text-right">Payment</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  {canManage && <th className="px-4 py-3 font-medium text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {transactions.map((t, index) => {
                  const direction = directionFor(t);
                  const account = moneyEntry(t)?.account;
                  const amount = amountFor(t);
                  const isVoided = t.status === "VOIDED";
                  return (
                    <tr key={t.id} className={isVoided ? "opacity-50" : ""}>
                      <td className="px-4 py-3 text-neutral-400">{index + 1}</td>
                      <td className="px-4 py-3 text-neutral-600">{new Date(t.transactionDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium text-neutral-800">{t.contact?.name ?? "-"}</td>
                      <td className={`px-4 py-3 font-medium ${direction === "RECEIVED" ? "text-brand-primary" : "text-brand-danger"}`}>
                        {direction === "RECEIVED" ? "Received" : direction === "PAID" ? "Paid" : "-"}
                        {isVoided && <span className="ml-1 text-xs font-normal text-neutral-400">(Voided)</span>}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">Principal</td>
                      <td className="px-4 py-3 text-neutral-600">{account?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {direction === "RECEIVED" ? (
                          <span className="font-semibold text-brand-primary">{formatCurrency(amount, currency)}</span>
                        ) : (
                          <span className="text-neutral-300">{formatCurrency(0, currency)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {direction === "PAID" ? (
                          <span className="font-semibold text-brand-danger">{formatCurrency(amount, currency)}</span>
                        ) : (
                          <span className="text-neutral-300">{formatCurrency(0, currency)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">{t.description ?? ""}</td>
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

      <NewLoanTransactionModal open={modalOpen} onClose={() => setModalOpen(false)} businessId={businessId} loanContacts={loanContacts} />
    </div>
  );
}
