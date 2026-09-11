"use client";

import { AlertTriangle } from "lucide-react";
import { Fragment } from "react";
import { accountDisplayName, ACCOUNT_TYPE_LABELS } from "@/lib/accountDisplay";
import type { AccountType, LanguagePreference, TrialBalanceResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

interface TrialBalancePageClientProps {
  data: TrialBalanceResponse;
  preferredLanguage: LanguagePreference;
  currency: string;
}

const ACCOUNT_TYPE_ORDER: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

export function TrialBalancePageClient({ data, preferredLanguage, currency }: TrialBalancePageClientProps) {
  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Trial Balance</h1>
      <p className="mt-1 text-sm text-neutral-500">Every account&apos;s closing balance, split by its normal Debit or Credit side.</p>

      {!data.isBalanced && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            <strong>Data integrity warning:</strong> total debits ({formatCurrency(data.totalDebit, currency)}) do not equal total credits (
            {formatCurrency(data.totalCredit, currency)}). This should never happen -- contact support.
          </span>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl bg-surface shadow-sm shadow-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium text-right">Debit</th>
              <th className="px-4 py-3 font-medium text-right">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {ACCOUNT_TYPE_ORDER.map((type) => {
              const rows = data.rows.filter((r) => r.accountType === type);
              if (rows.length === 0) return null;
              const subtotalDebit = rows.reduce((sum, r) => sum + Number(r.debit), 0);
              const subtotalCredit = rows.reduce((sum, r) => sum + Number(r.credit), 0);
              return (
                <Fragment key={type}>
                  <tr className="bg-neutral-50/60">
                    <td colSpan={3} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {ACCOUNT_TYPE_LABELS[type]}
                    </td>
                  </tr>
                  {rows.map((row) => (
                    <tr key={row.accountId}>
                      <td className={`px-4 py-2.5 pl-6 text-neutral-700 ${row.status === "ARCHIVED" ? "text-neutral-400 line-through" : ""}`}>
                        {accountDisplayName(row, preferredLanguage)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {Number(row.debit) !== 0 ? formatCurrency(row.debit, currency) : ""}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                        {Number(row.credit) !== 0 ? formatCurrency(row.credit, currency) : ""}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-neutral-100 text-xs text-neutral-400">
                    <td className="px-4 py-1.5 pl-6">Subtotal</td>
                    <td className="px-4 py-1.5 text-right tabular-nums">{formatCurrency(subtotalDebit, currency)}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums">{formatCurrency(subtotalCredit, currency)}</td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-200 text-sm font-bold text-neutral-900">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.totalDebit, currency)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.totalCredit, currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
