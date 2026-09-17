"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Account, AccountLedger, AccountSummary, LanguagePreference } from "@/lib/api";
import { ACCOUNT_TYPE_LABELS, accountDisplayName } from "@/lib/accountDisplay";
import { formatCurrency } from "@/lib/currency";
import type { DateRangePreset } from "@/lib/dateRangePresets";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AccountDetailPageClientProps {
  account: Account;
  ledger: AccountLedger;
  summary: AccountSummary;
  preferredLanguage: LanguagePreference;
  currency: string;
  preset: DateRangePreset;
  customFrom?: string;
  customTo?: string;
}

const RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

// Same rule as the backend's isDebitPositive() -- duplicated here (not
// shared code across the frontend/backend boundary) purely to decide which
// ledger column ("Money In" vs "Money Out") a DEBIT/CREDIT entry lands in.
function isDebitPositive(accountType: Account["accountType"]): boolean {
  return accountType === "ASSET" || accountType === "EXPENSE";
}

export function AccountDetailPageClient({ account, ledger, summary, preferredLanguage, currency, preset, customFrom, customTo }: AccountDetailPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const debitPositive = isDebitPositive(account.accountType);

  function setRange(value: DateRangePreset) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("range", value);
    next.delete("page");
    if (value !== "custom") {
      next.delete("dateFrom");
      next.delete("dateTo");
    }
    router.push(`/accounts/${account.id}?${next.toString()}`);
  }

  function setCustomDate(key: "dateFrom" | "dateTo", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("range", "custom");
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/accounts/${account.id}?${next.toString()}`);
  }

  function goToPage(page: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(page));
    router.push(`/accounts/${account.id}?${next.toString()}`);
  }

  const isFiltered = preset !== "all";

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <Link href="/accounts" className="text-sm text-neutral-400 hover:text-neutral-600 hover:underline">
        ← {t("Back to Chart of Accounts")}
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-neutral-900">{accountDisplayName(account, preferredLanguage)}</h1>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
              {t(ACCOUNT_TYPE_LABELS[account.accountType])}
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums text-neutral-900">{formatCurrency(summary.currentBalance, currency)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{t("Transactions")}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-800">{summary.transactionCount}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRange(opt.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              preset === opt.value ? "bg-brand-primary text-white" : "bg-surface text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {t(opt.label)}
          </button>
        ))}
        {preset === "custom" && (
          <>
            <input
              type="date"
              value={customFrom ?? ""}
              onChange={(e) => setCustomDate("dateFrom", e.target.value)}
              className="rounded-xl border border-neutral-200 bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
            />
            <span className="text-sm text-neutral-400">{t("to")}</span>
            <input
              type="date"
              value={customTo ?? ""}
              onChange={(e) => setCustomDate("dateTo", e.target.value)}
              className="rounded-xl border border-neutral-200 bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
            />
          </>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {isFiltered && (
          <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/60 px-4 py-2.5 text-sm">
            <span className="text-neutral-500">{t("Balance brought forward")}</span>
            <span className="font-medium tabular-nums text-neutral-700">{formatCurrency(ledger.balanceBroughtForward, currency)}</span>
          </div>
        )}
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Date")}</th>
              <th className="px-4 py-3 font-medium">{t("Description")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("Money In")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("Money Out")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("Balance")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {ledger.entries.map((row) => {
              const isIn = (row.entryType === "DEBIT") === debitPositive;
              const isVoided = row.transactionStatus === "VOIDED";
              return (
                <tr
                  key={row.entryId}
                  onClick={() => router.push(`/transactions/${row.transactionId}`)}
                  className={`cursor-pointer hover:bg-neutral-50/60 ${isVoided ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3 text-neutral-500">{new Date(row.date).toLocaleDateString()}</td>
                  <td className={`px-4 py-3 text-neutral-700 ${isVoided ? "line-through" : ""}`}>
                    {row.description ?? "-"}
                    {isVoided && <span className="ml-2 text-xs text-brand-danger">{t("Voided")}</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-primary">{isIn ? formatCurrency(row.amount, currency) : ""}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-danger">{!isIn ? formatCurrency(row.amount, currency) : ""}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-neutral-800">{formatCurrency(row.runningBalance, currency)}</td>
                </tr>
              );
            })}
            {ledger.entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                  {t("No activity in this range.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>

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
    </div>
  );
}
