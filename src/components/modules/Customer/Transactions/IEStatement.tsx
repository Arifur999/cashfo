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
  // The filters on (null when off): the type, the category and wallet, a search.
  type: "INCOME" | "EXPENSE" | null;
  category: string | null;
  wallet: string | null;
  search: string | null;
  // The period has more transactions than one printout takes.
  capped: boolean;
  today: string;
  currency: string;
}

const CELL = "border-b border-line-card px-2 py-1.75 align-top";
const HEAD = "border-b-[1.5px] border-ink px-2 py-1.75 text-left text-[10.5px] font-semibold tracking-[0.04em] text-ink-soft uppercase";

// Income and expense on paper (the Transactions board's print preview):
// whose and which period, the type, category and how many it shows, what
// came in and went out and the net, then every transaction.
export function IEStatement({ lines, periodLabel, range, type, category, wallet, search, capped, today, currency }: IEStatementProps) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();

  usePrintInLight();

  const money = (value: number) => formatCurrency(value, currency, fmt);
  const income = lines.filter((line) => line.kind === "INCOME").reduce((sum, line) => sum + line.amount, 0);
  const expense = lines.filter((line) => line.kind === "EXPENSE").reduce((sum, line) => sum + line.amount, 0);
  const net = income - expense;
  const meta: { label: string; value: string; sub?: string | null }[] = [
    { label: t("Period"), value: periodLabel, sub: range },
    { label: t("Type"), value: type ? t(type === "INCOME" ? "Income" : "Expense") : t("Income and expense") },
    { label: t("Category"), value: category ?? t("All categories"), sub: wallet && `${t("Account")}: ${wallet}` },
    { label: t("Transactions"), value: plural(t, lines.length, "{count} transaction", "{count} transactions", undefined, fmt), sub: search && t("search \"{text}\"", { text: search }) },
  ];
  const cells = [
    { label: t("Income"), value: `+ ${money(income)}`, tone: "text-tint-green-ink" },
    { label: t("Expense"), value: `− ${money(expense)}`, tone: "text-expense" },
    { label: t("Net"), value: formatSignedCurrency(net, currency, fmt), tone: net < 0 ? "text-expense" : "text-ink" },
  ];

  return (
    <section className="flex flex-col gap-4.5 text-small text-ink [print-color-adjust:exact]">
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-3.5">
        <div className="flex flex-col gap-1">
          <Logo height={28} />
          <span className="text-[11px] text-ink-muted">{t("Statement for {name}", { name: user.name })}</span>
        </div>
        <div className="flex flex-col items-end gap-0.75 text-right">
          <span className="text-[16px] font-bold tracking-[0.05em] uppercase">{t("Income & expense statement")}</span>
          <span className="text-[11px] text-ink-muted">{t("Generated {date}", { date: formatDate(today, undefined, fmt) })}</span>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-3 text-[11.5px]">
        {meta.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-col gap-0.75">
            <span className="text-ink-muted">{item.label}</span>
            <span className="text-[13px] font-semibold wrap-break-word">{item.value}</span>
            {item.sub && <span className="text-ink-muted wrap-break-word">{item.sub}</span>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 overflow-hidden rounded-[6px] border border-input">
        {cells.map((cell, index) => (
          <div key={cell.label} className={cn("flex flex-col gap-0.75 px-3 py-2.5", index < cells.length - 1 && "border-r border-line-card")}>
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
              <td className={cn(CELL, "text-right font-semibold whitespace-nowrap", line.kind === "INCOME" ? "text-tint-green-ink" : "text-expense")}>{`${line.kind === "INCOME" ? "+" : "−"} ${money(line.amount)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lines.length === 0 && <span className="text-caption text-ink-muted">{t("No transactions found")}</span>}

      <footer className="mt-auto flex justify-between gap-4 border-t border-input pt-2.5 text-[10.5px] text-ink-muted">
        <span>{t("Amounts in {currency}. Transfers between your own accounts are not included.", { currency })}</span>
        <span>Smartly</span>
      </footer>
    </section>
  );
}
