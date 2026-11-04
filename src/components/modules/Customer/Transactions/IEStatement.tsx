"use client";

import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Logo from "@/components/smartly/Logo";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import { usePrintInLight } from "@/hooks/usePrintInLight";

export interface StatementLine {
  id: string;
  date: string;
  kind: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  account: string;
  amount: number;
}

interface IEStatementProps {
  lines: StatementLine[];
  periodLabel: string;
  range: string | null;
  // What else narrows it: "Expense · Food & Dining · search "bazar"".
  narrowed: string | null;
  // The period has more transactions than one printout takes.
  capped: boolean;
  today: string;
  currency: string;
}

const CELL = "border-b border-line px-2 py-1.75 align-top";
const HEAD = "border-b-[1.5px] border-ink px-2 py-1.75 text-left text-[10.5px] font-semibold tracking-[0.04em] text-ink-2 uppercase";

// Income and expense on paper (the Transactions board's print preview):
// whose and which period, what came in and went out, the net and how many,
// then every transaction.
export function IEStatement({ lines, periodLabel, range, narrowed, capped, today, currency }: IEStatementProps) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();

  usePrintInLight();

  const money = (value: number) => formatCurrency(value, currency, fmt);
  const income = lines.filter((line) => line.kind === "INCOME").reduce((sum, line) => sum + line.amount, 0);
  const expense = lines.filter((line) => line.kind === "EXPENSE").reduce((sum, line) => sum + line.amount, 0);
  const cells = [
    { label: t("Income"), value: `+ ${money(income)}`, tone: "text-income" },
    { label: t("Expense"), value: `− ${money(expense)}`, tone: "text-expense" },
    { label: t("Net"), value: formatSignedCurrency(income - expense, currency, fmt), tone: income - expense < 0 ? "text-expense" : "text-ink" },
    { label: t("Transactions"), value: formatCount(lines.length, fmt), tone: "text-ink" },
  ];

  return (
    <section className="flex flex-col gap-5 text-small text-ink [print-color-adjust:exact]">
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-4">
        <div className="flex flex-col gap-1">
          <Logo height={28} />
          <span className="text-[11px] text-ink-muted">{t("Statement for {name}", { name: user.name })}</span>
        </div>
        <div className="flex flex-col items-end gap-0.75 text-right">
          <span className="text-[17px] font-bold tracking-[0.06em] uppercase">{t("Income & expense statement")}</span>
          <span className="text-[11px] text-ink-muted">{t("Generated {date}", { date: formatDate(today, undefined, fmt) })}</span>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 text-[11.5px]">
        <div className="flex flex-col gap-0.75">
          <span className="text-ink-muted">{t("Period")}</span>
          <span className="text-[13px] font-semibold">{periodLabel}</span>
          {range && <span className="text-ink-muted">{range}</span>}
        </div>
        <div className="flex flex-col gap-0.75">
          <span className="text-ink-muted">{t("Showing")}</span>
          <span className="text-[13px] font-semibold">{narrowed ?? t("Every income and expense")}</span>
        </div>
        <div className="flex flex-col gap-0.75">
          <span className="text-ink-muted">{t("Transactions")}</span>
          <span className="text-[13px] font-semibold">{plural(t, lines.length, "{count} transaction", "{count} transactions", undefined, fmt)}</span>
          <span className="text-ink-muted">{t("Currency: {currency}", { currency })}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 overflow-hidden rounded-md border border-line-strong">
        {cells.map((cell, index) => (
          <div key={cell.label} className={cn("flex flex-col gap-0.75 px-3 py-2.5", index < cells.length - 1 && "border-r border-line")}>
            <span className="text-[10.5px] text-ink-muted">{cell.label}</span>
            <span className={cn("text-[14px] font-bold tabular-nums", cell.tone)}>{cell.value}</span>
          </div>
        ))}
      </div>

      {capped && <p className="-mt-2 text-caption text-ink-2">{t("Only the latest {count} transactions are printed -- pick a shorter period to print them all.", { count: formatCount(lines.length, fmt) })}</p>}

      <table className="w-full table-fixed border-collapse text-[11.5px] tabular-nums">
        <colgroup>
          <col className="w-[5%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[16%]" />
          <col />
          <col className="w-[13%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr>
            <th className={HEAD}>#</th>
            <th className={HEAD}>{t("Date")}</th>
            <th className={HEAD}>{t("Type")}</th>
            <th className={HEAD}>{t("Category")}</th>
            <th className={HEAD}>{t("Description")}</th>
            <th className={HEAD}>{t("Account")}</th>
            <th className={cn(HEAD, "text-right")}>{t("Amount")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id} className="break-inside-avoid">
              <td className={cn(CELL, "text-ink-muted")}>{formatCount(index + 1, fmt)}</td>
              <td className={cn(CELL, "whitespace-nowrap")}>{formatDate(line.date, undefined, fmt)}</td>
              <td className={CELL}>{t(line.kind === "INCOME" ? "Income" : "Expense")}</td>
              <td className={cn(CELL, "wrap-break-word")}>{line.category}</td>
              <td className={cn(CELL, "wrap-break-word")}>{line.description || "—"}</td>
              <td className={cn(CELL, "wrap-break-word")}>{line.account || "—"}</td>
              <td className={cn(CELL, "text-right whitespace-nowrap", line.kind === "INCOME" ? "text-income" : "text-expense")}>{`${line.kind === "INCOME" ? "+" : "−"} ${money(line.amount)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lines.length === 0 && <span className="text-caption text-ink-muted">{t("No transactions")}</span>}

      <footer className="mt-auto border-t border-line-strong pt-2.5 text-[10.5px] text-ink-muted">{t("Amounts in {currency}. Transfers between your own accounts are not included.", { currency })}</footer>
    </section>
  );
}
