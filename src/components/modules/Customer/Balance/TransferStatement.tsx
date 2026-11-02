"use client";

import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Logo from "@/components/smartly/Logo";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import { usePrintInLight } from "./usePrintInLight";

export interface StatementTransfer {
  id: string;
  date: string;
  from: string;
  to: string;
  note: string;
  amount: number;
  charge: number;
  chargeCategory: string | null;
  // Voided, or the reversal that voided one: listed, never counted.
  cancelled: string | null;
}

interface TransferStatementProps {
  transfers: StatementTransfer[];
  // "All accounts" or the one the list is narrowed to.
  account: string;
  periodLabel: string;
  range: string;
  moved: number;
  charges: number;
  // How many of the listed transfers still stand.
  standing: number;
  // The period has more transfers than one printout takes.
  capped: boolean;
  today: string;
  currency: string;
}

const CELL = "border-b border-line px-2 py-1.75 align-top";
const HEAD = "border-b-[1.5px] border-ink px-2 py-1.75 text-left text-[10.5px] font-semibold tracking-[0.04em] text-ink-2 uppercase";

// The transfers on paper (board: Transfers — Print preview): which account
// and period, what moved, the charges and how many, then every transfer.
export function TransferStatement({ transfers, account, periodLabel, range, moved, charges, standing, capped, today, currency }: TransferStatementProps) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();

  usePrintInLight();

  const money = (value: number) => formatCurrency(value, currency, fmt);
  const cells = [
    { label: t("Total moved"), value: money(moved), tone: "text-info" },
    { label: t("Total charges"), value: charges > 0 ? `− ${money(charges)}` : money(0), tone: "text-expense" },
    { label: t("Transfers counted"), value: formatCount(standing, fmt), tone: "text-ink" },
  ];

  return (
    <section className="flex flex-col gap-5 text-small text-ink [print-color-adjust:exact]">
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-4">
        <div className="flex flex-col gap-1">
          <Logo height={28} />
          <span className="text-[11px] text-ink-muted">{t("Statement for {name}", { name: user.name })}</span>
        </div>
        <div className="flex flex-col items-end gap-0.75 text-right">
          <span className="text-[17px] font-bold tracking-[0.06em] uppercase">{t("Transfer statement")}</span>
          <span className="text-[11px] text-ink-muted">{t("Generated {date}", { date: formatDate(today, undefined, fmt) })}</span>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 text-[11.5px]">
        <div className="flex flex-col gap-0.75">
          <span className="text-ink-muted">{t("Account")}</span>
          <span className="text-[13px] font-semibold">{account}</span>
        </div>
        <div className="flex flex-col gap-0.75">
          <span className="text-ink-muted">{t("Period")}</span>
          <span className="text-[13px] font-semibold">{periodLabel}</span>
          <span className="text-ink-muted">{range}</span>
        </div>
        <div className="flex flex-col gap-0.75">
          <span className="text-ink-muted">{t("Transfers")}</span>
          <span className="text-[13px] font-semibold">{plural(t, transfers.length, "{count} transfer", "{count} transfers", undefined, fmt)}</span>
          <span className="text-ink-muted">{t("Currency: {currency}", { currency })}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 overflow-hidden rounded-md border border-line-strong">
        {cells.map((cell, index) => (
          <div key={cell.label} className={cn("flex flex-col gap-0.75 px-3 py-2.5", index < 2 && "border-r border-line")}>
            <span className="text-[10.5px] text-ink-muted">{cell.label}</span>
            <span className={cn("text-[14px] font-bold tabular-nums", cell.tone)}>{cell.value}</span>
          </div>
        ))}
      </div>

      {capped && <p className="-mt-2 text-caption text-ink-2">{t("Only the latest {count} transfers are printed -- pick a shorter period to print them all.", { count: formatCount(transfers.length, fmt) })}</p>}

      <table className="w-full table-fixed border-collapse text-[11.5px] tabular-nums">
        <colgroup>
          <col className="w-[5%]" />
          <col className="w-[13%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col />
          <col className="w-[13%]" />
          <col className="w-[11%]" />
        </colgroup>
        <thead>
          <tr>
            <th className={HEAD}>#</th>
            <th className={HEAD}>{t("Date")}</th>
            <th className={HEAD}>{t("From")}</th>
            <th className={HEAD}>{t("To@@wallet")}</th>
            <th className={HEAD}>{t("Note")}</th>
            <th className={cn(HEAD, "text-right")}>{t("Amount")}</th>
            <th className={cn(HEAD, "text-right")}>{t("Charge")}</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer, index) => (
            <tr key={transfer.id} className={cn("break-inside-avoid", transfer.cancelled && "text-ink-muted line-through")}>
              <td className={cn(CELL, "text-ink-muted no-underline")}>{formatCount(index + 1, fmt)}</td>
              <td className={cn(CELL, "whitespace-nowrap")}>{formatDate(transfer.date, undefined, fmt)}</td>
              <td className={cn(CELL, "wrap-break-word")}>{transfer.from}</td>
              <td className={cn(CELL, "wrap-break-word")}>{transfer.to}</td>
              <td className={cn(CELL, "wrap-break-word")}>
                {[transfer.note, transfer.charge > 0 && transfer.chargeCategory ? t(transfer.chargeCategory) : null, transfer.cancelled ? t(transfer.cancelled) : null].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className={cn(CELL, "text-right")}>{money(transfer.amount)}</td>
              <td className={cn(CELL, "text-right")}>{transfer.charge > 0 ? `− ${money(transfer.charge)}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {transfers.length === 0 && <span className="text-caption text-ink-muted">{t("No transfers in this period.")}</span>}

      <footer className="mt-auto border-t border-line-strong pt-2.5 text-[10.5px] text-ink-muted">{t("Charges are saved as expenses in the sending account.")}</footer>
    </section>
  );
}
