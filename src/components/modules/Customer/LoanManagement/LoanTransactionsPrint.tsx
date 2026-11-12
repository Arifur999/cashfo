"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface TransactionPrintRow {
  key: string;
  date: string;
  name: string;
  what: string;
  note: string;
  amount: string;
  // Money in (true) or out.
  received: boolean;
  balance: string;
}

interface LoanTransactionsPrintProps {
  // "2026 · Islami Bank · Profit · 8 entries".
  sub: string;
  madeOn: string;
  moneyIn: string;
  moneyOut: string;
  rows: TransactionPrintRow[];
}

const CELL = "border-b border-line-card px-2 py-1.5 align-top";

// The list on paper (LoanTransactions board's print): what it covers, the
// money in and out, and every entry with the balance after it.
export function LoanTransactionsPrint({ sub, madeOn, moneyIn, moneyOut, rows }: LoanTransactionsPrintProps) {
  const { t } = useLocale();
  const heads: [string, "left" | "right"][] = [
    [t("Date"), "left"],
    [t("Bank / person"), "left"],
    [t("What happened"), "left"],
    [t("Note"), "left"],
    [t("Amount"), "right"],
    [t("Balance after"), "right"],
  ];
  return (
    <section className="flex flex-col gap-4 leading-[normal] text-ink">
      <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-3.5">
        <div className="flex flex-col gap-1">
          <span className="text-[20px] font-bold">{t("Loan transactions")}</span>
          <span className="text-[12.5px] text-ink-soft">{sub}</span>
        </div>
        <div className="text-right text-[12px] leading-[1.6] text-ink-soft">
          <b className="text-ink">Smartly</b>
          <br />
          {madeOn}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[8px] border border-line-strong/40 px-3 py-2.5">
          <div className="text-[11.5px] text-ink-soft">{t("Money in")}</div>
          <div className="text-[16px] font-bold text-income tabular-nums">{moneyIn}</div>
        </div>
        <div className="rounded-[8px] border border-line-strong/40 px-3 py-2.5">
          <div className="text-[11.5px] text-ink-soft">{t("Money out")}</div>
          <div className="text-[16px] font-bold text-loss-ink tabular-nums">{moneyOut}</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-150 border-collapse text-[12px]">
          <thead className="[display:table-header-group]">
            <tr className="bg-surface-sunken">
              {heads.map(([label, align]) => (
                <th key={label} className={cn("border-b border-input px-2 py-1.75 font-semibold", align === "right" ? "text-right" : "text-left")}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="break-inside-avoid">
                <td className={cn(CELL, "whitespace-nowrap tabular-nums")}>{row.date}</td>
                <td className={CELL}>{row.name}</td>
                <td className={CELL}>{row.what}</td>
                <td className={CELL}>{row.note}</td>
                <td className={cn(CELL, "text-right whitespace-nowrap tabular-nums", row.received ? "text-income" : "text-loss-ink")}>{row.amount}</td>
                <td className={cn(CELL, "text-right whitespace-nowrap tabular-nums")}>{row.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-ink-muted">{t("Balance after = what is owed between you and that bank or person after the entry.")}</div>
    </section>
  );
}
