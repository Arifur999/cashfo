"use client";

import { HandCoins, Pencil, Plus, Printer, Search, Trash2, TriangleAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import { VoidTransactionDialog } from "@/components/modules/Customer/Transactions/VoidTransactionDialog";
import Loader from "@/components/shared/Loader";
import AmountText from "@/components/smartly/AmountText";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import DayInput from "@/components/smartly/form/DayInput";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions, ListRowLink } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import Pagination from "@/components/smartly/Pagination";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { usePageParam } from "@/hooks/usePageParam";
import type { Contact, Transaction } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import type { DateRangePreset } from "@/lib/customer/dateRangePresets";
import { DIRECTION_META, loanDirection, loanEditOf, loanPaymentRow, loanTotals, type LoanEdit } from "@/lib/customer/loanDisplay";
import { toEnglishDigits } from "@/lib/customer/money";
import { TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { getAppToday } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import { paginate } from "@/lib/table/paginate";
import { pageRange } from "@/lib/table/pageParams";
import { cn } from "@/lib/utils";
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

// Below xl a row is two lines (who, then the date; the amount, then the
// balance after it), with the buttons beside them from md. From xl the
// board's columns without # and Note (the note under the name), so the
// table fits beside the sidebar at 1280; from 1400 (the board's 1440)
// every column, as the board draws them.
const COLUMNS =
  "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_auto_auto] xl:grid-cols-[92px_minmax(150px,1fr)_88px_92px_112px_72px_124px_84px] xl:gap-x-2.5 min-[87.5rem]:grid-cols-[40px_92px_minmax(0,1fr)_88px_92px_140px_112px_72px_124px_84px]";
// On paper (about 720px wide): every column but the buttons.
const PRINT_COLUMNS = "print:grid-cols-[24px_64px_minmax(0,1fr)_60px_60px_minmax(0,1fr)_84px_52px_92px] print:gap-x-2";
// The board's # and Note columns, from 1400 and on paper.
const WIDEST = "hidden min-[87.5rem]:block print:block";
// Columns of their own from xl and on paper.
const FROM_XL = "hidden xl:block print:block";
// Back to the column's own place once the row has its columns.
const AT_XL = "xl:col-auto xl:row-auto print:col-auto print:row-auto";
// The board's 40px round buttons, 44px under a finger.
const ACTION = "flex size-10 items-center justify-center rounded-full transition-colors pointer-coarse:size-11";

// Loans › Transactions: every loan given or taken, every repayment and
// every profit payment, numbered newest first, each with its charge and
// the balance with that bank or person just after it; Edit and Delete on
// each standing entry.
export function LoanTransactionsPageClient({ businessId, transactions, complete, loanContacts, canManage, currency, range, selectedContactId, customFrom, customTo }: LoanTransactionsPageClientProps) {
  const { t, locale, fmt } = useLocale();
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
  const [search, setSearch] = useState("");
  const [voiding, setVoiding] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<LoanEdit | null>(null);

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
  const rows = transactions.map((transaction) => {
    const contact = transaction.contactId ? contactsById.get(transaction.contactId) : undefined;
    // The board's Note: the slip or note it was saved with.
    const note = transaction.referenceNo ?? transaction.description ?? transaction.entries.find((entry) => entry.note)?.note ?? null;
    return { transaction, ...loanPaymentRow(transaction, locale), contact, name: transaction.contact?.name ?? contact?.name ?? "—", note };
  });
  const kindRows = show === "all" ? rows : rows.filter((row) => (show === "profit") === (row.profit !== null));
  // Search: a name, a note, or an amount as typed (Bangla digits too).
  const query = toEnglishDigits(search.trim().toLowerCase());
  const digits = query.replace(/tk|[,\s৳]/g, "");
  const filteredRows = query
    ? kindRows.filter((row) => row.name.toLowerCase().includes(query) || (row.note ?? "").toLowerCase().includes(query) || (/^\d+(\.\d+)?$/.test(digits) && String(Math.abs(row.signedAmount)).includes(digits)))
    : kindRows;
  // The tiles add up what the list shows: every page of it.
  const totals = loanTotals(filteredRows.map((row) => row.transaction));
  const paged = paginate(filteredRows, page, PAGE_SIZE);
  // Paper gets every row, not the page on screen.
  const listed = printing ? filteredRows : paged.rows;
  // The board's #: 1 is the newest entry the list shows.
  const firstNumber = printing ? 1 : (paged.page - 1) * PAGE_SIZE + 1;
  const filtered = range !== "all" || selectedContactId !== "" || show !== "all" || query !== "";

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

  function typeSearch(value: string) {
    setSearch(value);
    // A new search starts on its first page.
    if (page !== 1) setPage(1);
  }

  const voidingRow = voiding ? loanPaymentRow(voiding, locale) : null;
  const voidingProfit = voidingRow?.profit ?? null;
  const voidingName = voiding ? (voiding.contact?.name ?? (voiding.contactId ? contactsById.get(voiding.contactId)?.name : undefined) ?? "—") : "—";
  const voidingWallet = voidingRow?.wallet ?? t("your wallet");
  const voidingCharge = voiding?.charge ? Number(voiding.charge) : 0;

  const periodLabel =
    range === "custom"
      ? customFrom || customTo
        ? t("{from} – {to}", { from: customFrom ? formatDate(customFrom, undefined, fmt) : "…", to: customTo ? formatDate(customTo, undefined, fmt) : "…" })
        : t("All time")
      : t(PERIODS.find((period) => period.value === range)?.label ?? "All time");
  const printLine = [contactsById.get(selectedContactId)?.name ?? t("All banks & people"), show === "all" ? null : t(SHOW_LABELS[show]), query ? `“${search.trim()}”` : null, periodLabel].filter(Boolean).join(" · ");
  const { first, last } = pageRange(paged.page, PAGE_SIZE, paged.total);
  const figure = (text: string) => <b className="font-semibold text-ink">{text}</b>;
  const kindChip = (isProfit: boolean) => (
    <Chip tone={isProfit ? "warning" : "neutral"} size="sm" className="font-bold">
      {t(isProfit ? "Profit" : "Principal")}
    </Chip>
  );
  // The board's Balance: what is owed after the entry, and which way.
  const balanceCell = (balance: string | null | undefined, className?: string) => {
    if (balance === null || balance === undefined) return <span className={cn("text-ink-muted", className)}>—</span>;
    const direction = loanDirection(Number(balance));
    return (
      <span className={cn("flex flex-col items-end gap-px", className)}>
        <span className="font-semibold text-ink tabular-nums">{formatCurrency(Math.abs(Number(balance)), currency, fmt)}</span>
        <span className={cn("text-caption font-semibold", direction === "SETTLED" ? "text-ink-muted" : DIRECTION_META[direction].text)}>{t(DIRECTION_META[direction].name)}</span>
      </span>
    );
  };

  return (
    <PageFrame className="gap-5">
      {/* The board's title line, New loan entry at its end. */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Loan transactions")}</h1>
        {canManage && (
          <Button onClick={() => setDrawerOpen(true)} className="shrink-0 print:hidden">
            <Plus strokeWidth={2.5} className="size-4" />
            {t("New loan entry")}
          </Button>
        )}
      </div>

      {!complete && (
        <Banner tone="warning" inline icon={<TriangleAlert />}>
          {t("Showing and totalling the latest 1,000 only -- pick a shorter range to see the rest.")}
        </Banner>
      )}

      {/* The two totals across the page. */}
      <section>
        <Card padding="none" className="grid min-w-0 grid-cols-2">
          <TotalCell label={t("Money in@@loan")}>
            <AmountText value={totals.in} currency={currency} size="h2" tone={totals.in ? "income" : "neutral"} signed className={cn(TOTAL_FIGURE, !totals.in && "text-ink-muted")} />
          </TotalCell>
          <TotalCell label={t("Money out@@loan")} className="border-l">
            <AmountText value={-totals.out} currency={currency} size="h2" tone={totals.out ? "expense" : "neutral"} signed className={cn(TOTAL_FIGURE, !totals.out && "text-ink-muted")} />
          </TotalCell>
        </Card>
      </section>

      <ListCard
        id={LIST_ID}
        label={t("Loan transactions")}
        busy={isPending}
        tableClassName={cn("transition-opacity", isPending && "opacity-60")}
        header={
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:px-6">
            <div className="flex flex-wrap items-center gap-2.5 print:hidden">
              <Input
                size="sm"
                type="search"
                value={search}
                onChange={(event) => typeSearch(event.target.value)}
                leading={<Search />}
                placeholder={t("Search name, note or amount…")}
                aria-label={t("Search loan transactions")}
                frameClassName="w-full md:w-80 md:mr-auto"
              />
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
                label={t("Category")}
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
              {pdfExportOn && transactions.length > 0 && (
                <Button variant="secondary" size="sm" onClick={() => window.print()} title={t("Print this list")} className="max-md:hidden">
                  <Printer className="text-ink-2" />
                  {t("Print")}
                </Button>
              )}
              {shownRange === "custom" && (
                // Each date replaces the address rather than adding to it, so Back leaves the page, not each edit.
                <div className="flex items-center gap-2 md:basis-full md:justify-end">
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
                summary={<p>{fillNodes(t("Showing {range} of {total}, newest first"), { range: figure(toLocaleDigits(`${formatNumber(first)}–${formatNumber(last)}`, fmt)), total: figure(formatCount(paged.total, fmt)) })}</p>}
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
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  navigate({ contactId: undefined, range: undefined, dateFrom: undefined, dateTo: undefined, show: undefined });
                }}
              >
                {t("Show all entries")}
              </Button>
            }
          />
        ) : (
          <>
            <ListHead columns={cn(COLUMNS, PRINT_COLUMNS)} className="hidden xl:grid print:grid">
              <ListHeadCell className={WIDEST}>#</ListHeadCell>
              <ListHeadCell>{t("Date")}</ListHeadCell>
              <ListHeadCell>{t("Bank / Person")}</ListHeadCell>
              <ListHeadCell>{t("Category")}</ListHeadCell>
              <ListHeadCell>{t("Type")}</ListHeadCell>
              <ListHeadCell className={WIDEST}>{t("Note")}</ListHeadCell>
              <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
              <ListHeadCell align="end">{t("Charge")}</ListHeadCell>
              <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
              <ListHeadCell align="end" className="print:hidden">
                {t("Actions")}
              </ListHeadCell>
            </ListHead>
            {listed.map(({ transaction, profit, title, signedAmount, cancelled, contact, name, note }, index) => {
              const received = signedAmount > 0;
              const edit = canManage && transaction.voidable ? loanEditOf(transaction) : null;
              const entryTitle = title ? t(title) : t(TRANSACTION_TYPE_LABELS[transaction.transactionType]);
              const cancelledChip = cancelled && (
                <Chip tone="expense" size="sm" className="font-semibold">
                  {t(cancelled)}
                </Chip>
              );
              return (
                <ListRow key={transaction.id} columns={cn(COLUMNS, PRINT_COLUMNS)} muted={!!cancelled} className="print:break-inside-avoid xl:min-h-15">
                  <ListCell className={cn(WIDEST, "text-small text-ink-muted tabular-nums")}>{formatCount(firstNumber + index, fmt)}</ListCell>
                  {/* Below xl the date sits under the name, past the avatar. */}
                  <ListCell className={cn("col-start-1 row-start-2 text-caption text-ink-2 max-xl:pl-10.5 xl:text-small print:pl-0", AT_XL)}>{formatDate(transaction.transactionDate, undefined, fmt)}</ListCell>
                  <ListCell className={cn("col-start-1 row-start-1 flex min-w-0 items-center gap-2.5", AT_XL)}>
                    <PersonAvatar name={name} src={contact?.photoUrl} kind={contact?.type} size={30} />
                    <span className="flex min-w-0 flex-col">
                      <ListRowLink href={`/transactions/${transaction.id}`} className="truncate font-medium text-ink">
                        {name}
                      </ListRowLink>
                      {/* What it was, until the columns say it; the note until Note has a column. */}
                      <span className="flex min-w-0 items-center gap-2 text-caption font-normal text-ink-muted min-[87.5rem]:hidden print:hidden">
                        <span className="truncate">
                          <span className="xl:hidden">{entryTitle}</span>
                          {note && (
                            <span>
                              <span className="xl:hidden"> · </span>
                              {note}
                            </span>
                          )}
                        </span>
                        {cancelledChip}
                      </span>
                      {cancelledChip && <span className="hidden min-[87.5rem]:flex print:flex">{cancelledChip}</span>}
                    </span>
                  </ListCell>
                  <ListCell className={FROM_XL}>{kindChip(profit !== null)}</ListCell>
                  <ListCell className={FROM_XL}>
                    <Chip tone={received ? "income" : "expense"} size="sm" className="font-semibold">
                      {t(received ? "Received" : "Payment")}
                    </Chip>
                  </ListCell>
                  <ListCell className={cn(WIDEST, "truncate text-small text-ink-2")}>{note ?? <span className="text-ink-muted">—</span>}</ListCell>
                  <ListCell align="end" className={cn("col-start-2 row-start-1", AT_XL)}>
                    <AmountText value={signedAmount} currency={currency} size="sm" signed tone={cancelled ? "neutral" : "auto"} className={cn("font-semibold", cancelled && "text-ink-muted line-through")} />
                  </ListCell>
                  <ListCell align="end" className={cn(FROM_XL, "text-small text-ink-2 tabular-nums")}>
                    {transaction.charge && Number(transaction.charge) > 0 ? formatCurrency(transaction.charge, currency, fmt) : <span className="text-ink-muted">—</span>}
                  </ListCell>
                  <ListCell align="end" className={cn("col-start-2 row-start-2 text-small", AT_XL)}>
                    {balanceCell(transaction.loanBalanceAfter, "max-xl:flex-row max-xl:gap-1.5 max-xl:text-caption")}
                  </ListCell>
                  <ListRowActions className="hidden md:col-start-3 md:row-[1/span_2] md:flex md:justify-end xl:col-auto xl:row-auto print:hidden">
                    {edit && (
                      <button type="button" onClick={() => setEditing(edit)} aria-label={t("Edit entry")} title={t("Edit")} className={cn(ACTION, "text-ink-2 hover:bg-surface-sunken")}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                    )}
                    {canManage && transaction.voidable && (
                      <button type="button" onClick={() => setVoiding(transaction)} aria-label={t("Delete entry")} title={t("Delete")} className={cn(ACTION, "text-expense hover:bg-expense-soft")}>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </ListRowActions>
                </ListRow>
              );
            })}
          </>
        )}
      </ListCard>

      <LoanEntryDrawer
        open={drawerOpen || editing !== null}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        businessId={businessId}
        // Edit keeps whoever it was with, archived or not.
        contacts={editing ? loanContacts.filter((contact) => contact.status === "ACTIVE" || contact.id === editing.contactId) : activeContacts}
        currency={currency}
        initialContactId={selectedContactId || undefined}
        editing={editing}
      />
      {voiding && voidingRow && (
        <VoidTransactionDialog
          open
          onClose={() => setVoiding(null)}
          businessId={businessId}
          transactionId={voiding.id}
          title={t("Entry")}
          heading={t("Delete this entry?")}
          description={[
            voidingProfit
              ? // Profit never moved the loan: only the wallet and the expense or income change back.
                voidingProfit.paid
                ? t("The money goes back to {wallet} and the expense is removed. The loan balance doesn't change.", { wallet: voidingWallet })
                : t("The money comes out of {wallet} again and the income is removed. The loan balance doesn't change.", { wallet: voidingWallet })
              : t("The balance goes back to what it was before this entry. It stays in your history, marked as voided."),
            voidingCharge > 0 ? t("Its charge of {amount} is removed too.", { amount: formatCurrency(voidingCharge, currency, fmt) }) : null,
          ]
            .filter(Boolean)
            .join(" ")}
          confirmLabel="Delete entry"
          doneLabel="Entry deleted"
          detail={
            <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-strip px-4 py-3 text-body">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-ink">{voidingName}</span>
                <span className="truncate text-caption font-normal text-ink-muted">{[voidingRow.title ? t(voidingRow.title) : null, voidingProfit?.category ?? null].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-px">
                <span className="font-bold text-ink tabular-nums">{formatCurrency(Math.abs(voidingRow.signedAmount), currency, fmt)}</span>
                <span className="text-caption font-normal text-ink-muted">{formatDate(voiding.transactionDate, undefined, fmt)}</span>
              </span>
            </div>
          }
        />
      )}
    </PageFrame>
  );
}

// Never past the edge: a crore still fits.
const TOTAL_FIGURE = "min-w-0 truncate";

function TotalCell({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 border-line px-4 py-3 md:px-5 md:py-4", className)}>
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      {children}
    </div>
  );
}
