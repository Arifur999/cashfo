"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Logo from "@/components/smartly/Logo";
import { ACCOUNT_TYPE_LABELS, accountDisplayName, balanceText } from "@/lib/customer/accountDisplay";
import type { Account, LanguagePreference, LedgerRow } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { ledgerDirection, periodText, readsAsMoney, statementParty } from "@/lib/customer/ledger";
import { cancelledLabel, TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { WALLET_TYPE_META, walletType } from "@/lib/customer/walletVisuals";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface LedgerStatementProps {
  account: Account;
  rows: LedgerRow[];
  // The balance before the first row and after the last.
  opening: string;
  closing: string;
  // Only part of the period: this one page (Ctrl+P before the rest loaded),
  // or a period longer than one printout takes.
  partial: "page" | "capped" | null;
  periodFrom?: string;
  periodTo?: string;
  today: string;
  currency: string;
  preferredLanguage: LanguagePreference;
}

const CELL = "border-b border-line px-2 py-1.5 align-top";
const HEAD = "border-b-2 border-ink px-2 py-2 text-left text-caption font-semibold tracking-[0.04em] text-ink uppercase";

// The statement as paper shows it, like a bank's: who and which account at
// the top, the period's four figures, then every movement with where the
// money went or came from, a withdrawal or deposit column and the balance
// after it. Only printed: the screen keeps the ledger above.
export function LedgerStatement({ account, rows, opening, closing, partial, periodFrom, periodTo, today, currency, preferredLanguage }: LedgerStatementProps) {
  const { t, fmt } = useLocale();
  const { user, activeBusiness } = useAuth();
  const money = readsAsMoney(account);

  // Paper is white whatever the screen's theme: the dark theme comes off
  // while the browser prints and goes back on after.
  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;
    const before = () => {
      wasDark = root.classList.contains("dark");
      root.classList.remove("dark");
    };
    const after = () => {
      if (wasDark) root.classList.add("dark");
      wasDark = false;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  const totals = rows.reduce(
    (sum, row) => {
      const side = ledgerDirection(row.entryType, account.accountType);
      return side === "in" ? { ...sum, in: sum.in + Number(row.amount), deposits: sum.deposits + 1 } : { ...sum, out: sum.out + Number(row.amount), withdrawals: sum.withdrawals + 1 };
    },
    { in: 0, out: 0, deposits: 0, withdrawals: 0 },
  );
  const kind = money ? WALLET_TYPE_META[walletType(account)].label : ACCOUNT_TYPE_LABELS[account.accountType];
  const inLabel = money ? t("Deposit@@statement") : t("Increase@@statement");
  const outLabel = money ? t("Withdrawal@@statement") : t("Decrease@@statement");

  return (
    <section className="hidden text-small text-ink [print-color-adjust:exact] print:block">
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-3">
        <div className="flex flex-col gap-1">
          <Logo height={30} />
          {activeBusiness && <span className="text-caption text-ink-2">{activeBusiness.name}</span>}
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="text-h3 font-bold tracking-normal">{t("Account statement")}</span>
          <span className="text-caption text-ink-2">{t("Statement period: {period}", { period: periodText(t, periodFrom, periodTo, fmt) })}</span>
          <span className="text-caption text-ink-2">{t("Printed {date}", { date: formatDate(today, undefined, fmt) })}</span>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-small">
        <Detail label={t("Account holder")} value={user.name} />
        <Detail label={t("Account name")} value={accountDisplayName(account, preferredLanguage)} />
        <Detail label={t("Email")} value={user.email} />
        <Detail label={t("Account number")} value={account.accountNumber || "—"} />
        {user.phone ? <Detail label={t("Phone")} value={user.phone} /> : <span />}
        <Detail label={t("Account type")} value={t(kind)} />
        <span />
        <Detail label={t("Currency")} value={currency} />
      </dl>

      <div className="mt-3 grid grid-cols-4 border border-ink">
        <Figure label={t("Opening balance")} value={balanceText(opening, currency, fmt)} />
        <Figure label={money ? t("Total deposits") : t("Total increase")} note={t("{count} entries", { count: formatCount(totals.deposits, fmt) })} value={formatCurrency(totals.in, currency, fmt)} />
        <Figure label={money ? t("Total withdrawals") : t("Total decrease")} note={t("{count} entries", { count: formatCount(totals.withdrawals, fmt) })} value={formatCurrency(totals.out, currency, fmt)} />
        <Figure label={t("Closing balance")} value={balanceText(closing, currency, fmt)} last />
      </div>

      {partial && (
        <p className="mt-2 text-caption text-ink-2">
          {partial === "page" ? t("This copy holds only the page on screen. Use Print / PDF for the whole period.") : t("This copy holds the period's first {count} entries.", { count: formatCount(rows.length, fmt) })}
        </p>
      )}

      <table className="mt-4 w-full table-fixed border-collapse text-caption tabular-nums">
        <colgroup>
          <col className="w-[13%]" />
          <col />
          <col className="w-[11%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[15%]" />
        </colgroup>
        <thead>
          <tr>
            <th className={HEAD}>{t("Date")}</th>
            <th className={HEAD}>{t("Particulars")}</th>
            <th className={HEAD}>{t("Ref.")}</th>
            <th className={cn(HEAD, "text-right")}>{outLabel}</th>
            <th className={cn(HEAD, "text-right")}>{inLabel}</th>
            <th className={cn(HEAD, "text-right")}>{t("Balance")}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-table-head">
            <td className={CELL}>{periodFrom ? formatDate(periodFrom, undefined, fmt) : ""}</td>
            <td className={cn(CELL, "font-semibold")} colSpan={4}>
              {partial === "page" ? t("Brought forward") : t("Opening balance")}
            </td>
            <td className={cn(CELL, "text-right font-semibold")}>{balanceText(opening, currency, fmt)}</td>
          </tr>
          {rows.map((row) => {
            const direction = ledgerDirection(row.entryType, account.accountType);
            const party = statementParty(row);
            const cancelled = cancelledLabel({ status: row.transactionStatus, reversalOfId: row.reversalOfId ?? null });
            const detail = [t(TRANSACTION_TYPE_LABELS[row.transactionType]), row.description].filter(Boolean).join(" · ");
            return (
              <tr key={row.entryId} className="break-inside-avoid">
                <td className={cn(CELL, "whitespace-nowrap")}>{formatDate(row.date, undefined, fmt)}</td>
                <td className={CELL}>
                  <span className="block font-semibold">{party ? (direction === "out" ? t("To: {name}", { name: party }) : t("From: {name}", { name: party })) : (row.description ?? t(TRANSACTION_TYPE_LABELS[row.transactionType]))}</span>
                  <span className="block text-ink-2">
                    {party ? detail : null}
                    {cancelled && <span className="font-semibold">{`${party ? " · " : ""}${t(cancelled)}`}</span>}
                  </span>
                </td>
                <td className={cn(CELL, "break-all text-ink-2")}>{row.referenceNo ?? ""}</td>
                <td className={cn(CELL, "text-right")}>{direction === "out" ? formatCurrency(row.amount, currency, fmt) : ""}</td>
                <td className={cn(CELL, "text-right")}>{direction === "in" ? formatCurrency(row.amount, currency, fmt) : ""}</td>
                <td className={cn(CELL, "text-right font-semibold")}>{balanceText(row.runningBalance, currency, fmt)}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td className={cn(CELL, "py-4 text-center text-ink-2")} colSpan={6}>
                {t("No activity in this range.")}
              </td>
            </tr>
          )}
          <tr className="bg-table-head font-bold">
            <td className={cn(CELL, "border-b-2 border-ink")} colSpan={3}>
              {partial === "page" ? t("Carried forward") : t("Closing balance")}
            </td>
            <td className={cn(CELL, "border-b-2 border-ink text-right")}>{formatCurrency(totals.out, currency, fmt)}</td>
            <td className={cn(CELL, "border-b-2 border-ink text-right")}>{formatCurrency(totals.in, currency, fmt)}</td>
            <td className={cn(CELL, "border-b-2 border-ink text-right")}>{balanceText(closing, currency, fmt)}</td>
          </tr>
        </tbody>
      </table>

      <footer className="mt-4 flex justify-between gap-6 text-caption text-ink-2">
        <span>{t("This is a computer-generated statement and needs no signature.")}</span>
        <span className="text-right">{t("Voided entries and their reversals both stay in the balance, so they cancel out.")}</span>
      </footer>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="w-28 shrink-0 text-ink-2">{label}</dt>
      <dd className="min-w-0 font-semibold wrap-break-word">{value}</dd>
    </div>
  );
}

function Figure({ label, value, note, last = false }: { label: string; value: string; note?: string; last?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-0.5 px-3 py-2", !last && "border-r border-ink")}>
      <span className="text-caption text-ink-2">{label}</span>
      <span className="text-body font-bold">{value}</span>
      {note && <span className="text-caption text-ink-2">{note}</span>}
    </div>
  );
}
