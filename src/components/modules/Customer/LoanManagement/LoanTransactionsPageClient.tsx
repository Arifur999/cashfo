"use client";

import { CircleOff, Eye, HandCoins, Plus, Printer, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { VoidTransactionDialog } from "@/components/modules/Customer/Transactions/VoidTransactionDialog";
import Loader from "@/components/shared/Loader";
import AmountText from "@/components/smartly/AmountText";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import DayInput from "@/components/smartly/form/DayInput";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions, ListRowLink } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { usePageParam } from "@/hooks/usePageParam";
import type { Contact, Transaction } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import type { DateRangePreset } from "@/lib/customer/dateRangePresets";
import { DIRECTION_META, LOAN_ENTRY_META, loanPaymentRow, loanTotals } from "@/lib/customer/loanDisplay";
import { TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { getAppToday } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import { paginate } from "@/lib/table/paginate";
import { pageRange } from "@/lib/table/pageParams";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import { LoanEntryDrawer } from "./LoanEntryDrawer";
import { usePrinting } from "./usePrinting";

interface LoanTransactionsPageClientProps {
  businessId: string;
  transactions: Transaction[];
  // false when there were more than the page reads (see getAllTransactions).
  complete: boolean;
  // Every loan contact, archived ones too.
  loanContacts: Contact[];
  canManage: boolean;
  currency: string;
  range: DateRangePreset;
  selectedContactId: string;
  customFrom?: string;
  customTo?: string;
}

const PERIODS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
  { value: "last-year", label: "Last year" },
  { value: "custom", label: "Custom" },
];

// The board's All / Principal / Profit, kept in the URL with the page.
type Show = "all" | "principal" | "profit";
const SHOW_LABELS: Record<Show, string> = { all: "All", principal: "Principal", profit: "Profit" };
const readShow = (value: string | null): Show => (value === "principal" || value === "profit" ? value : "all");

const PATH = "/loan-management/transactions";
const LIST_ID = "loan-payments";
const PAGE_SIZE = 25;

// Below xl a row is two lines (who and what, then the date; the amount and,
// from md, its effect on the right), with the buttons beside them from md.
// From xl the board's columns, Category and Account folded under the entry
// so the table fits beside the sidebar at 1280.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_auto_auto] xl:grid-cols-[96px_minmax(160px,1fr)_minmax(160px,1.2fr)_128px_180px_80px]";
// On paper (about 720px wide): the same columns without the buttons.
const PRINT_COLUMNS = "print:grid-cols-[72px_minmax(0,1fr)_140px_100px_140px] print:gap-x-3";
// Back to the column's own place once the row has its columns.
const AT_XL = "xl:col-auto xl:row-auto print:col-auto print:row-auto";
// 36px, 44px under a finger; shown on hover only where there is one.
const ACTION = "flex size-9 items-center justify-center rounded-md bg-surface shadow-[0_0_0_1px_var(--line)] transition-opacity pointer-coarse:size-11 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 focus-visible:opacity-100";

// Loan payments: every loan given or taken and every repayment, with what
// each one did to the balance, and a void action on each standing entry.
export function LoanTransactionsPageClient({ businessId, transactions, complete, loanContacts, canManage, currency, range, selectedContactId, customFrom, customTo }: LoanTransactionsPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Admin > System > Feature Flags: pdf_export off hides Print.
  const pdfExportOn = useFeature("pdf_export");
  const printing = usePrinting();
  const { page, setPage } = usePageParam();
  const [isPending, startTransition] = useTransition();
  // The filters as just picked, while the page loads them.
  const [shownContactId, setShownContactId] = useOptimistic(selectedContactId);
  const [shownRange, setShownRange] = useOptimistic(range);
  const [shownDates, setShownDates] = useOptimistic({ from: customFrom ?? "", to: customTo ?? "" });
  const [voiding, setVoiding] = useState<Transaction | null>(null);

  // Add › Loan entry lands here with ?new=1: the form opens at once, and
  // the address forgets it, so a refresh or Back doesn't open it again.
  const wantsNew = searchParams.get("new") === "1";
  const [drawerOpen, setDrawerOpen] = useState(() => wantsNew && canManage);
  const [seenNew, setSeenNew] = useState(wantsNew);
  if (wantsNew !== seenNew) {
    setSeenNew(wantsNew);
    if (wantsNew && canManage) setDrawerOpen(true);
  }
  useEffect(() => {
    if (!wantsNew) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${PATH}?${query}` : PATH);
  }, [wantsNew, searchParams]);

  const show = readShow(searchParams.get("show"));
  const contactsById = new Map(loanContacts.map((contact) => [contact.id, contact]));
  const activeContacts = loanContacts.filter((contact) => contact.status === "ACTIVE");
  const archivedContacts = loanContacts.filter((contact) => contact.status === "ARCHIVED");
  const rows = transactions.map((transaction) => ({ transaction, ...loanPaymentRow(transaction, locale), contact: transaction.contactId ? contactsById.get(transaction.contactId) : undefined }));
  const filteredRows = show === "all" ? rows : rows.filter((row) => (show === "profit") === (row.profit !== null));
  // The tiles add up what the list shows: every page of it.
  const totals = loanTotals(filteredRows.map((row) => row.transaction));
  const paged = paginate(filteredRows, page, PAGE_SIZE);
  // Paper gets every row, not the page on screen.
  const listed = printing ? filteredRows : paged.rows;
  const filtered = range !== "all" || selectedContactId !== "" || show !== "all";

  function navigate(next: { contactId?: string; range?: string; dateFrom?: string; dateTo?: string; show?: string }, replace = false) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    // Another filter starts on its first page.
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

  // Shown at once: the rows are all here, so the address changes in place.
  function setShow(next: Show) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("show");
    else params.set("show", next);
    params.delete("page");
    const query = params.toString();
    window.history.pushState(null, "", query ? `${PATH}?${query}` : PATH);
  }

  const voidingRow = voiding ? loanPaymentRow(voiding, locale) : null;
  const voidingProfit = voidingRow?.profit ?? null;
  const voidingName = voiding ? (voiding.contact?.name ?? (voiding.contactId ? contactsById.get(voiding.contactId)?.name : undefined) ?? "—") : "—";
  const voidingWallet = voidingRow?.wallet ?? t("your wallet");

  const periodLabel =
    range === "custom"
      ? customFrom || customTo
        ? t("{from} – {to}", { from: customFrom ? formatDate(customFrom, undefined, locale) : "…", to: customTo ? formatDate(customTo, undefined, locale) : "…" })
        : t("All time")
      : t(PERIODS.find((period) => period.value === range)?.label ?? "All time");
  const printLine = [contactsById.get(selectedContactId)?.name ?? t("All banks & people"), show === "all" ? null : t(SHOW_LABELS[show]), periodLabel].filter(Boolean).join(" · ");
  const { first, last } = pageRange(paged.page, PAGE_SIZE, paged.total);
  const figure = (text: string) => <b className="font-semibold text-ink">{text}</b>;

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Loans")}
        tone="loans"
        title={t("Loan payments")}
        description={t("Every loan you gave or took, every repayment, and every profit payment.")}
        actions={
          <>
            {pdfExportOn && transactions.length > 0 && (
              <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
                <Printer className="text-ink-2" />
                {t("Print")}
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setDrawerOpen(true)} className="print:hidden">
                <Plus strokeWidth={2.5} className="size-4" />
                {t("New loan entry")}
              </Button>
            )}
          </>
        }
      />

      {!complete && (
        <Banner tone="warning" inline icon={<TriangleAlert />}>
          {t("Showing and totalling the latest 1,000 only -- pick a shorter range to see the rest.")}
        </Banner>
      )}

      <Card padding="none" className="grid grid-cols-2 xl:grid-cols-4">
        <TotalCell label={`${t("Money in@@loan")} · ${t("loans taken, money back")}`}>
          <AmountText value={totals.in} currency={currency} size="h2" tone={totals.in ? "income" : "neutral"} signed className={cn(TOTAL_FIGURE, !totals.in && "text-ink-muted")} />
        </TotalCell>
        <TotalCell label={`${t("Money out@@loan")} · ${t("loans given, paid back")}`} className="md:border-l">
          <AmountText value={-totals.out} currency={currency} size="h2" tone={totals.out ? "expense" : "neutral"} signed className={cn(TOTAL_FIGURE, !totals.out && "text-ink-muted")} />
        </TotalCell>
        <TotalCell label={`${t("Profit paid")} · ${t("counted as expense")}`} className="border-t xl:border-t-0 xl:border-l">
          <span className={cn(TOTAL_FIGURE, "text-h2 tabular-nums", totals.profitPaid ? "text-warning" : "text-ink-muted")}>{formatCurrency(totals.profitPaid, currency)}</span>
        </TotalCell>
        <TotalCell label={`${t("Profit received")} · ${t("counted as income")}`} className="border-t md:border-l xl:border-t-0">
          <span className={cn(TOTAL_FIGURE, "text-h2 tabular-nums", totals.profitReceived ? "text-income" : "text-ink-muted")}>{formatCurrency(totals.profitReceived, currency)}</span>
        </TotalCell>
      </Card>

      <ListCard
        id={LIST_ID}
        label={t("Loan payments")}
        busy={isPending}
        tableClassName={cn("transition-opacity", isPending && "opacity-60")}
        header={
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:px-6">
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <NativeSelect size="sm" value={shownContactId} onChange={(event) => navigate({ contactId: event.target.value || undefined })} aria-label={t("Bank / person")} frameClassName="max-md:flex-1" className="text-small">
                <option value="">{t("All banks & people")}</option>
                {activeContacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
                {archivedContacts.length > 0 && (
                  <optgroup label={t("Archived@@tab")}>
                    {archivedContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </NativeSelect>
              <SegmentedControl
                options={(["all", "principal", "profit"] as const).map((value) => ({ value, label: t(SHOW_LABELS[value]), dot: value === "profit" ? "var(--warning-fill)" : undefined }))}
                value={show}
                onChange={setShow}
                label={t("Kind")}
                size="coarse"
                // A phone: the two selects share a row, and this fills the one under them.
                className="max-md:order-last max-md:flex max-md:w-full max-md:[&>button]:flex-1"
              />
              <NativeSelect size="sm" value={shownRange} onChange={(event) => setRange(event.target.value as DateRangePreset)} aria-label={t("Period")} frameClassName="max-md:flex-1" className="text-small">
                {PERIODS.map((period) => (
                  <option key={period.value} value={period.value}>
                    {t(period.label)}
                  </option>
                ))}
              </NativeSelect>
              {shownRange === "custom" && (
                // Each date replaces the address rather than adding to it, so Back leaves the page, not each edit.
                <div className="flex items-center gap-2">
                  <DayInput size="sm" value={shownDates.from} onChange={(value) => navigate({ dateFrom: value }, true)} max={shownDates.to || getAppToday()} aria-label={t("From")} placeholder={t("From")} className="w-40 text-small" />
                  <span aria-hidden="true" className="text-ink-muted">
                    –
                  </span>
                  <DayInput size="sm" value={shownDates.to} onChange={(value) => navigate({ dateTo: value }, true)} min={shownDates.from || undefined} max={getAppToday()} aria-label={t("To@@date")} placeholder={t("To@@date")} className="w-40 text-small" />
                </div>
              )}
              {isPending && <Loader size={16} label={t("Loading...")} />}
            </div>
            {/* The filters don't print; this says whose entries and when. */}
            <p className="hidden text-small font-semibold text-ink print:block">{printLine}</p>
          </div>
        }
        footer={
          paged.total > 0 && (
            <ListFooter className="print:hidden">
              <Pagination
                page={paged.page}
                totalPages={paged.totalPages}
                total={paged.total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                focusTargetId={LIST_ID}
                summary={<p>{fillNodes(t("Showing {range} of {total}, newest first"), { range: figure(toLocaleDigits(`${formatNumber(first)}–${formatNumber(last)}`, locale)), total: figure(formatCount(paged.total, locale)) })}</p>}
              />
            </ListFooter>
          )
        }
      >
        {transactions.length === 0 && !filtered ? (
          <ListEmpty
            tone="loans"
            icon={<HandCoins />}
            title={t("No loan entry yet")}
            description={t("Record a loan you gave or took, or a repayment, and it shows up here.")}
            action={canManage && <Button onClick={() => setDrawerOpen(true)}>{t("New loan entry")}</Button>}
          />
        ) : filteredRows.length === 0 ? (
          // Filters that match nothing: say so, with the way back to everything.
          <ListEmpty
            tone="loans"
            icon={<HandCoins />}
            title={t("No entries match these filters")}
            description={t("Try another bank or person, or a longer period.")}
            action={
              <Button variant="secondary" onClick={() => navigate({ contactId: undefined, range: undefined, dateFrom: undefined, dateTo: undefined, show: undefined })}>
                {t("Show all entries")}
              </Button>
            }
          />
        ) : (
          <>
            <ListHead columns={cn(COLUMNS, PRINT_COLUMNS)} className="md:hidden xl:grid print:grid">
              <ListHeadCell>{t("Date")}</ListHeadCell>
              <ListHeadCell>{t("Bank / person")}</ListHeadCell>
              <ListHeadCell>{t("Entry")}</ListHeadCell>
              <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
              <ListHeadCell>{t("Effect on balance")}</ListHeadCell>
              <ListHeadCell className="print:hidden">
                <span className="sr-only">{t("Actions")}</span>
              </ListHeadCell>
            </ListHead>
            {listed.map(({ transaction, entry, profit, title, signedAmount, wallet, cancelled, contact }) => {
              const meta = entry ? LOAN_ENTRY_META[entry.kind] : null;
              const effect = meta ? DIRECTION_META[meta.effect] : null;
              const name = transaction.contact?.name ?? contact?.name ?? "—";
              const entryTitle = title ? t(title) : t(TRANSACTION_TYPE_LABELS[transaction.transactionType]);
              const cancelledChip = cancelled && (
                <Chip tone="expense" size="sm" className="font-semibold">
                  {t(cancelled)}
                </Chip>
              );
              return (
                <ListRow key={transaction.id} columns={cn(COLUMNS, PRINT_COLUMNS)} muted={!!cancelled} className="group print:break-inside-avoid">
                  {/* Below xl the date sits under the name, past the avatar. */}
                  <ListCell className={cn("col-start-1 row-start-2 text-caption text-ink-2 max-xl:pl-10.5 xl:text-small print:pl-0", AT_XL)}>{formatDate(transaction.transactionDate, undefined, locale)}</ListCell>
                  <ListCell className={cn("col-start-1 row-start-1 flex min-w-0 items-center gap-3", AT_XL)}>
                    <PersonAvatar name={name} src={contact?.photoUrl} kind={contact?.type} size={30} />
                    <span className="flex min-w-0 flex-col">
                      <ListRowLink href={`/transactions/${transaction.id}`} className="truncate font-medium text-ink">
                        {name}
                      </ListRowLink>
                      <span className="flex min-w-0 items-center gap-2 text-caption font-normal text-ink-muted xl:hidden print:hidden">
                        <span className="truncate">{entryTitle}</span>
                        {cancelledChip}
                      </span>
                    </span>
                  </ListCell>
                  <ListCell className="hidden min-w-0 flex-col gap-0.5 text-small text-ink-2 xl:flex print:flex">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{title ? t(title) : "—"}</span>
                      {cancelledChip}
                    </span>
                    <span className="flex min-w-0 items-center gap-2 text-caption text-ink-muted">
                      <Chip tone={profit ? "warning" : "neutral"} size="sm" className="font-bold">
                        {t(profit ? "Profit" : "Principal")}
                      </Chip>
                      <span className="truncate">{wallet ?? "—"}</span>
                    </span>
                  </ListCell>
                  <ListCell align="end" className={cn("col-start-2 row-start-1", AT_XL)}>
                    <AmountText value={signedAmount} currency={currency} size="sm" signed tone={cancelled ? "neutral" : "auto"} className={cn("font-semibold", cancelled && "text-ink-muted line-through")} />
                  </ListCell>
                  <ListCell className={cn("col-start-2 row-start-2 hidden flex-col items-end gap-px text-right text-caption md:flex xl:items-start xl:text-left print:flex print:items-start print:text-left", AT_XL)}>
                    {cancelled ? (
                      // A voided entry and its reversal moved nothing between them.
                      <>
                        <span className="font-semibold text-ink-2">{t("No change")}</span>
                        <span className="font-normal text-ink-muted">{t(cancelled)}</span>
                      </>
                    ) : profit ? (
                      <>
                        <span className="font-semibold text-ink-2">{t("No change")}</span>
                        <span className="max-w-full truncate font-normal text-ink-muted">
                          {t(profit.paid ? "Expense" : "Income")}
                          {profit.category ? ` · ${profit.category}` : ""}
                        </span>
                      </>
                    ) : meta && effect && entry ? (
                      <>
                        <span className={cn("font-semibold", effect.text)}>
                          {t(effect.name)} {meta.effectSign} {formatCurrency(entry.amount, currency)}
                        </span>
                        <span className="font-normal text-ink-muted">{t(meta.effectSub)}</span>
                      </>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </ListCell>
                  <ListRowActions className="hidden md:col-start-3 md:row-[1/span_2] md:flex xl:col-auto xl:row-auto print:hidden">
                    <Link href={`/transactions/${transaction.id}`} aria-label={t("View details")} title={t("View details")} className={cn(ACTION, "text-ink-2 hover:bg-surface-sunken")}>
                      <Eye className="size-4" aria-hidden="true" />
                    </Link>
                    {canManage && transaction.voidable && (
                      <button type="button" onClick={() => setVoiding(transaction)} aria-label={t("Void entry")} title={t("Void entry")} className={cn(ACTION, "text-expense hover:bg-expense-soft")}>
                        <CircleOff className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </ListRowActions>
                </ListRow>
              );
            })}
          </>
        )}
      </ListCard>

      <LoanEntryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} businessId={businessId} contacts={activeContacts} currency={currency} initialContactId={selectedContactId || undefined} />
      {voiding && voidingRow && (
        <VoidTransactionDialog
          open
          onClose={() => setVoiding(null)}
          businessId={businessId}
          transactionId={voiding.id}
          title={t("Entry")}
          heading={t("Void this entry?")}
          description={
            voidingProfit
              ? // Profit never moved the loan: only the wallet and the expense or income change back.
                voidingProfit.paid
                ? t("The money goes back to {wallet} and the expense is removed. The loan balance doesn't change.", { wallet: voidingWallet })
                : t("The money comes out of {wallet} again and the income is removed. The loan balance doesn't change.", { wallet: voidingWallet })
              : t("The balance goes back to what it was before this entry. It stays in your history, marked as voided.")
          }
          confirmLabel="Void entry"
          doneLabel="Entry voided"
          detail={
            <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-strip px-4 py-3 text-body">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-ink">{voidingName}</span>
                <span className="truncate text-caption font-normal text-ink-muted">{[voidingRow.title ? t(voidingRow.title) : null, voidingProfit?.category ?? null].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-px">
                <span className="font-bold text-ink tabular-nums">{formatCurrency(Math.abs(voidingRow.signedAmount), currency)}</span>
                <span className="text-caption font-normal text-ink-muted">{formatDate(voiding.transactionDate, undefined, locale)}</span>
              </span>
            </div>
          }
        />
      )}
    </PageFrame>
  );
}

// Two tiles to a row up to xl, so a crore still fits; never past the edge.
const TOTAL_FIGURE = "min-w-0 truncate";

function TotalCell({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 border-line px-4 py-3 md:px-5 md:py-4", className)}>
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      {children}
    </div>
  );
}
