"use client";

import { Printer, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Combobox } from "@/components/ui/Combobox";
import type { Account, AccountLedger, AccountSummary, LanguagePreference, TransactionType } from "@/lib/api";
import { accountDisplayName } from "@/lib/accountDisplay";
import { formatCurrency } from "@/lib/currency";
import type { DateRangePreset } from "@/lib/dateRangePresets";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AccountLedgerPageClientProps {
  accounts: Account[];
  account: Account | null;
  ledger: AccountLedger | null;
  summary: AccountSummary | null;
  preferredLanguage: LanguagePreference;
  currency: string;
  accountId: string;
  range: DateRangePreset;
  customFrom?: string;
  customTo?: string;
}

const RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  TRANSFER: "Transfer",
  JOURNAL: "Journal",
  SALE: "Sale (Credit)",
  PURCHASE: "Purchase (Credit)",
  PAYMENT: "Payment",
};

// Same rule as the backend's isDebitPositive() -- duplicated here (not
// shared code across the frontend/backend boundary) purely to decide which
// ledger column ("In" vs "Out") a DEBIT/CREDIT entry lands in.
function isDebitPositive(accountType: Account["accountType"]): boolean {
  return accountType === "ASSET" || accountType === "EXPENSE";
}

export function AccountLedgerPageClient({
  accounts,
  account,
  ledger,
  summary,
  preferredLanguage,
  currency,
  accountId,
  range,
  customFrom,
  customTo,
}: AccountLedgerPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`/balance/ledger?${params.toString()}`);
  }

  function selectAccount(id: string) {
    updateParams({ accountId: id });
  }

  function setRange(value: DateRangePreset) {
    if (value === "custom") {
      updateParams({ range: value });
    } else {
      updateParams({ range: value, dateFrom: undefined, dateTo: undefined });
    }
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/balance/ledger?${params.toString()}`);
  }

  const debitPositive = account ? isDebitPositive(account.accountType) : true;

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("Account Ledger")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("One account, every movement through it, with the balance carried forward.")}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          <Printer className="h-3.5 w-3.5" /> {t("Print / PDF")}
        </button>
      </div>

      <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Account")}</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Combobox
                  key={accountId || "none"}
                  value={accountId}
                  onChange={selectAccount}
                  options={accounts.map((a) => ({ value: a.id, label: accountDisplayName(a, preferredLanguage) }))}
                  placeholder={t("Select an account")}
                  emptyMessage={t("No accounts yet")}
                />
              </div>
              {accountId && (
                <button
                  type="button"
                  onClick={() => selectAccount("")}
                  title={t("Clear")}
                  className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Period")}</label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as DateRangePreset)}
              className="rounded-xl border border-neutral-200 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.label)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {range === "custom" && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="date"
              value={customFrom ?? ""}
              onChange={(e) => updateParams({ dateFrom: e.target.value })}
              className="rounded-xl border border-neutral-200 bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
            />
            <span className="text-sm text-neutral-400">{t("to")}</span>
            <input
              type="date"
              value={customTo ?? ""}
              onChange={(e) => updateParams({ dateTo: e.target.value })}
              className="rounded-xl border border-neutral-200 bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
            />
          </div>
        )}
      </div>

      {!account || !ledger || !summary ? (
        <div className="mt-6 rounded-2xl bg-surface p-10 text-center text-sm text-neutral-400 shadow-sm shadow-black/5">
          {t("Choose an account to see its ledger.")}
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{t("Opening Balance")}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-800">{formatCurrency(ledger.balanceBroughtForward, currency)}</p>
            </div>
            <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{t("Total In")}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-brand-primary">{formatCurrency(summary.totalIn, currency)}</p>
            </div>
            <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{t("Total Out")}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-brand-danger">{formatCurrency(summary.totalOut, currency)}</p>
            </div>
            <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{t("Adjustment")}</p>
              <p
                className={`mt-1 text-xl font-semibold tabular-nums ${Number(summary.adjustment) > 0 ? "text-brand-primary" : Number(summary.adjustment) < 0 ? "text-brand-danger" : "text-neutral-400"}`}
              >
                {Number(summary.adjustment) > 0 ? "+" : Number(summary.adjustment) < 0 ? "-" : ""}
                {formatCurrency(Math.abs(Number(summary.adjustment)), currency)}
              </p>
            </div>
            <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{t("Closing Balance")}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900">{formatCurrency(ledger.closingBalance, currency)}</p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-neutral-100 bg-brand-dark text-xs uppercase text-white">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">{t("Date")}</th>
                    <th className="px-4 py-3 font-medium">{t("Type")}</th>
                    <th className="px-4 py-3 font-medium">{t("Reference")}</th>
                    <th className="px-4 py-3 font-medium">{t("Description")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("In")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("Out")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("Balance")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  <tr className="bg-neutral-50/60">
                    <td className="px-4 py-2.5" colSpan={7}>
                      <span className="font-medium text-neutral-700">{t("Opening Balance")}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-neutral-700">
                      {formatCurrency(ledger.balanceBroughtForward, currency)}
                    </td>
                  </tr>
                  {ledger.entries.map((row, index) => {
                    const isIn = (row.entryType === "DEBIT") === debitPositive;
                    const isVoided = row.transactionStatus === "VOIDED";
                    return (
                      <tr
                        key={row.entryId}
                        onClick={() => router.push(`/transactions/${row.transactionId}`)}
                        className={`cursor-pointer hover:bg-neutral-50/60 ${isVoided ? "opacity-50" : ""}`}
                      >
                        <td className="px-4 py-2.5 text-neutral-400">{index + 1 + (ledger.meta.page - 1) * ledger.meta.limit}</td>
                        <td className="px-4 py-2.5 text-neutral-600">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5 text-neutral-600">{t(TYPE_LABELS[row.transactionType])}</td>
                        <td className="px-4 py-2.5 text-neutral-500">{row.referenceNo ?? "-"}</td>
                        <td className={`px-4 py-2.5 text-neutral-700 ${isVoided ? "line-through" : ""}`}>
                          {row.description ?? "-"}
                          {isVoided && <span className="ml-2 text-xs text-brand-danger">{t("Voided")}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-brand-primary">{isIn ? formatCurrency(row.amount, currency) : ""}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-brand-danger">{!isIn ? formatCurrency(row.amount, currency) : ""}</td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums text-neutral-800">{formatCurrency(row.runningBalance, currency)}</td>
                      </tr>
                    );
                  })}
                  {ledger.entries.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-neutral-400">
                        {t("No activity in this range.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {ledger.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 text-sm">
                <button
                  type="button"
                  disabled={ledger.meta.page <= 1}
                  onClick={() => goToPage(ledger.meta.page - 1)}
                  className="rounded-lg px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"
                >
                  {t("Previous")}
                </button>
                <span className="text-neutral-400">
                  {t("Page")} {ledger.meta.page} {t("of")} {ledger.meta.totalPages}
                </span>
                <button
                  type="button"
                  disabled={ledger.meta.page >= ledger.meta.totalPages}
                  onClick={() => goToPage(ledger.meta.page + 1)}
                  className="rounded-lg px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"
                >
                  {t("Next")}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
