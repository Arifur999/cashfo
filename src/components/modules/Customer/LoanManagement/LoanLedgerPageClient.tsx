"use client";

import { ChevronRight, Plus, Printer, ScrollText, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useOptimistic, useState, useTransition } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import DayInput from "@/components/smartly/form/DayInput";
import IconTile from "@/components/smartly/IconTile";
import { LIST_INSET, ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowLink, ListSummaryRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { usePageParam } from "@/hooks/usePageParam";
import type { Contact, LoanStatement } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import type { DateRangePreset } from "@/lib/customer/dateRangePresets";
import { DIRECTION_META, foldProfitRuns, isCancelledRow, LOAN_KIND_LABELS, loanDirection, statementEquation, statementPageEdges, statementProfit, statementTotals, type LedgerItem, type StatementRow } from "@/lib/customer/loanDisplay";
import { cancelledLabel } from "@/lib/customer/transactionDisplay";
import { reversalTitle } from "@/lib/customer/transactionRows";
import { getAppToday } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import { ContactPicker } from "./ContactPicker";
import { LoanContactDrawer } from "./LoanContactDrawer";
import { LoanEntryDrawer } from "./LoanEntryDrawer";
import { usePrinting } from "./usePrinting";

interface LoanLedgerPageClientProps {
  businessId: string;
  // Every loan contact, archived ones too (their statements stay).
  contacts: Contact[];
  currency: string;
  canManage: boolean;
  canTrade: boolean;
  range: DateRangePreset;
  selectedContactId: string;
  statement: LoanStatement | null;
  customFrom?: string;
  customTo?: string;
  // The period the statement covers, resolved on the server.
  periodFrom?: string;
  periodTo: string;
}

const PERIODS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-year", label: "This year" },
  { value: "last-year", label: "Last year" },
  { value: "custom", label: "Custom" },
];

const PATH = "/loan-management/ledger";
const LIST_ID = "loan-statement";
const PAGE_SIZE = 50;

// From xl the board's columns, sized to fit beside the sidebar at 1280:
// date, description (the reference under it), category, principal in and
// out, profit, balance. Below xl each row is the phone's two lines. From
// 1400 (the board's 1440) the reference has a column of its own.
const COLUMNS = "xl:grid-cols-[88px_minmax(0,1fr)_84px_104px_104px_100px_132px] min-[87.5rem]:grid-cols-[100px_100px_minmax(0,1fr)_96px_110px_110px_110px_140px] min-[87.5rem]:gap-x-3.5";
// The Reference column, from 1400.
const WIDE = "hidden min-[87.5rem]:block print:hidden";
// On paper (about 720px wide): no category column, tighter gaps.
const PRINT_COLUMNS = "print:grid-cols-[76px_minmax(0,1fr)_92px_92px_84px_116px] print:gap-x-3";
const GRID = cn(COLUMNS, PRINT_COLUMNS);
// A label across everything but the balance.
const BEFORE_BALANCE = "xl:col-span-6 min-[87.5rem]:col-span-7 print:col-span-5";

// Loan statement: one bank or person, the period, how the balance went
// from opening to closing, and every entry in between with the balance
// carried forward, 50 to a page. It loads as soon as someone is picked.
export function LoanLedgerPageClient({ businessId, contacts, currency, canManage, canTrade, range, selectedContactId, statement, customFrom, customTo, periodFrom, periodTo }: LoanLedgerPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const printing = usePrinting();
  const { page, setPage } = usePageParam();
  const [isPending, startTransition] = useTransition();
  // The filters as just picked, while the page loads them.
  const [shownContactId, setShownContactId] = useOptimistic(selectedContactId);
  const [shownRange, setShownRange] = useOptimistic(range);
  const [shownDates, setShownDates] = useOptimistic({ from: customFrom ?? "", to: customTo ?? "" });
  // Folded runs of profit rows the reader opened.
  const [unfolded, setUnfolded] = useState<Set<string>>(new Set());
  const [entryOpen, setEntryOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  // Admin > System > Feature Flags: pdf_export off hides Print / PDF.
  const pdfExportOn = useFeature("pdf_export");

  function navigate(next: { contactId?: string; range?: string; dateFrom?: string; dateTo?: string }, replace = false) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    // Another person or period starts on its first page.
    params.delete("page");
    const query = params.toString();
    const href = query ? `${PATH}?${query}` : PATH;
    startTransition(() => {
      if ("contactId" in next) setShownContactId(next.contactId ?? "");
      if ("range" in next) setShownRange((next.range as DateRangePreset | undefined) ?? "all");
      if ("dateFrom" in next || "dateTo" in next) setShownDates({ from: "dateFrom" in next ? (next.dateFrom ?? "") : shownDates.from, to: "dateTo" in next ? (next.dateTo ?? "") : shownDates.to });
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }

  function setRange(value: DateRangePreset) {
    navigate(value === "custom" ? { range: value } : { range: value === "all" ? undefined : value, dateFrom: undefined, dateTo: undefined });
  }

  const contact = contacts.find((c) => c.id === selectedContactId);
  // A statement only for someone on this page's list: an unknown or trade
  // contact in the address shows the pick screen, and nothing to print.
  const ready = !!statement && !!contact;
  const rows: StatementRow[] = statement?.rows ?? [];
  const opening = statement ? Number(statement.balanceBroughtForward) : 0;
  const closing = statement ? Number(statement.closingBalance) : 0;
  const { received, paid } = statementTotals(rows);
  const profit = statementProfit(rows);
  const hasProfit = profit.paid > 0 || profit.received > 0;
  const direction = loanDirection(closing);
  const meta = DIRECTION_META[direction];
  // The card's sum, read from one side so its figures add up even when the
  // balance was settled or changed sides in the period.
  const equation = statementEquation(opening, closing, received, paid);
  const owe = equation.side === "DENA";
  const activeContacts = contacts.filter((c) => c.status === "ACTIVE");
  const quickPicks = [...activeContacts].sort((a, b) => Math.abs(Number(b.currentBalance)) - Math.abs(Number(a.currentBalance))).slice(0, 8);

  // The screen shows a page, which the pager follows; paper gets the whole
  // period on one, with every run open.
  const paged = statementPageEdges(rows, page, PAGE_SIZE, opening);
  const view = printing ? statementPageEdges(rows, 1, Infinity, opening) : paged;
  const { firstPage, lastPage, broughtForward, carriedForward } = view;
  const items: LedgerItem[] = printing ? view.rows.map((row) => ({ kind: "row" as const, row })) : foldProfitRuns(view.rows);

  const amountWithSide = (balance: number) => {
    const side = loanDirection(balance);
    return side === "SETTLED" ? formatCurrency(0, currency, fmt) : `${formatCurrency(Math.abs(balance), currency, fmt)} ${t(DIRECTION_META[side].name)}`;
  };
  // A profit row's amount: paid, or received (with a plus).
  const profitCell = (paidAmount: number, receivedAmount: number) =>
    paidAmount ? <span className="text-warning">{formatCurrency(paidAmount, currency, fmt)}</span> : receivedAmount ? <span className="text-income">+ {formatCurrency(receivedAmount, currency, fmt)}</span> : <span className="text-ink-muted">—</span>;
  // A row's balance names its side in words, not by colour alone.
  const balanceOf = (value: string | number, quiet: boolean) => {
    const side = loanDirection(value);
    return (
      <span className={cn("inline-flex flex-wrap items-baseline justify-end gap-x-1", quiet ? "text-ink-muted" : DIRECTION_META[side].text)}>
        <span className={cn(!quiet && "font-semibold")}>{formatCurrency(Math.abs(Number(value)), currency, fmt)}</span>
        {side !== "SETTLED" && <span className="text-caption font-normal">{t(DIRECTION_META[side].name)}</span>}
      </span>
    );
  };
  const rowId = (row: StatementRow) => `${LIST_ID}-${row.transactionId}`;
  const periodText = periodFrom ? t("{from} – {to}", { from: formatDate(periodFrom, undefined, fmt), to: formatDate(periodTo, undefined, fmt) }) : t("All time, up to {date}", { date: formatDate(periodTo, undefined, fmt) });

  function toggle(key: string) {
    setUnfolded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function renderRow(row: StatementRow) {
    const isProfit = row.category === "Profit";
    const cancelled = isCancelledRow(row);
    const label = cancelledLabel({ status: row.status, reversalOfId: row.reversalOfId ?? null }) ?? (cancelled ? "Voided" : null);
    // A reversal is named for what it undid; an entry with no note for what it is.
    const written = row.reversalOfId ? reversalTitle(row.description) : row.description;
    const fallback = isProfit ? (Number(row.profitPaid ?? 0) > 0 ? "Paid profit" : "Received profit") : row.debit ? "Loan given / paid back" : "Loan taken / got back";
    const movement = isProfit ? profitCell(Number(row.profitPaid ?? 0), Number(row.profitReceived ?? 0)) : row.credit ? `+ ${formatCurrency(row.credit, currency, fmt)}` : row.debit ? `− ${formatCurrency(row.debit, currency, fmt)}` : "—";
    return (
      <ListRow key={row.transactionId} id={rowId(row)} columns={GRID} muted={cancelled} className="xl:min-h-13 print:break-inside-avoid">
        <ListCell className="hidden text-small text-ink-2 xl:block print:block">{formatDate(row.date, undefined, fmt)}</ListCell>
        <ListCell className={cn(WIDE, "truncate text-small", row.referenceNo ? "text-ink-2" : "text-ink-muted")}>{row.referenceNo || "—"}</ListCell>
        <ListCell className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <ListRowLink href={`/transactions/${row.transactionId}`} className={cn("truncate", written ? "text-ink" : "text-ink-2", cancelled && "line-through")}>
              {written || t(fallback)}
            </ListRowLink>
            {label && (
              <Chip tone="expense" size="sm" className="font-semibold">
                {t(label)}
              </Chip>
            )}
            {isProfit && (
              <Chip tone="warning" size="sm" className="font-bold xl:hidden print:hidden">
                {t("Profit")}
              </Chip>
            )}
          </span>
          <span className="truncate text-caption font-normal text-ink-muted xl:hidden print:hidden">{[formatDate(row.date, undefined, fmt), row.referenceNo].filter(Boolean).join(" · ")}</span>
          {row.referenceNo && <span className="hidden truncate text-caption font-normal text-ink-muted xl:block min-[87.5rem]:hidden print:block">{row.referenceNo}</span>}
        </ListCell>
        <ListCell className="hidden xl:block print:hidden">
          <Chip tone={isProfit ? "warning" : "neutral"} size="sm" className="font-bold">
            {t(isProfit ? "Profit" : "Principal")}
          </Chip>
        </ListCell>
        <ListCell align="end" className={cn("hidden tabular-nums xl:block print:block", row.credit ? "text-ink" : "text-ink-muted")}>
          {row.credit ? formatCurrency(row.credit, currency, fmt) : "—"}
        </ListCell>
        <ListCell align="end" className={cn("hidden tabular-nums xl:block print:block", row.debit ? "text-ink" : "text-ink-muted")}>
          {row.debit ? formatCurrency(row.debit, currency, fmt) : "—"}
        </ListCell>
        <ListCell align="end" className="hidden tabular-nums xl:block print:block">
          {profitCell(Number(row.profitPaid ?? 0), Number(row.profitReceived ?? 0))}
        </ListCell>
        {/* Phone: what moved, over the balance after it. */}
        <ListCell align="end" className="flex flex-col items-end gap-0.5 tabular-nums xl:hidden print:hidden">
          <span className={cn("font-semibold text-ink", cancelled && "line-through")}>{movement}</span>
          <span className="text-caption">{balanceOf(row.runningPrincipal, isProfit)}</span>
        </ListCell>
        {/* Profit leaves the balance where it was. */}
        <ListCell align="end" className="hidden justify-end tabular-nums xl:flex print:flex">
          {balanceOf(row.runningPrincipal, isProfit)}
        </ListCell>
      </ListRow>
    );
  }

  // A folded run of profit rows: one row on the board's amber band that
  // opens them in place, and stays above them to fold them again, so focus
  // never moves.
  function renderFold(item: Extract<LedgerItem, { kind: "more" }>) {
    const open = unfolded.has(item.key);
    const first = item.rows[0];
    const last = item.rows[item.rows.length - 1];
    const sum = statementProfit(item.rows);
    const count = formatCount(item.rows.length, fmt);
    const label = open ? t(item.paid ? "Hide {count} profit payments" : "Hide {count} profit received", { count }) : t(item.paid ? "{count} more profit payments" : "{count} more profit received", { count });
    const months = `${formatDate(first.date, "MMM", fmt)} – ${formatDate(last.date, "MMM", fmt)}`;
    return (
      <Fragment key={`fold-${item.key}`}>
        <div role="row" data-slot="list-row" className="border-divider [[data-slot=list-row]+&]:border-t">
          <div role="cell">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={open ? item.rows.map(rowId).join(" ") : undefined}
              onClick={() => toggle(item.key)}
              className={cn("grid min-h-13 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 bg-warning-50 py-2 text-left text-body tabular-nums transition-colors hover:bg-warning-soft/60 focus-visible:-outline-offset-2", LIST_INSET, COLUMNS)}
            >
              <span className="hidden text-small text-warning xl:block">{months}</span>
              <span className="hidden text-small text-ink-muted min-[87.5rem]:block">—</span>
              <span className="flex min-w-0 items-center gap-2 font-semibold text-warning">
                <ChevronRight className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", open && "rotate-90")} aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{label}</span>
                  <span className="truncate text-caption font-normal xl:hidden">{months}</span>
                </span>
              </span>
              <span className="hidden xl:block">
                <Chip tone="warning" size="sm" className="font-bold">
                  {t("Profit")}
                </Chip>
              </span>
              <span className="hidden text-right text-ink-muted xl:block">—</span>
              <span className="hidden text-right text-ink-muted xl:block">—</span>
              <span className="text-right">{profitCell(sum.paid, sum.received)}</span>
              <span className="hidden text-right text-ink-muted xl:block">{formatCurrency(Math.abs(Number(last.runningPrincipal)), currency, fmt)}</span>
            </button>
          </div>
        </div>
        {open && item.rows.map(renderRow)}
      </Fragment>
    );
  }

  const entriesLabel = t(rows.length === 1 ? "{count} entry" : "{count} entries", { count: formatCount(rows.length, fmt) });
  const profitBlock = (amount: number, months: number, way: "paid" | "received") => (
    <div className="flex flex-col gap-1">
      <span className="text-caption font-semibold">
        {way === "paid" ? t(months === 1 ? "Profit paid · {count} month" : "Profit paid · {count} months", { count: formatCount(months, fmt) }) : t(months === 1 ? "Profit received · {count} month" : "Profit received · {count} months", { count: formatCount(months, fmt) })}
      </span>
      <span className={cn("text-h2 font-bold tabular-nums", way === "paid" ? "text-warning" : "text-income")}>{formatCurrency(amount, currency, fmt)}</span>
      <span className="text-caption">{way === "paid" ? t("Counted as expense. Doesn't change what you owe.") : t("Counted as income. Doesn't change what they owe.")}</span>
    </div>
  );

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Loans")}
        tone="loans"
        title={t("Loan statement")}
        description={t("One bank or person, every entry, with the balance carried forward.")}
        actions={
          ((pdfExportOn && ready) || (canManage && activeContacts.length > 0)) && (
            <>
              {/* Only once there is a statement to print. */}
              {pdfExportOn && ready && (
                <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
                  <Printer className="text-ink-2" />
                  {t("Print / PDF")}
                </Button>
              )}
              {canManage && activeContacts.length > 0 && (
                <Button onClick={() => setEntryOpen(true)} className="print:hidden">
                  <Plus strokeWidth={2.5} className="size-4" />
                  {t("New entry")}
                </Button>
              )}
            </>
          )
        }
      />

      {/* The filters don't print; the paper says whose statement and when. */}
      {statement && contact && (
        <div className="hidden flex-col gap-0.5 print:flex">
          <p className="text-title font-bold text-ink">
            {contact.name} · {t(LOAN_KIND_LABELS[contact.type])}
          </p>
          <p className="text-small text-ink-2">{periodText}</p>
        </div>
      )}

      <Card padding="none" className="flex flex-col gap-4 px-5 py-4 md:flex-row md:flex-wrap md:items-end print:hidden">
        <div className="flex min-w-0 flex-col gap-2 md:min-w-72 md:flex-1">
          <label htmlFor="loan-contact" className="text-small font-medium text-ink-2">
            {t("Bank / person")}
          </label>
          <ContactPicker id="loan-contact" contacts={contacts} value={shownContactId} onChange={(id) => navigate({ contactId: id })} currency={currency} label={t("Bank / person")} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-small font-medium text-ink-2">{t("Period")}</span>
          <SegmentedControl options={PERIODS.map((period) => ({ value: period.value, label: t(period.label) }))} value={shownRange} onChange={setRange} label={t("Period")} size="lg" className="max-md:w-full max-md:overflow-x-auto" />
        </div>
        {shownRange === "custom" && (
          // Each date replaces the address rather than adding to it, so Back leaves the page, not each edit.
          <div className="flex items-center gap-2">
            <DayInput size="md" value={shownDates.from} onChange={(value) => navigate({ dateFrom: value }, true)} max={shownDates.to || getAppToday()} aria-label={t("From")} placeholder={t("From")} className="w-44" />
            <span aria-hidden="true" className="text-ink-muted">
              –
            </span>
            <DayInput size="md" value={shownDates.to} onChange={(value) => navigate({ dateTo: value }, true)} min={shownDates.from || undefined} max={getAppToday()} aria-label={t("To@@date")} placeholder={t("To@@date")} className="w-44" />
          </div>
        )}
        {isPending && <Loader size={18} label={t("Loading...")} className="md:mb-3" />}
      </Card>

      {!statement || !contact ? (
        <Card padding="none" className={cn("flex min-h-130 flex-col items-center justify-center gap-3 bg-fresh p-6 text-center transition-opacity md:p-10", isPending && "opacity-60")} aria-busy={isPending || undefined}>
          <IconTile tone="loans" size={48}>
            <ScrollText />
          </IconTile>
          {contacts.length === 0 ? (
            <>
              <h2 className="text-title font-bold text-ink">{t("No banks or people yet")}</h2>
              <p className="max-w-115 text-body text-ink-muted">{t("Add the people, banks and NGOs you lend to or borrow from, and their statements show here.")}</p>
              {canManage && (
                <Button onClick={() => setContactOpen(true)} className="mt-1">
                  <UserPlus />
                  {t("Add bank / person")}
                </Button>
              )}
            </>
          ) : (
            <>
              <h2 className="text-title font-bold text-ink">{t("Pick a bank or person to see their statement")}</h2>
              <p className="max-w-115 text-body leading-relaxed text-ink-muted">{t("You'll see the opening balance, every loan and repayment, and the running balance, ready to print.")}</p>
              {quickPicks.length > 0 && (
                <>
                  <span className="mt-4 text-caption font-semibold text-ink-muted">{t("People & banks")}</span>
                  {/* Centred under the heading however many there are, four to a row at xl. */}
                  <div className="flex w-full flex-wrap justify-center gap-3 xl:max-w-209">
                    {quickPicks.map((pick) => {
                      const side = DIRECTION_META[loanDirection(pick.currentBalance)];
                      return (
                        <button key={pick.id} type="button" onClick={() => navigate({ contactId: pick.id })} className="flex h-16 w-full min-w-0 items-center gap-3 rounded-md border border-line bg-surface px-4 text-left shadow-card transition-colors hover:border-line-strong sm:w-[calc(50%-6px)] xl:w-50">
                          <PersonAvatar name={pick.name} src={pick.photoUrl} kind={pick.type} size={30} />
                          <span className="flex min-w-0 flex-col gap-px">
                            <span className="truncate text-body font-semibold text-ink">{pick.name}</span>
                            <span className={cn("truncate text-caption font-normal tabular-nums", side.text)}>{amountWithSide(Number(pick.currentBalance))}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      ) : (
        <>
          <div className={cn("grid gap-4", hasProfit && "xl:grid-cols-[minmax(0,1fr)_280px]")}>
            <Card role="group" aria-label={t("Opening balance, plus what moved one way, minus what moved the other, equals the closing balance")} className="@container grid grid-cols-2 gap-3 md:flex md:items-stretch">
              {/* An opening on the other side counts as a minus. */}
              <EquationCell label={t("Opening")} value={equation.opening < 0 ? `− ${amountWithSide(opening)}` : amountWithSide(opening)} />
              <Operator>+</Operator>
              <EquationCell sign="+" spoken={t("plus")} label={owe ? t("Loan taken / got back") : t("Loan given / paid back")} value={formatCurrency(equation.raised, currency, fmt)} className={owe ? "text-expense" : "text-income"} />
              <Operator>−</Operator>
              <EquationCell sign="−" spoken={t("minus")} label={owe ? t("Loan given / paid back") : t("Loan taken / got back")} value={formatCurrency(equation.lowered, currency, fmt)} className="text-ink-muted" />
              <Operator equals>=</Operator>
              <div className={cn("col-span-2 flex min-w-0 flex-col gap-1 rounded-md px-4 py-2 md:-my-2 md:-mr-2.5 md:flex-[1.2]", meta.box)}>
                <span className={cn("text-caption font-semibold", meta.text)}>
                  <span aria-hidden="true" className="md:hidden">
                    ={" "}
                  </span>
                  <span className="sr-only">{t("equals")} </span>
                  {direction === "SETTLED" ? t("Settled") : `${t(meta.label)} · ${t(meta.name)}`}
                </span>
                <span className={cn(EQUATION_FIGURE, meta.text)}>{formatCurrency(equation.closing, currency, fmt)}</span>
              </div>
            </Card>
            {hasProfit && (
              <div className="flex flex-col justify-center gap-4 rounded-md border border-warning-line bg-warning-50 px-5 py-4 text-warning-ink">
                {profit.paid > 0 && profitBlock(profit.paid, profit.paidMonths, "paid")}
                {profit.received > 0 && profitBlock(profit.received, profit.receivedMonths, "received")}
              </div>
            )}
          </div>

          <ListCard
            id={LIST_ID}
            label={t("Loan statement")}
            busy={isPending}
            tableClassName={cn("transition-opacity", isPending && "opacity-60")}
            footer={
              <ListFooter>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <PersonAvatar name={contact.name} src={contact.photoUrl} kind={contact.type} size={28} />
                    <span className="truncate">
                      {contact.name} · {t(LOAN_KIND_LABELS[contact.type])}
                    </span>
                  </span>
                  <span className={cn(paged.totalPages > 1 && "hidden print:inline")}>{entriesLabel}</span>
                </div>
                {paged.totalPages > 1 && <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={PAGE_SIZE} onPageChange={setPage} focusTargetId={LIST_ID} className="print:hidden" />}
              </ListFooter>
            }
          >
            <ListHead columns={GRID} className="md:hidden xl:grid print:grid">
              <ListHeadCell>{t("Date")}</ListHeadCell>
              <ListHeadCell className={WIDE}>{t("Reference")}</ListHeadCell>
              <ListHeadCell>{t("Description")}</ListHeadCell>
              <ListHeadCell className="print:hidden">{t("Category")}</ListHeadCell>
              <ListHeadCell align="end">{t("Principal in")}</ListHeadCell>
              <ListHeadCell align="end">{t("Principal out")}</ListHeadCell>
              <ListHeadCell align="end">{t("Profit")}</ListHeadCell>
              <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
            </ListHead>
            {firstPage ? (
              <ListSummaryRow kind="opening" columns={GRID} className="text-body">
                <ListCell className={cn("font-semibold text-ink-2", BEFORE_BALANCE)}>
                  {t("Opening balance")}
                  {periodFrom && ` · ${formatDate(periodFrom, undefined, fmt)}`}
                </ListCell>
                <ListCell align="end" className={cn("font-semibold tabular-nums", DIRECTION_META[loanDirection(opening)].text)}>
                  {amountWithSide(opening)}
                </ListCell>
              </ListSummaryRow>
            ) : (
              <ListSummaryRow kind="brought-forward" columns={GRID} className="text-body">
                <ListCell className={cn("font-semibold text-ink-2", BEFORE_BALANCE)}>{t("Brought forward")}</ListCell>
                <ListCell align="end" className={cn("font-semibold tabular-nums", DIRECTION_META[loanDirection(broughtForward)].text)}>
                  {amountWithSide(broughtForward)}
                </ListCell>
              </ListSummaryRow>
            )}
            {rows.length === 0 && <ListEmpty title={t("No entries in this period.")} />}
            {items.map((item) => (item.kind === "more" ? renderFold(item) : renderRow(item.row)))}
            {lastPage ? (
              <ListSummaryRow kind="closing" columns={GRID} className="min-h-13 text-body font-semibold">
                <ListCell className="font-bold text-ink xl:col-span-3 min-[87.5rem]:col-span-4 print:col-span-2">
                  {t("Closing balance")} · {formatDate(periodTo, undefined, fmt)}
                </ListCell>
                <ListCell align="end" className="hidden text-ink tabular-nums xl:block print:block">
                  {formatCurrency(received, currency, fmt)}
                </ListCell>
                <ListCell align="end" className={cn("hidden tabular-nums xl:block print:block", paid ? "text-ink" : "text-ink-muted")}>
                  {formatCurrency(paid, currency, fmt)}
                </ListCell>
                <ListCell align="end" className="hidden flex-col items-end tabular-nums xl:flex print:flex">
                  {/* Both, when there was profit both ways. */}
                  {profit.paid > 0 && profitCell(profit.paid, 0)}
                  {profit.received > 0 && profitCell(0, profit.received)}
                  {!hasProfit && <span className="text-ink-muted">{formatCurrency(0, currency, fmt)}</span>}
                </ListCell>
                <ListCell align="end" className={cn("text-title font-bold tabular-nums", meta.text)}>
                  {amountWithSide(closing)}
                </ListCell>
              </ListSummaryRow>
            ) : (
              <ListSummaryRow kind="carried-forward" columns={GRID} className="text-body">
                <ListCell className={cn("font-semibold text-ink-2", BEFORE_BALANCE)}>{t("Carried forward")}</ListCell>
                <ListCell align="end" className={cn("font-semibold tabular-nums", DIRECTION_META[loanDirection(carriedForward)].text)}>
                  {amountWithSide(carriedForward)}
                </ListCell>
              </ListSummaryRow>
            )}
          </ListCard>
        </>
      )}

      <LoanEntryDrawer open={entryOpen} onClose={() => setEntryOpen(false)} businessId={businessId} contacts={activeContacts} currency={currency} initialContactId={selectedContactId || undefined} />
      <LoanContactDrawer open={contactOpen} onClose={() => setContactOpen(false)} businessId={businessId} editing={null} currency={currency} canTrade={canTrade} />
    </PageFrame>
  );
}

// 18px while the card is narrow (beside the profit card, or on a tablet),
// the board's 22px once it has the room; a figure too long for its cell
// wraps rather than running out of it.
const EQUATION_FIGURE = "min-w-0 text-h3 tabular-nums wrap-anywhere @[44rem]:text-h2";

// One term of the equation. On phones, where the operators between terms
// don't show, the sign leads the label; a screen reader hears it in words.
function EquationCell({ label, value, sign, spoken, className }: { label: string; value: string; sign?: string; spoken?: string; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 md:flex-1">
      <span className="text-caption font-normal text-ink-muted">
        {sign && (
          <span aria-hidden="true" className="md:hidden">
            {sign}{" "}
          </span>
        )}
        {spoken && <span className="sr-only">{spoken} </span>}
        {label}
      </span>
      <span className={cn(EQUATION_FIGURE, "text-ink", className)}>{value}</span>
    </div>
  );
}

function Operator({ equals = false, children }: { equals?: boolean; children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className={cn("hidden size-6.5 shrink-0 items-center justify-center self-center rounded-full text-body-lg font-semibold md:flex", equals ? "bg-emerald text-on-action" : "bg-surface-sunken text-ink-2")}>
      {children}
    </span>
  );
}
