"use client";

import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListTotalRow, STICKY_START } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, MonthlyBreakdown } from "@/lib/customer/api";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency, formatGrouped } from "@/lib/customer/currency";
import { type DayRange, monthName, percentLabel } from "@/lib/customer/insights";
import { REPORT_PERIOD_LABELS, REPORT_PERIODS, reportCsv, reportFileName, reportHref, type ReportPeriod, type ReportRow, reportRows, type ReportShow, type ReportView } from "@/lib/customer/reportTable";
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
  // The days the table covers, for the file name and the row links.
  range: DayRange;
  // "1 August – 21 October 2026": the same, for the caption.
  rangeLabel: string;
  // The income years' names ("2025–26"), for their options.
  periodSpans: Partial<Record<ReportPeriod, string>>;
}

// Every row takes the table's own columns (a subgrid), so the months line
// up and the table sets its own width from real minimums. It scrolls inside
// its card, both ways, which is what lets the head stick while the months
// scroll sideways on a phone. The edge cells carry the inset, so the name
// keeps it once its column sticks. A fixed line height, so a cell whose ৳
// falls back to a taller font doesn't sit higher than its neighbours.
const ROW = "col-span-full grid-cols-subgrid px-0 py-0 leading-5 md:px-0 md:py-0";
const TABLE =
  "grid grid-cols-(--report-cols) gap-x-3 md:gap-x-4 overflow-auto overscroll-x-contain max-h-[70dvh] md:grid-cols-(--report-cols-md) print:max-h-none print:overflow-visible print:grid-cols-(--report-cols-print)!";
// The name column stays put while the months scroll under it, on its row's
// own band, so nothing shows through.
const NAME_CELL = cn(STICKY_START, "flex items-center gap-3 print:static");
// Phones put Total and Share beside the name, where they show without a
// scroll, and the months after them; the cells reorder inside each row's
// subgrid, so the head and the rows still line up. Screen readers and print
// keep the source order: name, months, total, share.
const PHONE_SECOND = "max-md:order-1 print:order-none";
const PHONE_LAST = "max-md:order-2 print:order-none";
// The last column carries the right inset: Share from md up (and in print),
// the last month on a phone.
const SHARE_CELL = "max-md:print:pr-4 md:pr-6";
const LAST_MONTH_CELL = "max-md:pr-4 max-md:print:pr-0";
// Each select fits the option chosen (Chromium), not its longest one.
const SELECT = "font-semibold field-sizing-content max-md:h-11 pointer-coarse:h-11";

// Leads the CSV so Excel reads it as UTF-8 and keeps Bangla names whole.
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

const ROW_STYLE: Record<ReportRow["kind"], string> = {
  block: "bg-table-head font-bold",
  category: "bg-surface font-semibold",
  left: "min-h-14 bg-mint-50 font-bold text-brand-ink",
};

// Reports: every category, month by month, for a period and (optionally)
// one wallet, with the file downloads the tax folder wants.
export function ReportsPageClient({ currency, income, expense, wallets, period, walletId, show, range, rangeLabel, periodSpans }: ReportsPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  // Admin > System > Feature Flags: pdf_export off hides Print / PDF.
  const pdfExportOn = useFeature("pdf_export");
  const [isPending, startTransition] = useTransition();
  // The controls move at once; the table follows when the new render
  // arrives, dimmed until then.
  const [view, setView] = useOptimistic<ReportView, Partial<ReportView>>({ period, walletId, show }, (current, patch) => ({ ...current, ...patch }));
  const lang = displayLanguage(locale);
  const { months, rows } = reportRows(income, expense, show);
  const crossesYear = new Set(months.map((m) => m.slice(0, 4))).size > 1;
  const monthLabels = months.map((m) => monthName(m, locale, "short", crossesYear));
  const hasRows = rows.some((row) => row.kind === "category");
  const wallet = walletId ? wallets.find((w) => w.id === walletId) : undefined;
  const walletName = wallet ? accountDisplayName(wallet, lang) : null;
  const heading = show === "income" ? t("Income by category") : show === "expense" ? t("Expense by category") : t("Income and expense by category");
  const nothingToDownload = hasRows ? undefined : t("Nothing to download for this period");

  // Phones: a narrow name column, then Total and Share, then the months;
  // wider screens room for the name and the months first; print drops the
  // month minimums so a year fits a landscape page. The phone's first three
  // columns and their gaps come to 312px, inside a 360px phone's 326px
  // card, so Share never clips.
  const columnsOf = (name: string, month: string, total: string, share: string) => `${name} repeat(${months.length}, ${month}) ${total} ${share}`;
  const phoneColumnsOf = (name: string, month: string, total: string, share: string) => `${name} ${total} ${share} repeat(${months.length}, ${month})`;
  const columns = {
    "--report-cols": phoneColumnsOf("minmax(8.5rem,1.4fr)", "minmax(5.5rem,1fr)", "minmax(6.5rem,1.1fr)", "3rem"),
    "--report-cols-md": columnsOf("minmax(10rem,1.6fr)", "minmax(5.5rem,1fr)", "minmax(8rem,1.1fr)", "4rem"),
    "--report-cols-print": columnsOf("minmax(7rem,1.4fr)", "minmax(0,1fr)", "minmax(5.5rem,1.1fr)", "2.5rem"),
  } as React.CSSProperties;

  function update(patch: Partial<ReportView>) {
    const next = { ...view, ...patch };
    startTransition(() => {
      setView(patch);
      router.push(reportHref(next));
    });
  }

  const rowName = (row: ReportRow) => (row.kind === "category" ? row.name : t(row.name));

  // The transactions behind a category row: the same days and wallet.
  const rowHref = (row: ReportRow) => {
    if (row.kind !== "category" || !row.type) return undefined;
    const params = new URLSearchParams({ type: row.type, categoryId: row.name, dateFrom: range.dateFrom, dateTo: range.dateTo });
    if (walletId) params.set("accountId", walletId);
    return `/transactions?${params.toString()}`;
  };

  function downloadCsv() {
    const csv = reportCsv(months, rows, { category: t("Category"), total: t("Total"), share: t("Share"), months: monthLabels, names: rowName });
    const blob = new Blob([`${BYTE_ORDER_MARK}${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = reportFileName(range, walletName);
    link.click();
    URL.revokeObjectURL(url);
  }

  // Says which filter left the table empty.
  const emptyText = walletName
    ? show === "income"
      ? t("No income went through {wallet} in this period.", { wallet: walletName })
      : show === "expense"
        ? t("No expense went through {wallet} in this period.", { wallet: walletName })
        : t("Nothing went through {wallet} in this period.", { wallet: walletName })
    : show === "income"
      ? t("No income in this period.")
      : show === "expense"
        ? t("No expense in this period.")
        : t("No income or expense in this period.");

  return (
    <PageFrame className="gap-6">
      {/* Printed sideways, so a year of months fits the page. */}
      <style>{"@page { size: A4 landscape; }"}</style>
      <PageHeader
        eyebrow={t("Insights")}
        tone="insights"
        title={t("Reports")}
        description={t("Every category, month by month. Download it for your records or your tax file.")}
        looseDescription
        actions={
          // Why the buttons are disabled sits on their wrapper: a disabled
          // button takes no pointer, so the hover falls through to it.
          <div title={nothingToDownload} className="flex gap-3 print:hidden">
            <Button variant="secondary" size="lg" onClick={downloadCsv} disabled={!hasRows || isPending} aria-label={t("Download CSV")}>
              <Download />
              CSV
            </Button>
            {pdfExportOn && (
              <Button size="lg" onClick={() => window.print()} disabled={!hasRows || isPending}>
                <Printer />
                {t("Print / PDF")}
              </Button>
            )}
          </div>
        }
      />

      {/* Every control here stands 44px tall on a phone or under a finger. */}
      <Card padding="none" className="flex flex-wrap items-center gap-3 p-3 print:hidden">
        <NativeSelect size="sm" aria-label={t("Period")} value={view.period} onChange={(e) => update({ period: e.target.value as ReportPeriod })} className={SELECT}>
          {REPORT_PERIODS.map((value) => (
            <option key={value} value={value}>
              {t(REPORT_PERIOD_LABELS[value], { span: periodSpans[value] ?? "" })}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect size="sm" aria-label={t("Wallet")} value={view.walletId ?? ""} onChange={(e) => update({ walletId: e.target.value || null })} className={SELECT}>
          <option value="">{t("All wallets")}</option>
          {wallets.map((option) => (
            <option key={option.id} value={option.id}>
              {accountDisplayName(option, lang)}
            </option>
          ))}
        </NativeSelect>
        <SegmentedControl
          label={t("Show")}
          variant="pill"
          size="coarse"
          value={view.show}
          onChange={(value) => update({ show: value })}
          options={[
            { value: "both", label: t("Both") },
            { value: "income", label: t("Income") },
            // "@@report": the table beside it says খরচ, not the shared ব্যয়.
            { value: "expense", label: t("Expense@@report") },
          ]}
        />
        <span className="text-small text-ink-muted md:ml-auto">{t("Voided entries are left out")}</span>
      </Card>

      <ListCard
        label={[heading, rangeLabel, walletName].filter(Boolean).join(", ")}
        busy={isPending}
        // It scrolls both ways, so it joins the tab order for the arrow keys.
        scrollable={hasRows}
        header={
          // The days it covers on screen too: the month heads alone don't
          // say that October runs only to the 21st.
          <div className="flex flex-col gap-0.5 border-b border-line px-4 pt-5 pb-3 md:px-6">
            <h2 className="text-h3 text-ink">{heading}</h2>
            <span className="text-small text-ink-muted">{[rangeLabel, walletName].filter(Boolean).join(" · ")}</span>
            {/* On a phone the months start past the card's edge. */}
            {hasRows && <span className="text-caption text-ink-faint md:hidden print:hidden">{t("Swipe sideways for each month")}</span>}
          </div>
        }
        tableStyle={hasRows ? columns : undefined}
        tableClassName={hasRows ? TABLE : undefined}
        className={cn("transition-opacity motion-reduce:transition-none", isPending && "opacity-60")}
      >
        {hasRows ? (
          <>
            <ListHead columns={ROW} showOnPhone sticky>
              <ListHeadCell className={NAME_CELL}>{t("Category")}</ListHeadCell>
              {monthLabels.map((label, i) => (
                <ListHeadCell key={months[i]} align="end" className={cn(PHONE_LAST, i === months.length - 1 && LAST_MONTH_CELL)}>
                  {label}
                </ListHeadCell>
              ))}
              <ListHeadCell align="end" className={PHONE_SECOND}>
                {t("Total")}
              </ListHeadCell>
              <ListHeadCell align="end" className={cn(PHONE_SECOND, SHARE_CELL)}>
                {t("Share")}
              </ListHeadCell>
            </ListHead>
            {rows.map((row) => {
              const href = rowHref(row);
              return <ReportLine key={`${row.kind}:${row.type}:${row.name}`} row={row} name={rowName(row)} currency={currency} href={href} onOpen={href ? () => router.push(href) : undefined} />;
            })}
          </>
        ) : (
          <ListEmpty
            title={
              <>
                {emptyText}
                {walletName && (
                  <>
                    {" "}
                    <Button variant="link" onClick={() => update({ walletId: null })} className="h-auto min-h-11 px-0 align-middle">
                      {t("Show all wallets")}
                    </Button>
                  </>
                )}
              </>
            }
          />
        )}
      </ListCard>
    </PageFrame>
  );
}

// One line of the table. A category opens its transactions: the name is the
// link (keyboard, middle-click), the rest of the row follows it for the
// pointer.
function ReportLine({ row, name, currency, href, onOpen }: { row: ReportRow; name: string; currency: string; href?: string; onOpen?: () => void }) {
  const { locale } = useLocale();
  const lastMonth = row.amounts.length - 1;
  const dot = row.kind === "category" ? categoryTone(row.color).fg : row.type === "INCOME" ? "text-emerald" : row.type === "EXPENSE" ? "text-expense-fill" : "text-mint-300";
  // A Left over below zero is red, never the brand's green.
  const total = row.kind === "block" ? (row.type === "INCOME" ? "text-income" : "text-expense") : row.kind === "left" ? (row.total < 0 ? "text-expense" : "text-brand-ink") : "text-ink";
  const totalText = row.kind === "block" ? `${row.type === "INCOME" ? "+" : "−"} ${formatCurrency(row.total, currency, locale)}` : formatCurrency(row.total, currency, locale);
  const cells = (
    <>
      <ListCell className={NAME_CELL} title={name}>
        <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-[3px] bg-current", dot)} />
        {href ? (
          <Link href={href} className="min-w-0 truncate underline-offset-4 hover:underline">
            {name}
          </Link>
        ) : (
          <span className="min-w-0 truncate">{name}</span>
        )}
      </ListCell>
      {row.amounts.map((amount, i) => (
        <ListCell key={i} align="end" className={cn("whitespace-nowrap font-normal print:text-caption", PHONE_LAST, i === lastMonth && LAST_MONTH_CELL, row.kind === "left" && amount < 0 ? "text-expense" : "text-ink-2")}>
          {amount === 0 ? "—" : formatGrouped(amount, currency, locale)}
        </ListCell>
      ))}
      <ListCell align="end" className={cn("whitespace-nowrap font-bold print:text-small", PHONE_SECOND, total)}>
        {totalText}
      </ListCell>
      <ListCell align="end" className={cn("whitespace-nowrap font-normal text-ink-muted print:text-caption", PHONE_SECOND, SHARE_CELL)}>
        {row.share === null ? "—" : percentLabel(row.share, locale)}
      </ListCell>
    </>
  );
  if (row.kind === "left") {
    return (
      <ListTotalRow columns={ROW} className={cn("tabular-nums", ROW_STYLE.left)}>
        {cells}
      </ListTotalRow>
    );
  }
  return (
    <ListRow columns={ROW} density={row.kind === "block" ? "regular" : "dense"} onClick={onOpen} className={cn("tabular-nums", ROW_STYLE[row.kind])}>
      {cells}
    </ListRow>
  );
}
