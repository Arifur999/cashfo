"use client";

import { Download, FileDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, MonthlyBreakdown } from "@/lib/customer/api";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency } from "@/lib/customer/currency";
import { monthName } from "@/lib/customer/insights";
import { REPORT_PERIOD_LABELS, REPORT_PERIODS, reportCsv, type ReportPeriod, type ReportRow, reportRows, type ReportShow } from "@/lib/customer/reportTable";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface ReportsPageClientProps {
  currency: string;
  income: MonthlyBreakdown;
  expense: MonthlyBreakdown;
  wallets: Account[];
  period: ReportPeriod;
  walletId: string | null;
  show: ReportShow;
  // "January–March 2026": what the table covers, for its caption and the file name.
  rangeLabel: string;
}

const ROW_STYLE: Record<ReportRow["kind"], string> = {
  block: "min-h-13 bg-cream font-bold",
  category: "min-h-12 bg-surface font-semibold",
  left: "min-h-14 bg-mint-50 font-bold text-brand-ink",
};

// Reports: every category, month by month, for a period and (optionally)
// one wallet, with the file downloads the tax folder wants.
export function ReportsPageClient({ currency, income, expense, wallets, period, walletId, show, rangeLabel }: ReportsPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = displayLanguage(locale);
  const { months, rows } = reportRows(income, expense, show);
  const crossesYear = new Set(months.map((m) => m.slice(0, 4))).size > 1;
  const monthLabels = months.map((m) => monthName(m, locale, "short", crossesYear));
  const columns = { gridTemplateColumns: `minmax(0, 1.6fr) repeat(${months.length}, minmax(0, 1fr)) minmax(0, 1.1fr) 64px` };
  const hasRows = rows.some((row) => row.kind === "category");

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/reports/detailed?${params.toString()}`);
  }

  const rowName = (row: ReportRow) => (row.kind === "category" ? row.name : t(row.name));

  function downloadCsv() {
    const csv = reportCsv(months, rows, { category: t("Category"), total: t("Total"), share: t("Share"), months: monthLabels, names: rowName });
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smartly-report-${rangeLabel.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={t("Insights")}
        tone="insights"
        title={t("Reports")}
        description={t("Every category, month by month. Download it for your records or your tax file.")}
        actions={
          <div className="flex gap-3 print:hidden">
            <Button variant="secondary" size="lg" onClick={downloadCsv} disabled={!hasRows}>
              <Download />
              CSV
            </Button>
            <Button size="lg" onClick={() => window.print()} disabled={!hasRows}>
              <FileDown />
              {t("Download PDF")}
            </Button>
          </div>
        }
      />

      <Card padding="none" className="flex flex-wrap items-center gap-3 p-3 print:hidden">
        <NativeSelect size="sm" aria-label={t("Period")} value={period} onChange={(e) => updateParams({ period: e.target.value })} className="font-semibold">
          {REPORT_PERIODS.map((value) => (
            <option key={value} value={value}>
              {t(REPORT_PERIOD_LABELS[value])}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect size="sm" aria-label={t("Wallet")} value={walletId ?? ""} onChange={(e) => updateParams({ wallet: e.target.value || undefined })} className="font-semibold">
          <option value="">{t("All wallets")}</option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {accountDisplayName(wallet, lang)}
            </option>
          ))}
        </NativeSelect>
        <SegmentedControl
          label={t("Show")}
          variant="pill"
          value={show}
          onChange={(value) => updateParams({ show: value === "both" ? undefined : value })}
          options={[
            { value: "both", label: t("Both") },
            { value: "income", label: t("Income") },
            { value: "expense", label: t("Expense") },
          ]}
        />
        <span className="text-small text-ink-muted md:ml-auto">{t("Voided entries are left out")}</span>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <h2 className="px-6 pt-5 pb-3 text-h3 text-ink">
          {show === "income" ? t("Income by category") : show === "expense" ? t("Expense by category") : t("Income and expense by category")}
          <span className="hidden print:inline"> · {rangeLabel}</span>
        </h2>
        <div className="overflow-x-auto">
          <div role="table" aria-label={`${t("Income and expense by category")}, ${rangeLabel}`} className="min-w-160">
            <div role="row" className="grid gap-2 border-t border-line bg-cream px-6 py-3 text-caption font-semibold text-ink-muted" style={columns}>
              <span role="columnheader">{t("Category")}</span>
              {monthLabels.map((label) => (
                <span key={label} role="columnheader" className="text-right">
                  {label}
                </span>
              ))}
              <span role="columnheader" className="text-right">
                {t("Total")}
              </span>
              <span role="columnheader" className="text-right">
                {t("Share")}
              </span>
            </div>
            {hasRows ? (
              rows.map((row) => <TableRow key={`${row.kind}:${row.type}:${row.name}`} row={row} currency={currency} columns={columns} name={rowName(row)} />)
            ) : (
              <p className="border-t border-line px-6 py-10 text-center text-body text-ink-muted">{t("No income or expense in this period.")}</p>
            )}
          </div>
        </div>
      </Card>
    </PageFrame>
  );
}

function TableRow({ row, currency, columns, name }: { row: ReportRow; currency: string; columns: React.CSSProperties; name: string }) {
  const dot = row.kind === "category" ? categoryTone(row.color).fg : row.type === "INCOME" ? "text-emerald" : row.type === "EXPENSE" ? "text-expense-fill" : "text-mint-300";
  const total = row.kind === "block" ? (row.type === "INCOME" ? "text-income" : "text-expense") : row.kind === "left" ? "text-brand-ink" : "text-ink";
  const totalText = row.kind === "block" ? `${row.type === "INCOME" ? "+" : "−"} ${formatCurrency(row.total, currency)}` : formatCurrency(row.total, currency);
  return (
    <div role="row" className={cn("grid items-center gap-2 border-t border-line px-6 text-body tabular-nums", ROW_STYLE[row.kind])} style={columns}>
      <span role="cell" className="flex min-w-0 items-center gap-3">
        <span className={cn("size-2.5 shrink-0 rounded-[3px] bg-current", dot)} />
        <span className="truncate">{name}</span>
      </span>
      {row.amounts.map((amount, i) => (
        <span key={i} role="cell" className="text-right font-normal text-ink-2">
          {amount === 0 ? "—" : formatCurrency(amount, currency)}
        </span>
      ))}
      <span role="cell" className={cn("text-right font-bold", total)}>
        {totalText}
      </span>
      <span role="cell" className="text-right font-normal text-ink-muted">
        {row.share === null ? "—" : `${row.share}%`}
      </span>
    </div>
  );
}
