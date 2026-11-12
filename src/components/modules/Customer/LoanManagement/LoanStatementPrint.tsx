"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface PrintRow {
  key: string;
  date: string;
  what: string;
  note: string;
  in: string;
  out: string;
  profit: string;
  balance: string;
}

interface LoanStatementPrintProps {
  name: string;
  meta: { label: string; value: string }[];
  // Opening, principal out and in, profit, closing.
  figures: { label: string; value: string; tone?: string }[];
  openingLine: string;
  opening: string;
  closingLine: string;
  closing: { in: string; out: string; profit: string; balance: string };
  rows: PrintRow[];
  madeOn: string;
}

const CELL = "px-1.5 py-1.75 align-top text-[11px] border-b border-line-card";
const HEAD = "px-1.5 py-1.75 text-[10px] font-semibold tracking-[0.04em] text-ink-soft uppercase border-b-[1.5px] border-ink";
const END = "text-right whitespace-nowrap tabular-nums";

// The statement on paper (LoanLedger board's print): who and when, the five
// figures, every entry with the balance after it, room for both signatures.
export function LoanStatementPrint({ name, meta, figures, openingLine, opening, closingLine, closing, rows, madeOn }: LoanStatementPrintProps) {
  const { t } = useLocale();
  return (
    <section className="flex flex-col gap-4.5 leading-[normal] text-ink">
      <header className="flex items-start justify-between gap-4 border-b-2 border-ink pb-3.5">
        <div className="flex flex-col gap-1">
          <span className="text-[20px] font-bold">Smartly</span>
          <span className="text-[11px] text-ink-muted">{t("Personal finance · Loan Management")}</span>
        </div>
        <div className="flex flex-col items-end gap-0.75">
          <span className="text-[16px] font-bold tracking-[0.05em] uppercase">{t("Loan statement")}</span>
          <span className="text-[11px] text-ink-muted">{madeOn}</span>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 text-[11.5px] sm:grid-cols-[1.6fr_1fr_1fr_1.4fr]">
        {meta.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-col gap-0.75">
            <span className="text-ink-muted">{item.label}</span>
            <span className="text-[13px] font-semibold wrap-anywhere">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-[6px] border border-input sm:grid-cols-5">
        {figures.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.75 border-r border-line-card px-3 py-2.5">
            <span className="text-[10.5px] text-ink-muted">{item.label}</span>
            <span className={cn("text-[13.5px] font-bold tabular-nums", item.tone ?? "text-ink")}>{item.value}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-150 border-collapse">
          <thead className="[display:table-header-group]">
            <tr>
              <th className={cn(HEAD, "text-left")}>{t("Date")}</th>
              <th className={cn(HEAD, "text-left")}>{t("What happened")}</th>
              <th className={cn(HEAD, "text-left")}>{t("Note / reference")}</th>
              <th className={cn(HEAD, "text-right")}>{t("Principal in")}</th>
              <th className={cn(HEAD, "text-right")}>{t("Principal out")}</th>
              <th className={cn(HEAD, "text-right")}>{t("Profit")}</th>
              <th className={cn(HEAD, "text-right")}>{t("Balance after")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="break-inside-avoid">
              <td colSpan={6} className={cn(CELL, "bg-surface-sunken text-[11.5px] font-semibold")}>
                {openingLine}
              </td>
              <td className={cn(CELL, END, "bg-surface-sunken text-[11.5px] font-bold")}>{opening}</td>
            </tr>
            {rows.map((row) => (
              <tr key={row.key} className="break-inside-avoid">
                <td className={cn(CELL, "whitespace-nowrap tabular-nums")}>{row.date}</td>
                <td className={CELL}>{row.what}</td>
                <td className={cn(CELL, "text-ink-soft")}>{row.note}</td>
                <td className={cn(CELL, END)}>{row.in}</td>
                <td className={cn(CELL, END)}>{row.out}</td>
                <td className={cn(CELL, END)}>{row.profit}</td>
                <td className={cn(CELL, END, "font-semibold")}>{row.balance}</td>
              </tr>
            ))}
            <tr className="break-inside-avoid">
              <td colSpan={3} className="border-t-[1.5px] border-ink px-1.5 py-2 text-[11.5px] font-bold">
                {closingLine}
              </td>
              <td className={cn("border-t-[1.5px] border-ink px-1.5 py-2 text-[11.5px] font-bold", END)}>{closing.in}</td>
              <td className={cn("border-t-[1.5px] border-ink px-1.5 py-2 text-[11.5px] font-bold", END)}>{closing.out}</td>
              <td className={cn("border-t-[1.5px] border-ink px-1.5 py-2 text-[11.5px] font-bold", END)}>{closing.profit}</td>
              <td className={cn("border-t-[1.5px] border-ink px-1.5 py-2 text-[11.5px] font-bold", END)}>{closing.balance}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <span className="text-[12px] text-ink-muted">{t("No entries in this period.")}</span>}
      <div className="grow" />
      <div className="grid grid-cols-2 gap-12 pt-9 break-inside-avoid">
        <span className="border-t border-ink pt-1.5 text-[11px] text-ink-soft">{t("Signature (me)")}</span>
        <span className="border-t border-ink pt-1.5 text-[11px] text-ink-soft">{t("Signature ({name})", { name })}</span>
      </div>
      <footer className="flex justify-between gap-3 border-t border-input pt-2.5 text-[10.5px] text-ink-muted">
        <span>{t("Balance after each entry. Profit and interest don’t change the balance.")}</span>
        <span>Smartly</span>
      </footer>
    </section>
  );
}
