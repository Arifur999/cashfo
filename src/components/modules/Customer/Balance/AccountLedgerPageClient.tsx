"use client";

import { ArrowLeft, Printer, ScrollText } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createElement, useState } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowLink, ListSummaryRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { accountDisplayName, balanceText } from "@/lib/customer/accountDisplay";
import type { Account, AccountLedger, AccountSummary, LanguagePreference } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import type { DateRangePreset } from "@/lib/customer/dateRangePresets";
import { isSettledDay, LEDGER_TYPE_TONE, ledgerDirection, periodText, readsAsMoney, statementBackLabel, type StatementLine, statementPage, transactionHref, voidedNet } from "@/lib/customer/ledger";
import { cancelledLabel, TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { walletIcon, walletPalette } from "@/lib/customer/walletVisuals";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { pageHref } from "@/lib/table/pageParams";
import { cn } from "@/lib/utils";
import { AccountPicker } from "./AccountPicker";

interface AccountLedgerPageClientProps {
  wallets: Account[];
  others: Account[];
  account: Account | null;
  ledger: AccountLedger | null;
  summary: AccountSummary | null;
  preferredLanguage: LanguagePreference;
  currency: string;
  accountId: string;
  range: DateRangePreset;
  customFrom?: string;
  customTo?: string;
  // The period resolved on the server: "This month" is its first day to today.
  periodFrom?: string;
  periodTo?: string;
  // Today in the platform timezone, for the printed copy.
  today: string;
  // The page the statement was opened from (?from=, a path on this site),
  // for a Back link to it: Savings summary's rows open their wallet here.
  backHref?: string | null;
}

const PERIODS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
  { value: "custom", label: "Custom" },
];

// One grid for the heads, the rows and the balance lines. Phones scroll it
// sideways, as before. Paper gets narrower columns and 12px type, so an A4
// page holds every column instead of cutting off Out and Balance.
const COLUMNS =
  "grid-cols-[36px_104px_96px_104px_minmax(0,1fr)_112px_112px_124px] min-w-240 print:min-w-0 print:grid-cols-[24px_76px_72px_64px_minmax(0,1fr)_88px_88px_96px] print:gap-x-2 print:text-caption";
const ROW = "tabular-nums print:min-h-0 print:py-1";
// One half of a void (the voided entry, or the reversal that undid it) is
// set back as a whole: every cell fades, the chips and figures with it.
// A faded cell is a layer of its own that would cover the row's stretched
// link, so the link's cell is lifted above them (z-index works on a grid
// item without moving the link's containing block off the row).
const CANCELLED_ROW = "[&>[role=cell]:not([data-slot=list-row-actions])]:grayscale [&>[role=cell]:has([data-slot=list-row-link])]:z-1";

// Statement: one account, the period, the equation from its opening balance
// to its closing one, and every movement in between with a running balance,
// 50 to a page.
export function AccountLedgerPageClient({ wallets, others, account, ledger, summary, preferredLanguage, currency, accountId, range, customFrom, customTo, periodFrom, periodTo, today, backHref }: AccountLedgerPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Admin > System > Feature Flags: pdf_export off hides Print / PDF.
  const pdfExportOn = useFeature("pdf_export");

  // The custom days as typed, loaded once each is a whole date.
  const [draft, setDraft] = useState({ from: customFrom ?? "", to: customTo ?? "" });
  const [loaded, setLoaded] = useState({ from: customFrom, to: customTo });
  // Only the side the URL changed is reset: committing one day must not
  // wipe the other while it is still being typed.
  if (loaded.from !== customFrom || loaded.to !== customTo) {
    setLoaded({ from: customFrom, to: customTo });
    setDraft((current) => ({
      from: loaded.from !== customFrom ? (customFrom ?? "") : current.from,
      to: loaded.to !== customTo ? (customTo ?? "") : current.to,
    }));
  }

  function hrefWith(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  // Another account or period is a step Back can undo.
  function updateParams(next: Record<string, string | undefined>) {
    router.push(hrefWith(next));
  }

  function setRange(value: DateRangePreset) {
    updateParams(value === "custom" ? { range: value } : { range: value === "all" ? undefined : value, dateFrom: undefined, dateTo: undefined });
  }

  // A custom day replaces the URL rather than adding to the history, and
  // only once it's a whole date (or cleared): typing a year no longer loads
  // four statements for 0002, 0020 and 0202.
  function commitDay(key: "dateFrom" | "dateTo", value: string) {
    if (value && !isSettledDay(value)) return;
    if ((value || undefined) === (key === "dateFrom" ? customFrom : customTo)) return;
    router.replace(hrefWith({ [key]: value || undefined }), { scroll: false });
  }

  function typeDay(side: "from" | "to", value: string) {
    setDraft((current) => ({ ...current, [side]: value }));
    if (isSettledDay(value)) commitDay(side === "from" ? "dateFrom" : "dateTo", value);
  }

  const ready = account && ledger && summary;
  const money = account ? readsAsMoney(account) : true;
  const lines = ledger ? statementPage(ledger) : null;
  // Only a backend with page balances sends the period's true closing; an
  // older one's is the page's own, which no equation could match.
  const residual = ledger && summary && lines?.exact ? voidedNet(ledger, summary) : 0;
  const adjustment = summary ? Number(summary.adjustment) : 0;
  // Transfers only ever move money wallets; another account shows the term
  // only if it somehow has some.
  const showTransfers = money || adjustment !== 0;
  // Four terms fit one line on a wide screen; five keep the grid.
  const oneLine = 3 + (showTransfers ? 1 : 0) + (residual !== 0 ? 1 : 0) <= 4;
  const openingLabel = periodFrom ? t("Balance on {date}", { date: formatDate(periodFrom, undefined, locale) }) : t("Opening balance");
  const here = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const paged = ledger ? ledger.meta.totalPages > 1 : false;

  const lineText = (line: StatementLine): { label: string; note?: string } => {
    switch (line.kind) {
      case "opening":
        return { label: openingLabel };
      case "brought-forward":
        return { label: t("Brought forward"), note: t("From the pages before") };
      case "carried-forward":
        return { label: t("Carried forward"), note: t("To the next page") };
      default:
        // The rows add up to the closing on their own. The note says how
        // much of it comes from voids or edits split across two periods,
        // which the equation above shows as a term of its own.
        return {
          label: t("Closing balance"),
          note: residual !== 0 ? t("Includes {amount} from voids or edits whose other half is in another period", { amount: formatSignedCurrency(residual, currency, locale) }) : undefined,
        };
    }
  };

  return (
    <PageFrame className="gap-5">
      {backHref && (
        <Link href={backHref} className="-mb-2 inline-flex items-center gap-2 self-start text-small font-semibold text-emerald hover:text-emerald-hover print:hidden">
          <ArrowLeft className="size-3.75" aria-hidden="true" />
          {t(statementBackLabel(backHref))}
        </Link>
      )}
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Wallets")}`}
        title={t("Statement")}
        description={t("Every movement through one account, with a running balance.")}
        actions={
          pdfExportOn &&
          ready && (
            <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
              <Printer className="size-4 text-ink-2" />
              {t("Print / PDF")}
            </Button>
          )
        }
      />

      {/* On paper the filters are gone, so this line says what was printed. */}
      {ready && (
        <p className="hidden text-small text-ink-2 print:block">
          <span className="font-semibold text-ink">{accountDisplayName(account, preferredLanguage)}</span>
          {` · ${periodText(t, periodFrom, periodTo, locale)} · ${t("Printed {date}", { date: formatDate(today, undefined, locale) })}`}
          {paged && ` · ${t("Page {page} of {total}", { page: formatCount(ledger.meta.page, locale), total: formatCount(ledger.meta.totalPages, locale) })}`}
        </p>
      )}

      <Card padding="none" className="flex flex-col gap-4 px-5 py-4 md:flex-row md:flex-wrap md:items-end print:hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:min-w-72">
          <label id="ledger-account-label" htmlFor="ledger-account" className="text-small leading-[normal] font-medium text-ink-2">
            {t("Account")}
          </label>
          <AccountPicker id="ledger-account" labelId="ledger-account-label" wallets={wallets} others={others} value={accountId} onChange={(id) => updateParams({ accountId: id })} preferredLanguage={preferredLanguage} currency={currency} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-small leading-[normal] font-medium text-ink-2">{t("Period")}</span>
          <SegmentedControl options={PERIODS.map((period) => ({ value: period.value, label: t(period.label) }))} value={range} onChange={setRange} label={t("Period")} size="lg" className="max-md:grid max-md:w-full max-md:grid-cols-3" />
        </div>
        {range === "custom" && (
          // A line of its own, so the account field keeps its room.
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:max-w-120 md:basis-full">
            <Input
              size="md"
              type="date"
              value={draft.from}
              onChange={(event) => typeDay("from", event.target.value)}
              onBlur={() => commitDay("dateFrom", draft.from)}
              onKeyDown={(event) => event.key === "Enter" && commitDay("dateFrom", draft.from)}
              aria-label={t("From")}
              max={draft.to || undefined}
              frameClassName="w-full min-w-0"
            />
            <span className="text-small text-ink-muted">{t("to")}</span>
            <Input
              size="md"
              type="date"
              value={draft.to}
              onChange={(event) => typeDay("to", event.target.value)}
              onBlur={() => commitDay("dateTo", draft.to)}
              onKeyDown={(event) => event.key === "Enter" && commitDay("dateTo", draft.to)}
              aria-label={t("To@@date")}
              min={draft.from || undefined}
              frameClassName="w-full min-w-0"
            />
          </div>
        )}
      </Card>

      {!ready || !lines ? (
        <Card padding="none" className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-lg bg-mint-50 text-emerald">
            <ScrollText className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-2 text-h3 leading-[normal] tracking-normal text-ink">{t("Pick an account to see its statement")}</h2>
          <p className="max-w-115 text-body leading-[1.55] text-ink-muted">{t("You'll see its opening balance, every movement and the running balance, ready to print.")}</p>
          {wallets.length > 0 && (
            <>
              <span className="mt-4 text-caption leading-[normal] font-semibold text-ink-muted">{t("Your wallets")}</span>
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:w-auto md:grid-cols-4">
                {wallets.map((wallet, index) => (
                  <button key={wallet.id} type="button" onClick={() => updateParams({ accountId: wallet.id })} className="flex h-16 items-center gap-3 rounded-md border border-line bg-surface px-4 text-left shadow-card transition-colors hover:border-line-strong md:w-50">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", walletPalette(index).tile)}>{createElement(walletIcon(wallet), { "aria-hidden": true })}</span>
                    <span className="flex min-w-0 flex-col gap-px">
                      <span className="truncate text-body leading-[normal] font-semibold text-ink">{accountDisplayName(wallet, preferredLanguage)}</span>
                      <span className={cn("text-caption leading-[normal] font-normal tabular-nums", Number(wallet.currentBalance) < 0 ? "text-expense" : "text-ink-muted")}>{balanceText(wallet.currentBalance, currency, locale)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          <span className="mt-2 text-caption leading-[normal] font-normal text-ink-muted">{t("Income, expense and other accounts are in the search above.")}</span>
        </Card>
      ) : (
        <>
          <Card role="group" aria-label={t("From the opening balance to the closing balance")} className={cn("grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3", oneLine && "xl:flex xl:items-stretch xl:gap-3")}>
            <EquationCell oneLine={oneLine} label={openingLabel} value={balanceText(ledger.balanceBroughtForward, currency, locale)} />
            {oneLine && <Operator>+</Operator>}
            <EquationCell oneLine={oneLine} op="+" spoken={t("plus@@equation")} label={money ? t("Money in@@wallet") : t("Increase@@statement")} value={formatCurrency(summary.totalIn, currency, locale)} className={money ? "text-income" : undefined} />
            {oneLine && <Operator>−</Operator>}
            <EquationCell oneLine={oneLine} op="−" spoken={t("minus@@equation")} label={money ? t("Money out@@wallet") : t("Decrease@@statement")} value={formatCurrency(summary.totalOut, currency, locale)} className={money ? "text-expense" : undefined} />
            {showTransfers && (
              <>
                {oneLine && <Operator>±</Operator>}
                {/* Signed figures: the sign says which way, so no spoken operator. */}
                <EquationCell oneLine={oneLine} op="±" label={t("Transfers & savings")} value={formatSignedCurrency(adjustment, currency, locale)} className="text-info" />
              </>
            )}
            {residual !== 0 && (
              <>
                {oneLine && <Operator>±</Operator>}
                <EquationCell oneLine={oneLine} op="±" label={t("Voided & reversed")} value={formatSignedCurrency(residual, currency, locale)} note={t("From a void or edit whose other half is in another period")} className="text-ink-2" />
              </>
            )}
            {oneLine && <Operator equals>=</Operator>}
            <div className={cn("col-span-full flex min-w-0 flex-col gap-1 rounded-md bg-mint-50 px-4 py-2", oneLine && "xl:col-auto xl:-my-2 xl:-mr-2.5 xl:flex-[1.2]")}>
              <span className="text-caption font-semibold text-emerald">
                <span className="sr-only">{t("equals@@equation")} </span>
                {t("Closing balance")}
              </span>
              <span className={cn("text-ink tabular-nums wrap-anywhere", oneLine ? "text-h3 sm:text-h2 xl:text-h3 2xl:text-h2" : "text-h3 sm:text-h2")}>{balanceText(ledger.closingBalance, currency, locale)}</span>
            </div>
          </Card>

          <ListCard
            id="statement-list"
            label={t("Statement")}
            scrollable
            tableClassName="overflow-x-auto print:overflow-visible"
            footer={
              ledger.meta.total > 0 && (
                <ListFooter className="print:hidden">
                  <Pagination page={ledger.meta.page} totalPages={ledger.meta.totalPages} total={ledger.meta.total} pageSize={ledger.meta.limit} hrefFor={(target) => pageHref(pathname, searchParams, target)} focusTargetId="statement-list" />
                </ListFooter>
              )
            }
          >
            <ListHead showOnPhone columns={COLUMNS}>
              <ListHeadCell>#</ListHeadCell>
              <ListHeadCell>{t("Date")}</ListHeadCell>
              <ListHeadCell>{t("Type")}</ListHeadCell>
              <ListHeadCell>{t("Reference")}</ListHeadCell>
              <ListHeadCell>{t("Description")}</ListHeadCell>
              <ListHeadCell align="end">{money ? t("In") : t("Increase@@statement")}</ListHeadCell>
              <ListHeadCell align="end">{money ? t("Out") : t("Decrease@@statement")}</ListHeadCell>
              <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
            </ListHead>
            <BalanceLine kind={lines.top.kind} {...lineText(lines.top)} value={balanceText(lines.top.balance, currency, locale)} />
            {ledger.entries.length === 0 && <ListEmpty title={t("No activity in this range.")} />}
            {ledger.entries.map((row, index) => {
              const direction = ledgerDirection(row.entryType, account.accountType);
              // A voided entry and the reversal that undid it both stay in
              // the running balance, muted and struck through, each with its
              // note, as the Transfer list shows them.
              const cancelled = cancelledLabel({ status: row.transactionStatus, reversalOfId: row.reversalOfId ?? null });
              const voided = cancelled !== null;
              // A transfer moves money between the customer's own wallets:
              // blue either way, never expense red. Other accounts only go
              // up or down, so their figures stay in ink.
              const tone = !money ? "text-ink" : row.transactionType === "TRANSFER" ? "text-info" : direction === "in" ? "text-income" : "text-expense";
              const amount = (side: "in" | "out") =>
                direction === side ? (
                  <ListCell align="end" className={cn(tone, voided && "line-through")}>
                    {formatCurrency(row.amount, currency, locale)}
                  </ListCell>
                ) : (
                  <ListCell align="end" className="text-ink-muted">
                    —
                  </ListCell>
                );
              return (
                <ListRow key={row.entryId} columns={COLUMNS} muted={voided} className={cn(ROW, voided && CANCELLED_ROW)}>
                  <ListCell className="text-ink-muted">{formatCount(lines.firstRow + index, locale)}</ListCell>
                  <ListCell className="text-ink-2">{formatDate(row.date, undefined, locale)}</ListCell>
                  <ListCell>
                    <Chip tone={LEDGER_TYPE_TONE[row.transactionType]} size="sm" className="font-semibold">
                      {t(TRANSACTION_TYPE_LABELS[row.transactionType])}
                    </Chip>
                  </ListCell>
                  <ListCell className={cn("truncate text-small print:text-caption", row.referenceNo ? "text-ink-2" : "text-ink-muted")}>{row.referenceNo ?? "—"}</ListCell>
                  <ListCell className="flex items-center gap-2">
                    <ListRowLink href={transactionHref(row.transactionId, here)} aria-label={row.description ? undefined : t("View details")} className={cn("truncate print:whitespace-normal", voided && "line-through")}>
                      {row.description ?? "—"}
                    </ListRowLink>
                    {cancelled && (
                      <Chip tone="expense" size="sm" className="font-semibold">
                        {t(cancelled)}
                      </Chip>
                    )}
                  </ListCell>
                  {amount("in")}
                  {amount("out")}
                  <ListCell align="end" className="font-semibold">
                    {balanceText(row.runningBalance, currency, locale)}
                  </ListCell>
                </ListRow>
              );
            })}
            <BalanceLine kind={lines.bottom.kind} {...lineText(lines.bottom)} value={balanceText(lines.bottom.balance, currency, locale)} strong={lines.bottom.kind === "closing"} />
          </ListCard>
        </>
      )}
    </PageFrame>
  );
}

interface BalanceLineProps {
  kind: StatementLine["kind"];
  label: string;
  note?: string;
  value: string;
  // The period's closing, set like a total.
  strong?: boolean;
}

// A balance line on the table-head band: the opening or brought-forward
// figure above the rows, carried forward or closing below them, under the
// Balance column.
function BalanceLine({ kind, label, note, value, strong = false }: BalanceLineProps) {
  return (
    <ListSummaryRow kind={kind} columns={COLUMNS} className="min-h-12 text-body print:min-h-0">
      <ListCell aria-colspan={7} className="col-span-7 flex flex-col">
        <span className={cn("font-semibold", strong ? "font-bold text-ink" : "text-ink-2")}>{label}</span>
        {note && <span className="text-caption text-ink-muted">{note}</span>}
      </ListCell>
      <ListCell align="end" className={cn("font-semibold text-ink tabular-nums", strong && "text-title font-bold print:text-small")}>
        {value}
      </ListCell>
    </ListSummaryRow>
  );
}

interface EquationCellProps {
  label: string;
  value: string;
  // The operator before the term, drawn beside the label while the terms
  // sit in a grid (the one-line equation draws it between the terms).
  op?: string;
  // The operator as a screen reader says it, where the figure has no sign.
  spoken?: string;
  // A line under the figure.
  note?: string;
  // The equation runs on one line from xl (see oneLine above).
  oneLine: boolean;
  className?: string;
}

function EquationCell({ label, value, op, spoken, note, oneLine, className }: EquationCellProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", oneLine && "xl:flex-1")}>
      <span className="flex items-center gap-1.5 text-caption font-normal text-ink-muted">
        {op && (
          <span aria-hidden="true" className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-full bg-surface-sunken font-semibold text-ink-2", oneLine && "xl:hidden")}>
            {op}
          </span>
        )}
        <span>
          {spoken && <span className="sr-only">{spoken} </span>}
          {label}
        </span>
      </span>
      <span className={cn("text-ink tabular-nums wrap-anywhere", oneLine ? "text-h3 sm:text-h2 xl:text-h3 2xl:text-h2" : "text-h3 sm:text-h2", className)}>{value}</span>
      {note && <span className="text-caption text-ink-muted">{note}</span>}
    </div>
  );
}

// The round operator between two terms of the one-line equation.
function Operator({ equals = false, children }: { equals?: boolean; children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className={cn("hidden size-6.5 shrink-0 items-center justify-center self-center rounded-full text-body-lg font-semibold xl:flex", equals ? "bg-emerald text-on-action" : "bg-surface-sunken text-ink-2")}>
      {children}
    </span>
  );
}
