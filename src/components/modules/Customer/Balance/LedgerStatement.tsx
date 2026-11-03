"use client";

import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Logo from "@/components/smartly/Logo";
import { ACCOUNT_TYPE_LABELS, accountDisplayName, balanceText } from "@/lib/customer/accountDisplay";
import type { Account, LanguagePreference, LedgerRow } from "@/lib/customer/api";
import { directionOf, kindOf, LEDGER_KIND_META, partyOf } from "@/lib/customer/balanceDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { isDebitPositive, readsAsMoney } from "@/lib/customer/ledger";
import { cancelledLabel } from "@/lib/customer/transactionDisplay";
import { WALLET_TYPE_META, walletType } from "@/lib/customer/walletVisuals";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import { usePrintInLight } from "@/hooks/usePrintInLight";

interface LedgerStatementProps {
  account: Account;
  // Every row of the period, oldest first.
  rows: LedgerRow[];
  // The period's figures, as the screen's equation has them.
  figures: { opening: string; moneyIn: string; moneyOut: string; transfers: string; closing: string };
  // The period has more rows than one printout takes: only the first ones.
  capped: boolean;
  // "This month", and the days it covers.
  periodLabel: string;
  range: string;
  today: string;
  currency: string;
  preferredLanguage: LanguagePreference;
}

const CELL = "border-b border-line px-2 py-1.75 align-top";
const HEAD = "border-b-[1.5px] border-ink px-2 py-1.75 text-left text-[10.5px] font-semibold tracking-[0.04em] text-ink-2 uppercase";

// The ledger on paper (board: Ledger — Print preview): who it is for and
// which account, the period, its five figures, every entry with its In,
// Out and running balance, and the closing balance under them.
export function LedgerStatement({ account, rows, figures, capped, periodLabel, range, today, currency, preferredLanguage }: LedgerStatementProps) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const debitPositive = isDebitPositive(account.accountType);
  const money = readsAsMoney(account);

  usePrintInLight();

  const totals = rows.reduce((sum, row) => (directionOf(row, debitPositive) === "in" ? { ...sum, in: sum.in + Number(row.amount) } : { ...sum, out: sum.out + Number(row.amount) }), { in: 0, out: 0 });
  const kind = money ? WALLET_TYPE_META[walletType(account)].label : ACCOUNT_TYPE_LABELS[account.accountType];
  const digits = (account.accountNumber ?? "").replace(/\D/g, "");
  const cells = [
    { label: t("Opening balance"), value: balanceText(figures.opening, currency, fmt), tone: "text-ink" },
    { label: t("Money in@@wallet"), value: formatCurrency(figures.moneyIn, currency, fmt), tone: "text-income" },
    { label: t("Money out@@wallet"), value: formatCurrency(figures.moneyOut, currency, fmt), tone: "text-expense" },
    { label: t("Transfers"), value: formatSignedCurrency(Number(figures.transfers), currency, fmt), tone: "text-info" },
    { label: t("Closing balance"), value: balanceText(figures.closing, currency, fmt), tone: "text-ink" },
  ];

  return (
    <section className="flex flex-col gap-5.5 text-small text-ink [print-color-adjust:exact]">
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-4.5">
        <div className="flex flex-col gap-1">
          <Logo height={28} />
          <span className="text-[11px] text-ink-muted">{t("Statement for {name}", { name: user.name })}</span>
        </div>
        <div className="flex flex-col items-end gap-0.75 text-right">
          <span className="text-[17px] font-bold tracking-[0.06em] uppercase">{t("Account statement")}</span>
          <span className="text-[11px] text-ink-muted">{t("Statement no. {number}", { number: `LDG-${account.id.slice(0, 4).toUpperCase()}-${today.slice(0, 7).replace("-", "")}` })}</span>
          <span className="text-[11px] text-ink-muted">{t("Generated {date}", { date: formatDate(today, undefined, fmt) })}</span>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 text-[11.5px]">
        <div className="flex flex-col gap-0.75">
          <span className="text-ink-muted">{t("Account")}</span>
          <span className="text-[13px] font-semibold">{accountDisplayName(account, preferredLanguage)}</span>
          <span className="text-ink-muted">{digits ? `${t(kind)} · ${digits.slice(-4)}` : t(kind)}</span>
        </div>
        <div className="flex flex-col gap-0.75">
          <span className="text-ink-muted">{t("Period")}</span>
          <span className="text-[13px] font-semibold">{periodLabel}</span>
          <span className="text-ink-muted">{range}</span>
        </div>
        <div className="flex flex-col gap-0.75">
          <span className="text-ink-muted">{t("Entries")}</span>
          <span className="text-[13px] font-semibold">{plural(t, rows.length, "{count} transaction", "{count} transactions", undefined, fmt)}</span>
          <span className="text-ink-muted">{t("Currency: {currency}", { currency })}</span>
        </div>
      </div>

      <div className="grid grid-cols-5 overflow-hidden rounded-md border border-line-strong">
        {cells.map((cell, index) => (
          <div key={cell.label} className={cn("flex flex-col gap-0.75 px-3 py-2.5", index < 4 && "border-r border-line", index === 4 && "bg-strip")}>
            <span className="text-[10.5px] text-ink-muted">{cell.label}</span>
            <span className={cn("text-[13.5px] font-bold tabular-nums wrap-anywhere", cell.tone)}>{cell.value}</span>
          </div>
        ))}
      </div>

      {capped && <p className="-mt-2 text-caption text-ink-2">{t("This copy holds the period's first {count} entries.", { count: formatCount(rows.length, fmt) })}</p>}

      <table className="w-full table-fixed border-collapse text-[11.5px] tabular-nums">
        <colgroup>
          <col className="w-[5%]" />
          <col className="w-[12%]" />
          <col className="w-[13%]" />
          <col className="w-[10%]" />
          <col />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[13%]" />
        </colgroup>
        <thead>
          <tr>
            <th className={HEAD}>#</th>
            <th className={HEAD}>{t("Date")}</th>
            <th className={HEAD}>{t("Type")}</th>
            <th className={HEAD}>{t("Ref.")}</th>
            <th className={HEAD}>{t("Description")}</th>
            <th className={cn(HEAD, "text-right")}>{t("In")}</th>
            <th className={cn(HEAD, "text-right")}>{t("Out")}</th>
            <th className={cn(HEAD, "text-right")}>{t("Balance")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={CELL} />
            <td className={cn(CELL, "font-semibold")} colSpan={6}>
              {t("Opening balance")}
            </td>
            <td className={cn(CELL, "text-right font-semibold")}>{balanceText(figures.opening, currency, fmt)}</td>
          </tr>
          {rows.map((row, index) => {
            const direction = directionOf(row, debitPositive);
            const rowKind = kindOf(row);
            const meta = LEDGER_KIND_META[rowKind];
            const party = partyOf(row, rowKind);
            const cancelled = cancelledLabel({ status: row.transactionStatus, reversalOfId: row.reversalOfId ?? null });
            const kicker = t(direction === "in" ? meta.kickerIn : meta.kickerOut);
            const description = [party ? `${kicker} ${t(party)}` : null, row.description ? t(row.description) : null, cancelled ? t(cancelled) : null].filter(Boolean).join(" · ");
            return (
              <tr key={row.entryId} className="break-inside-avoid">
                <td className={cn(CELL, "text-ink-muted")}>{formatCount(index + 1, fmt)}</td>
                <td className={cn(CELL, "whitespace-nowrap")}>{formatDate(row.date, undefined, fmt)}</td>
                <td className={CELL}>{t(meta.label)}</td>
                <td className={cn(CELL, "break-all text-ink-muted")}>{row.referenceNo ?? ""}</td>
                <td className={cn(CELL, "wrap-break-word")}>{description || "—"}</td>
                <td className={cn(CELL, "text-right")}>{direction === "in" ? formatCurrency(row.amount, currency, fmt) : "—"}</td>
                <td className={cn(CELL, "text-right")}>{direction === "out" ? formatCurrency(row.amount, currency, fmt) : "—"}</td>
                <td className={cn(CELL, "text-right font-semibold")}>{balanceText(row.runningBalance, currency, fmt)}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td className={cn(CELL, "py-4 text-center text-ink-muted")} colSpan={8}>
                {t("No activity in this range.")}
              </td>
            </tr>
          )}
          <tr className="font-bold">
            <td className={cn(CELL, "border-b-[1.5px] border-ink")} />
            <td className={cn(CELL, "border-b-[1.5px] border-ink")} colSpan={4}>
              {t("Closing balance")}
            </td>
            <td className={cn(CELL, "border-b-[1.5px] border-ink text-right")}>{formatCurrency(totals.in, currency, fmt)}</td>
            <td className={cn(CELL, "border-b-[1.5px] border-ink text-right")}>{formatCurrency(totals.out, currency, fmt)}</td>
            <td className={cn(CELL, "border-b-[1.5px] border-ink text-right")}>{balanceText(figures.closing, currency, fmt)}</td>
          </tr>
        </tbody>
      </table>

      <footer className="mt-auto border-t border-line-strong pt-3 text-[10.5px] text-ink-muted">
        {t("In includes transfers received. Out includes expenses and transfer charges.")}
        <br />
        {t("This statement is generated from your own records in Smartly.")}
      </footer>
    </section>
  );
}
