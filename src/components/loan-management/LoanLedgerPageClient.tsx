"use client";

import { Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Contact, LoanStatement } from "@/lib/api";
import { balanceDirection, BALANCE_DIRECTION_COLOR } from "@/lib/contactDisplay";
import { formatCurrency } from "@/lib/currency";
import type { DateRangePreset } from "@/lib/dateRangePresets";

interface LoanLedgerPageClientProps {
  loanContacts: Contact[];
  currency: string;
  range: DateRangePreset;
  selectedContactId: string;
  statement: LoanStatement | null;
}

const RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-year", label: "This Year" },
];

// Unlike every other filtered list page in this app (Balance Transfer, Loan
// Transactions), selecting a Bank/Person or Period here does NOT refetch
// immediately -- the reference layout is explicit that nothing is generated
// until "Generate" is pressed, since a running balance only means something
// for ONE account at a time (no sensible "all accounts" statement). So the
// dropdowns are local (pending) state, only pushed to the URL -- and hence
// only fetched server-side -- on Generate.
export function LoanLedgerPageClient({ loanContacts, currency, range, selectedContactId, statement }: LoanLedgerPageClientProps) {
  const router = useRouter();
  const [pendingContactId, setPendingContactId] = useState(selectedContactId);
  const [pendingRange, setPendingRange] = useState<DateRangePreset>(range);

  function handleGenerate() {
    const params = new URLSearchParams();
    if (pendingContactId) params.set("contactId", pendingContactId);
    if (pendingRange !== "all") params.set("range", pendingRange);
    router.push(`/loan-management/ledger?${params.toString()}`);
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Ledger</h1>
          <p className="mt-1 text-sm text-neutral-500">One account, one date range, with the balance carried forward</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!statement}
          className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Printer className="h-4 w-4" /> Print / PDF
        </button>
      </div>

      <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-400">Bank / Person</label>
            <select
              value={pendingContactId}
              onChange={(e) => setPendingContactId(e.target.value)}
              className="w-56 rounded-xl border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-primary"
            >
              <option value="">Select an account...</option>
              {loanContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` (${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-neutral-400">Period</label>
            <select
              value={pendingRange}
              onChange={(e) => setPendingRange(e.target.value as DateRangePreset)}
              className="rounded-xl border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-primary"
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
            onClick={handleGenerate}
            disabled={!pendingContactId}
            className="rounded-xl bg-brand-primary px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Generate
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {!statement ? (
          <p className="px-4 py-16 text-center text-sm text-neutral-400">Choose an account and a date range, then press Generate.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">{statement.contactName}</h2>
                <p className="text-xs text-neutral-400">
                  Opening Balance: {formatCurrency(Math.abs(Number(statement.openingBalance)), currency)}
                  {" · "}
                  Balance Brought Forward: {formatCurrency(Math.abs(Number(statement.balanceBroughtForward)), currency)}
                </p>
              </div>
              <p className={`text-sm font-semibold ${BALANCE_DIRECTION_COLOR[balanceDirection(statement.closingBalance)]}`}>
                Closing Balance: {formatCurrency(Math.abs(Number(statement.closingBalance)), currency)}
              </p>
            </div>

            {statement.rows.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-neutral-400">No transactions in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Ref</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium text-right">Debit (Paid)</th>
                      <th className="px-4 py-3 font-medium text-right">Credit (Received)</th>
                      <th className="px-4 py-3 font-medium text-right">Running Principal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    <tr className="bg-neutral-50/50">
                      <td className="px-4 py-2.5 text-neutral-400" colSpan={6}>
                        Balance brought forward
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-semibold tabular-nums ${BALANCE_DIRECTION_COLOR[balanceDirection(statement.balanceBroughtForward)]}`}
                      >
                        {formatCurrency(Math.abs(Number(statement.balanceBroughtForward)), currency)}
                      </td>
                    </tr>
                    {statement.rows.map((row) => {
                      const isVoided = row.status === "VOIDED";
                      return (
                        <tr key={row.transactionId} className={isVoided ? "opacity-50" : ""}>
                          <td className="px-4 py-3 text-neutral-600">{new Date(row.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-neutral-400">{row.referenceNo ?? "-"}</td>
                          <td className="px-4 py-3 text-neutral-600">
                            {row.description ?? "-"}
                            {isVoided && <span className="ml-1 text-xs font-normal text-neutral-400">(Voided)</span>}
                          </td>
                          <td className="px-4 py-3 text-neutral-500">{row.category}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {row.debit ? (
                              <span className="font-semibold text-brand-danger">{formatCurrency(row.debit, currency)}</span>
                            ) : (
                              <span className="text-neutral-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {row.credit ? (
                              <span className="font-semibold text-brand-primary">{formatCurrency(row.credit, currency)}</span>
                            ) : (
                              <span className="text-neutral-300">-</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold tabular-nums ${BALANCE_DIRECTION_COLOR[balanceDirection(row.runningPrincipal)]}`}>
                            {formatCurrency(Math.abs(Number(row.runningPrincipal)), currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
