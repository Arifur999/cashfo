"use client";

import { ArrowDownLeft, ArrowUpRight, Bell, ChevronDown, ChevronUp, Pencil, Phone, Plus, Printer, UserPlus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { PeriodPicker } from "@/components/modules/Customer/Shared/PeriodPicker";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconAction from "@/components/smartly/IconAction";
import { LIST_INSET, ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListSummaryRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import { PrintPreview } from "@/components/modules/Customer/Balance/PrintPreview";
import { usePageParam } from "@/hooks/usePageParam";
import type { Contact, LoanActivityKind, LoanDashboardRow, LoanStatement } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { DIRECTION_META, foldProfitRuns, LEDGER_CONTACT_COOKIE, isCancelledRow, LOAN_ENTRY_META, LOAN_KIND_LABELS, loanDirection, loanEditOf, loanLongDate, loanRowDate, statementPageEdges, statementProfit, statementTotals, wordInitials, type LedgerItem, type LoanEdit, type StatementRow } from "@/lib/customer/loanDisplay";
import { periodHref, type PickedPeriod } from "@/lib/customer/period";
import { getLoanTransactionAction } from "@/lib/customer/receivablesPayablesActions";
import { cancelledLabel } from "@/lib/customer/transactionDisplay";
import { reversalTitle } from "@/lib/customer/transactionRows";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ContactPicker } from "./ContactPicker";
import { LoanContactDrawer } from "./LoanContactDrawer";
import { LoanEntryDrawer } from "./LoanEntryDrawer";
import { LoanReminderDialog } from "./LoanReminderDialog";
import { LoanStatementPrint, type PrintRow } from "./LoanStatementPrint";
import { usePrinting } from "./usePrinting";

interface LoanLedgerPageClientProps {
  businessId: string;
  // Every loan contact, archived ones too (their statements stay).
  contacts: Contact[];
  currency: string;
  canManage: boolean;
  canTrade: boolean;
  // The period shown: this year unless the address asks for another.
  period: PickedPeriod;
  today: string;
  selectedContactId: string;
  statement: LoanStatement | null;
  // The picked contact's entries and first day (the dashboard's row).
  activity: LoanDashboardRow | null;
  // The days the statement covers, resolved on the server.
  periodFrom?: string;
  // The period's own last day (31 Dec for a year), for the printed Period line.
  periodEnd?: string;
  periodTo: string;
}

const LIST_ID = "loan-statement";
const PAGE_SIZE = 50;

// From xl the board's columns: date, what happened, note / reference,
// principal in and out, profit, the balance after, and Edit. Below xl
// each row is the phone's two lines.
const COLUMNS = "xl:grid-cols-[96px_minmax(150px,214px)_minmax(0,1fr)_108px_108px_100px_140px_34px] xl:gap-x-3";
// On paper (about 720px wide): no Edit, tighter gaps.
const PRINT_COLUMNS = "print:grid-cols-[76px_120px_minmax(0,1fr)_84px_84px_76px_100px] print:gap-x-2.5";
const GRID = cn(COLUMNS, PRINT_COLUMNS);
// A label across everything before the balance.
const BEFORE_BALANCE = "xl:col-span-6 print:col-span-6";
// The way the money went: out up and to the right, in down and to the left.
const OUT: LoanActivityKind[] = ["GAVE", "PAID_BACK", "PROFIT_PAID"];
const WHAT: Record<LoanActivityKind, string> = {
  GAVE: LOAN_ENTRY_META.GIVE_LOAN.title,
  TOOK: LOAN_ENTRY_META.TAKE_LOAN.title,
  GOT_BACK: LOAN_ENTRY_META.RECEIVE_PAYMENT.title,
  PAID_BACK: LOAN_ENTRY_META.MAKE_PAYMENT.title,
  PROFIT_PAID: "I paid profit or interest",
  PROFIT_RECEIVED: "I received profit or interest",
};

// Loan statement (LoanLedger board): one bank or person and the period,
// who they are and where the balance stands now, how it went from opening
// to closing with the profit beside it, and every entry with the balance
// after it -- a long run of profit folded -- 50 to a page.
export function LoanLedgerPageClient({ businessId, contacts, currency, canManage, canTrade, period, today, selectedContactId, statement, activity, periodFrom, periodEnd, periodTo }: LoanLedgerPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const printing = usePrinting();
  const { page, setPage } = usePageParam();
  const [isPending, startTransition] = useTransition();
  // The bank or person as just picked, while the page loads them.
  const [shownContactId, setShownContactId] = useOptimistic(selectedContactId);
  // Folded runs of profit rows the reader opened.
  const [unfolded, setUnfolded] = useState<Set<string>>(new Set());
  const [entryOpen, setEntryOpen] = useState(false);
  const [editing, setEditing] = useState<LoanEdit | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<"closed" | "create" | "edit">("closed");
  const [reminding, setReminding] = useState(false);
  // The board's print preview, open over the page.
  const [previewing, setPreviewing] = useState(false);
  // Admin > System > Feature Flags: pdf_export off hides Print / PDF.
  const pdfExportOn = useFeature("pdf_export");
  const thisYear: PickedPeriod = { kind: "year", year: Number(today.slice(0, 4)) };

  function pickContact(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("contactId", id);
    else params.delete("contactId");
    params.delete("page");
    const query = params.toString();
    startTransition(() => {
      setShownContactId(id);
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  // Another period: this year is written as nothing, all time as
  // ?period=all.
  function pickPeriod(next: PickedPeriod) {
    const href = periodHref(pathname, Object.fromEntries(searchParams.entries()), next, thisYear);
    startTransition(() => router.push(next.kind === "all" ? `${href}${href.includes("?") ? "&" : "?"}period=all` : href, { scroll: false }));
  }

  const contact = contacts.find((c) => c.id === selectedContactId);
  // The server picks someone whenever there is anyone, so a missing
  // statement means it could not be read: nothing to print then.
  const ready = !!statement && !!contact;
  // Remembered for the session, so the Ledger link opens them again.
  useEffect(() => {
    if (selectedContactId) document.cookie = `${LEDGER_CONTACT_COOKIE}=${encodeURIComponent(selectedContactId)}; path=/; SameSite=Lax`;
  }, [selectedContactId]);
  // Standing entries only, as the board lists them: a deleted or edited
  // entry and its reversal never moved the running balance, and they stay
  // in the Transactions page's history.
  const rows: StatementRow[] = (statement?.rows ?? []).filter((row) => !isCancelledRow(row));
  const openingBalance = statement ? Number(statement.balanceBroughtForward) : 0;
  const closing = statement ? Number(statement.closingBalance) : 0;
  const { received, paid } = statementTotals(rows);
  const profit = statementProfit(rows);
  const standing = rows;
  const paidCount = standing.filter((row) => Number(row.profitPaid ?? 0) > 0).length;
  const receivedCount = standing.filter((row) => Number(row.profitReceived ?? 0) > 0).length;
  const hasProfit = profit.paid > 0 || profit.received > 0;
  const activeContacts = contacts.filter((c) => c.status === "ACTIVE");
  const day = (value: string) => formatDate(value, "d MMM yyyy", fmt);
  // The day the period opens: its own first day, else their first entry.
  // The period's first day, or the day they were first entered when that is later (the board's since).
  const startedOn = activity?.firstEntryDate ?? contact?.createdAt ?? null;
  const openedOn = periodFrom && startedOn && startedOn.slice(0, 10) > periodFrom ? startedOn : (periodFrom ?? startedOn);

  // The screen shows a page, which the pager follows; paper gets the whole
  // period on one, with every run open.
  const paged = statementPageEdges(rows, page, PAGE_SIZE, openingBalance);
  const view = printing ? statementPageEdges(rows, 1, Infinity, openingBalance) : paged;
  const { firstPage, lastPage, broughtForward, carriedForward } = view;
  const items: LedgerItem[] = printing ? view.rows.map((row) => ({ kind: "row" as const, row })) : foldProfitRuns(view.rows, 1);

  // A balance as the board writes it: the amount, its side under it.
  // The board writes a balance in ink (grey after profit, which never moves
  // it); only the closing one takes its side's colour.
  const balanceStack = (value: number, quiet = false, size = "font-semibold", coloured = false) => {
    const side = loanDirection(value);
    return (
      <span className="flex flex-col items-end gap-px leading-[normal]">
        <span className={cn(size, "tabular-nums", quiet ? "text-ink-faint" : coloured && side !== "SETTLED" ? DIRECTION_META[side].status : "text-ink")}>{formatCurrency(Math.abs(value), currency, fmt)}</span>
        <span className={cn("text-[11px] font-semibold", side === "SETTLED" ? "text-ink-muted" : DIRECTION_META[side].status)}>{t(DIRECTION_META[side].name)}</span>
      </span>
    );
  };
  // A profit amount: paid with a minus, received with a plus.
  const profitCell = (paidAmount: number, receivedAmount: number) =>
    paidAmount ? <span className="text-warning">− {formatCurrency(paidAmount, currency, fmt)}</span> : receivedAmount ? <span className="text-income">+ {formatCurrency(receivedAmount, currency, fmt)}</span> : <span className="text-input">–</span>;
  const rowId = (row: StatementRow) => `${LIST_ID}-${row.transactionId}`;

  function toggle(key: string) {
    setUnfolded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Edit: the entry as it was saved (the statement lists only what it
  // shows), with the charge the statement read for it.
  function editRow(row: StatementRow) {
    setOpening(row.transactionId);
    void getLoanTransactionAction(businessId, row.transactionId)
      .then((transaction) => {
        const edit = transaction?.voidable ? loanEditOf({ ...transaction, charge: row.charge ?? transaction.charge ?? null }) : null;
        if (edit) setEditing(edit);
        else toast.error(t(transaction ? "This entry is changed from its own page." : "Couldn't open this entry. Try again."));
      })
      .catch(() => toast.error(t("Couldn't open this entry. Try again.")))
      .finally(() => setOpening(null));
  }

  // What an entry was, its note and its charge, for the screen and paper.
  function describe(row: StatementRow) {
    const isProfit = row.category === "Profit";
    const kind: LoanActivityKind = row.kind ?? (isProfit ? (Number(row.profitPaid ?? 0) > 0 ? "PROFIT_PAID" : "PROFIT_RECEIVED") : row.debit ? "GAVE" : "TOOK");
    // A reversal is named for what it undid.
    const what = row.reversalOfId ? reversalTitle(row.description) || t(WHAT[kind]) : t(WHAT[kind]);
    const note = [row.reversalOfId ? null : row.description, row.referenceNo].filter(Boolean).join(" · ");
    return { isProfit, kind, what, note, charge: Number(row.charge ?? 0) };
  }

  function renderRow(row: StatementRow) {
    const { isProfit, kind, what, note, charge } = describe(row);
    const cancelled = isCancelledRow(row);
    const label = cancelledLabel({ status: row.status, reversalOfId: row.reversalOfId ?? null }) ?? (cancelled ? "Voided" : null);
    const out = OUT.includes(kind);
    const movement = isProfit ? profitCell(Number(row.profitPaid ?? 0), Number(row.profitReceived ?? 0)) : row.credit ? `+ ${formatCurrency(row.credit, currency, fmt)}` : row.debit ? `− ${formatCurrency(row.debit, currency, fmt)}` : "–";
    return (
      <ListRow key={row.transactionId} id={rowId(row)} columns={GRID} muted={cancelled} className="xl:min-h-13.75 print:break-inside-avoid">
        <ListCell className="hidden text-[13px] whitespace-nowrap text-ink-2 xl:block print:block">{loanRowDate(row.date, fmt)}</ListCell>
        <ListCell className="flex min-w-0 flex-col gap-0.5 xl:flex-row xl:items-center xl:gap-1.75">
          <span className="flex min-w-0 items-center gap-1.75">
            {out ? <ArrowUpRight className="size-3.5 shrink-0 text-expense-fill" strokeWidth={2.25} aria-hidden="true" /> : <ArrowDownLeft className="size-3.5 shrink-0 text-emerald" strokeWidth={2.25} aria-hidden="true" />}
            <span title={what} className={cn("truncate text-[13.5px] font-medium text-ink", cancelled && "line-through")}>
              {what}
            </span>
            {label && (
              <Chip tone="expense" size="sm" className="shrink-0 font-semibold">
                {t(label)}
              </Chip>
            )}
          </span>
          {/* Phone: the day and the note under what happened. */}
          <span className="truncate pl-5.25 text-caption font-normal text-ink-muted xl:hidden print:hidden">{[formatDate(row.date, "d MMM yyyy", fmt), note].filter(Boolean).join(" · ")}</span>
        </ListCell>
        <ListCell className="hidden min-w-0 flex-col gap-px xl:flex print:flex">
          {note ? <span className="truncate text-[13px] text-ink-2">{note}</span> : <span className="text-[13px] text-input">–</span>}
          {charge > 0 && <span className="text-[11.5px] whitespace-nowrap text-ink-faint">{t("Charge {amount}", { amount: formatCurrency(charge, currency, fmt) })}</span>}
        </ListCell>
        <ListCell align="end" className={cn("hidden tabular-nums xl:block print:block", row.credit ? "text-income" : "text-ink-faint")}>
          {row.credit ? formatCurrency(row.credit, currency, fmt) : "–"}
        </ListCell>
        <ListCell align="end" className={cn("hidden tabular-nums xl:block print:block", row.debit ? "text-expense" : "text-ink-faint")}>
          {row.debit ? formatCurrency(row.debit, currency, fmt) : "–"}
        </ListCell>
        <ListCell align="end" className="hidden tabular-nums xl:block print:block">
          {profitCell(Number(row.profitPaid ?? 0), Number(row.profitReceived ?? 0))}
        </ListCell>
        {/* Phone: what moved, over the balance after it. */}
        <ListCell align="end" className="flex flex-col items-end gap-0.5 tabular-nums xl:hidden print:hidden">
          <span className={cn("font-semibold text-ink", cancelled && "line-through")}>{movement}</span>
          <span className="text-caption">{balanceStack(Number(row.runningPrincipal), isProfit, "font-normal")}</span>
        </ListCell>
        {/* Profit leaves the balance where it was. */}
        <ListCell align="end" className="hidden xl:block print:block">
          {balanceStack(Number(row.runningPrincipal), isProfit)}
        </ListCell>
        <ListCell align="end" className="hidden xl:block print:hidden">
          {canManage && !cancelled && (
            <IconAction onClick={() => editRow(row)} disabled={opening !== null} aria-label={t("Edit entry for {name}", { name: contact?.name ?? "" })} title={t("Edit entry")} className="size-8.5">
              {opening === row.transactionId ? <Loader size={14} label={t("Loading...")} /> : <Pencil aria-hidden="true" />}
            </IconAction>
          )}
        </ListCell>
      </ListRow>
    );
  }

  // A folded run of profit rows: one row on the board's amber band, with
  // Show N more; it stays above the rows to fold them again, so focus
  // never moves.
  function renderFold(item: Extract<LedgerItem, { kind: "more" }>) {
    const open = unfolded.has(item.key);
    const first = item.rows[0];
    const last = item.rows[item.rows.length - 1];
    const sum = statementProfit(item.rows);
    const count = formatCount(item.rows.length, fmt);
    const days = `${formatDate(first.date, "d MMM", fmt)} – ${formatDate(last.date, "d MMM", fmt)}`;
    return (
      <Fragment key={`fold-${item.key}`}>
        <div role="row" data-slot="list-row" className="border-divider [[data-slot=list-row]+&]:border-t">
          <div role="cell" className={cn("grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 bg-warning-50 py-1.5 tabular-nums", LIST_INSET, COLUMNS)}>
            <span className="hidden text-[12.5px] whitespace-nowrap text-due-ink xl:block">{days}</span>
            <span className="flex min-w-0 items-center gap-2.5 xl:col-span-2">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] font-semibold text-due-ink">{t(item.paid ? "{count} more profit entries" : "{count} more profit received", { count })}</span>
                <span className="truncate text-caption text-due-ink xl:hidden">{days}</span>
              </span>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={open ? item.rows.map(rowId).join(" ") : undefined}
                onClick={() => toggle(item.key)}
                className="flex h-7.5 shrink-0 items-center gap-1 rounded-full border border-pill-amber-line bg-surface px-3 text-[12.5px] font-bold whitespace-nowrap text-due-ink hover:bg-warning-soft pointer-coarse:h-10"
              >
                {open ? <ChevronUp className="size-3.25" strokeWidth={2.5} aria-hidden="true" /> : <ChevronDown className="size-3.25" strokeWidth={2.5} aria-hidden="true" />}
                {open ? t("Show fewer") : t("Show {count} more", { count })}
              </button>
            </span>
            <span className="hidden text-right text-input xl:block">–</span>
            <span className="hidden text-right text-input xl:block">–</span>
            <span className="text-right text-[14px] font-semibold">{profitCell(sum.paid, sum.received)}</span>
            <span className="hidden text-[14px] xl:block">{balanceStack(Number(last.runningPrincipal), true, "text-[14px] font-semibold")}</span>
            <span className="hidden xl:block" />
          </div>
        </div>
        {open && item.rows.map(renderRow)}
      </Fragment>
    );
  }

  const balanceNow = contact ? Number(contact.currentBalance) : 0;
  const nowSide = loanDirection(balanceNow);
  const closeSide = loanDirection(closing);
  const openSide = loanDirection(openingBalance);
  const entries = activity?.entries;
  const since = startedOn;

  // The page on paper: every entry in the period, none folded.
  const sideTag = (value: number) => t(DIRECTION_META[loanDirection(value)].name);
  const printFigure = (value: number) => (value ? formatCurrency(value, currency, fmt) : "–");
  const printRows: PrintRow[] = rows.map((row) => {
    const { isProfit, what, note, charge } = describe(row);
    const after = Number(row.runningPrincipal);
    return {
      key: row.transactionId,
      date: loanRowDate(row.date, fmt),
      what: row.reversalOfId || isCancelledRow(row) ? `${what} (${t("Voided")})` : what,
      note: [note, charge > 0 ? t("Charge {amount}", { amount: formatCurrency(charge, currency, fmt) }) : null].filter(Boolean).join(" · ") || "–",
      in: isProfit ? "–" : printFigure(Number(row.credit ?? 0)),
      out: isProfit ? "–" : printFigure(Number(row.debit ?? 0)),
      profit: Number(row.profitPaid ?? 0) ? `− ${formatCurrency(Number(row.profitPaid), currency, fmt)}` : Number(row.profitReceived ?? 0) ? `+ ${formatCurrency(Number(row.profitReceived), currency, fmt)}` : "–",
      balance: `${formatCurrency(Math.abs(after), currency, fmt)} ${sideTag(after)}`,
    };
  });
  const profitTotal = profit.paid && profit.received ? `− ${formatCurrency(profit.paid, currency, fmt)} / + ${formatCurrency(profit.received, currency, fmt)}` : profit.received ? `+ ${formatCurrency(profit.received, currency, fmt)}` : profit.paid ? `− ${formatCurrency(profit.paid, currency, fmt)}` : formatCurrency(0, currency, fmt);
  const balanceText = (value: number) => `${formatCurrency(Math.abs(value), currency, fmt)} ${sideTag(value)}`;
  const preview = previewing && ready && contact && (
    <PrintPreview look="bar" subtitle={t("For a PDF, choose “Save as PDF” in the print window.")} onClose={() => setPreviewing(false)}>
      <LoanStatementPrint
        name={contact.name}
        meta={[
          { label: t("Bank / person"), value: contact.name },
          { label: t("Kind"), value: t(LOAN_KIND_LABELS[contact.type]) },
          { label: t("Phone"), value: contact.phone || "–" },
          { label: t("Period"), value: periodFrom ? `${day(periodFrom)} – ${day(periodEnd ?? periodTo)}` : t("All time") },
        ]}
        figures={[
          { label: t("Opening balance"), value: balanceText(openingBalance) },
          { label: t("Principal out"), value: formatCurrency(paid, currency, fmt) },
          { label: t("Principal in"), value: formatCurrency(received, currency, fmt) },
          { label: t("Profit"), value: profitTotal },
          { label: t("Closing balance"), value: balanceText(closing), tone: closeSide === "SETTLED" ? undefined : DIRECTION_META[closeSide].status },
        ]}
        openingLine={`${t("Opening balance")}${openedOn ? ` · ${loanRowDate(openedOn, fmt)}` : ""}`}
        opening={balanceText(openingBalance)}
        closingLine={`${t("Closing balance")} · ${loanRowDate(periodTo, fmt)}`}
        closing={{ in: formatCurrency(received, currency, fmt), out: formatCurrency(paid, currency, fmt), profit: profitTotal, balance: balanceText(closing) }}
        rows={printRows}
        madeOn={t("Made on {date}", { date: loanLongDate(today, fmt) })}
      />
    </PrintPreview>
  );

  return (
    <PageFrame className="gap-4.5">
      {preview}
      {/* While the preview is open, only its page prints. */}
      <div className={cn("contents", previewing && "print:hidden")}>
      <PageHeader
        eyebrow={t("Loans")}
        tone="loans"
        title={t("Loan statement")}
        description={<span className="block text-[13.5px] leading-[normal]">{t("Every entry with one bank or person, with the balance after each one.")}</span>}
        // The board's title block sits 8px higher, the button centred on it.
        className="md:-mt-2 md:items-center"
        actions={
          pdfExportOn &&
          ready && (
            <Button variant="secondary" onClick={() => setPreviewing(true)} aria-haspopup="dialog" className="gap-2 px-3.5 print:hidden">
              <Printer className="text-ink-2" />
              {t("Print / PDF")}
            </Button>
          )
        }
      />

      {contacts.length === 0 ? (
        // No one yet: the board shows only this, no picker and no print.
        <Card padding="none" className="flex flex-col items-center gap-2.5 px-6 py-14 text-center leading-[normal]">
          <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[16px] bg-emerald-soft text-emerald">
            <UserPlus className="size-6" strokeWidth={2} />
          </span>
          <h2 className="text-[18px] font-bold text-ink">{t("No banks or people yet")}</h2>
          <p className="max-w-110 text-body leading-[1.55] text-ink-muted">{t("Add the bank, NGO or person you lend to or borrow from. Their statement shows up here.")}</p>
          {canManage && (
            <Button onClick={() => setContactForm("create")} className="mt-1.5 h-10.5 px-4.5">
              <Plus strokeWidth={2.5} className="size-4" />
              {t("Add a bank or person")}
            </Button>
          )}
        </Card>
      ) : (
        <>
        <Card padding="none" className="flex flex-col gap-4 px-5 py-3.5 md:flex-row md:items-end print:hidden">
          <div className="flex min-w-0 flex-col gap-1.5 md:flex-1">
            <label htmlFor="loan-contact" className="text-[13px] leading-[normal] font-medium text-ink-2">
              {t("Bank / person")}
            </label>
            <ContactPicker id="loan-contact" contacts={contacts} value={shownContactId} onChange={pickContact} currency={currency} label={t("Bank / person")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] leading-[normal] font-medium text-ink-2">{t("Period")}</span>
            <PeriodPicker period={period} today={today} activeMonths={null} allowAll defaultPeriod={thisYear} onPick={pickPeriod} busy={isPending} />
          </div>
          {isPending && <Loader size={18} label={t("Loading...")} className="md:mb-3" />}
        </Card>

        {!statement || !contact ? (
          <Card padding="none" className="p-10 text-center text-body text-ink-muted">
            {t("The statement could not be loaded. Try again in a moment.")}
          </Card>
        ) : (
        <>
          {/* Who, and where the balance stands now. */}
          <Card padding="none" className="flex flex-col gap-4 px-5 py-4 leading-[normal] md:flex-row md:items-center print:border-0 print:p-0 print:shadow-none">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <PersonAvatar name={contact.name} src={contact.photoUrl} kind={contact.type} size={44} initials={wordInitials(contact.name)} className="size-12" />
              <div className="flex min-w-0 flex-col gap-0.75">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-[18px] font-bold text-ink">{contact.name}</h2>
                  <Chip tone="neutral" size="sm" className="h-auto shrink-0 px-2 py-0.5 text-[11.5px] font-semibold">
                    {t(LOAN_KIND_LABELS[contact.type])}
                  </Chip>
                </div>
                <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[13px] text-ink-muted">
                  {contact.phone && (
                    <>
                      <Phone className="size-3.25" aria-hidden="true" />
                      <span className="tabular-nums">{contact.phone}</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  {contact.notes && (
                    <>
                      <span className="truncate">{contact.notes}</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  {since && <span>{t("Since {date}", { date: loanLongDate(since, fmt) })}</span>}
                  {entries !== undefined && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{t(entries === 1 ? "{count} entry" : "{count} entries", { count: formatCount(entries, fmt) })}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-0.5 md:items-end md:px-1.5">
              <span className="text-[12px] text-ink-muted">{t("Balance now")}</span>
              <span className="flex items-center gap-2">
                <span className={cn("text-[20px] font-bold tabular-nums", nowSide === "SETTLED" ? "text-ink" : DIRECTION_META[nowSide].status)}>{formatCurrency(Math.abs(balanceNow), currency, fmt)}</span>
                <Chip tone={DIRECTION_META[nowSide].chip} size="sm" className={cn("h-auto py-0.5 font-bold", DIRECTION_META[nowSide].box, DIRECTION_META[nowSide].status)}>
                  {t(DIRECTION_META[nowSide].name)}
                </Chip>
              </span>
              <span className={cn("text-[12px]", nowSide === "SETTLED" ? "text-ink-muted" : DIRECTION_META[nowSide].status)}>{t(DIRECTION_META[nowSide].label)}</span>
            </div>
            {(canManage || balanceNow > 0) && (
              <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
                {/* Only while they owe you: a message to send them. */}
                {balanceNow > 0 && (
                  <Button variant="secondary" onClick={() => setReminding(true)} aria-haspopup="dialog" className="gap-1.75 px-3.5 text-[13.5px]">
                    <Bell className="size-3.75 text-ink-soft" />
                    {t("Remind")}
                  </Button>
                )}
                {canManage && (
                  <Button variant="secondary" onClick={() => setContactForm("edit")} className="gap-1.75 px-3.5 text-[13.5px]">
                    <Pencil className="size-3.75 text-ink-soft" />
                    {t("Edit contact")}
                  </Button>
                )}
                {canManage && contact.status === "ACTIVE" && (
                  <Button onClick={() => setEntryOpen(true)} className="gap-1.5 px-4 text-[13.5px]">
                    <Plus strokeWidth={2.5} className="size-3.75" />
                    {t("New entry")}
                  </Button>
                )}
              </div>
            )}
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <Card padding="none" className="grid grid-cols-2 overflow-hidden leading-[normal] md:grid-cols-4">
              <Figure label={t("Opening balance")} sub={openedOn ? t("On {date}", { date: loanLongDate(openedOn, fmt) }) : undefined}>
                <span className="flex flex-wrap items-center gap-x-1.5 whitespace-nowrap">
                  <span className="text-[19px] font-bold text-ink tabular-nums">{formatCurrency(Math.abs(openingBalance), currency, fmt)}</span>
                  <span className={cn("text-[11px] font-bold", openSide === "SETTLED" ? "text-ink-muted" : DIRECTION_META[openSide].status)}>{t(DIRECTION_META[openSide].name)}</span>
                </span>
              </Figure>
              <Figure label={t("Principal out")} sub={t("Gave a loan or paid back")} className="border-l border-divider">
                <span className={cn("text-[19px] font-bold tabular-nums", paid ? "text-expense" : "text-ink-faint")}>{formatCurrency(paid, currency, fmt)}</span>
              </Figure>
              <Figure label={t("Principal in")} sub={t("Took a loan or got money back")} className="border-divider max-md:border-t md:border-l">
                <span className={cn("text-[19px] font-bold tabular-nums", received ? "text-income" : "text-ink-faint")}>{formatCurrency(received, currency, fmt)}</span>
              </Figure>
              <Figure label={t("Closing balance")} sub={t("On {date}", { date: loanLongDate(periodTo, fmt) })} tone={closeSide} className={cn("max-md:border-t max-md:border-l max-md:border-divider", DIRECTION_META[closeSide].box)}>
                <span className="flex flex-wrap items-center gap-x-1.5 whitespace-nowrap">
                  <span className={cn("text-[21px] font-bold tabular-nums", closeSide === "SETTLED" ? "text-ink-muted" : DIRECTION_META[closeSide].status)}>{formatCurrency(Math.abs(closing), currency, fmt)}</span>
                  <span className={cn("text-[11px] font-bold", closeSide === "SETTLED" ? "text-ink-muted" : DIRECTION_META[closeSide].status)}>{t(DIRECTION_META[closeSide].name)}</span>
                </span>
              </Figure>
            </Card>
            {/* The board always shows this card, with "Profit / interest" and a grey zero when there was none. */}
            <div className="flex flex-col justify-center gap-1 rounded-[12px] border border-warning-line bg-warning-50 px-5 py-3.5 leading-[normal] text-warning-ink">
              <span className="text-[12px] font-semibold">
                {profit.paid > 0
                  ? t(paidCount === 1 ? "Profit paid · {count} entry" : "Profit paid · {count} entries", { count: formatCount(paidCount, fmt) })
                  : profit.received > 0
                    ? t(receivedCount === 1 ? "Profit received · {count} entry" : "Profit received · {count} entries", { count: formatCount(receivedCount, fmt) })
                    : t("Profit / interest")}
              </span>
              <span className={cn("text-[21px] font-bold tabular-nums", hasProfit ? "text-warning" : "text-ink-faint")}>{formatCurrency(profit.paid > 0 ? profit.paid : profit.received, currency, fmt)}</span>
              {profit.paid > 0 && profit.received > 0 && (
                <span className="text-[12.5px] font-semibold">
                  {t(receivedCount === 1 ? "Received {amount} · {count} entry" : "Received {amount} · {count} entries", { amount: formatCurrency(profit.received, currency, fmt), count: formatCount(receivedCount, fmt) })}
                </span>
              )}
              <span className="text-[12px]">
                {profit.paid > 0 && profit.received > 0
                  ? t("Paid is an expense, received is income. Neither changes the balance.")
                  : profit.paid > 0
                    ? t("Counted as expense. Doesn’t change the balance.")
                    : profit.received > 0
                      ? t("Counted as income. Doesn’t change the balance.")
                      : t("No profit or interest in this period.")}
              </span>
            </div>
          </div>

          <ListCard
            id={LIST_ID}
            label={t("Loan statement")}
            busy={isPending}
            tableClassName={cn("transition-opacity", isPending && "opacity-60")}
            footer={
              paged.totalPages > 1 && (
                <ListFooter className="print:hidden">
                  <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={PAGE_SIZE} onPageChange={setPage} focusTargetId={LIST_ID} />
                </ListFooter>
              )
            }
          >
            <ListHead columns={GRID} className="md:hidden xl:grid xl:h-9 print:grid [&_*]:font-semibold">
              <ListHeadCell>{t("Date")}</ListHeadCell>
              <ListHeadCell>{t("What happened")}</ListHeadCell>
              <ListHeadCell>{t("Note / reference")}</ListHeadCell>
              <ListHeadCell align="end">{t("Principal in")}</ListHeadCell>
              <ListHeadCell align="end">{t("Principal out")}</ListHeadCell>
              <ListHeadCell align="end">{t("Profit")}</ListHeadCell>
              <ListHeadCell align="end">{t("Balance after")}</ListHeadCell>
              <ListHeadCell className="print:hidden" />
            </ListHead>
            {firstPage ? (
              <ListSummaryRow kind="opening" columns={GRID} className="min-h-11.75 py-0 text-body">
                <ListCell className={cn("font-semibold text-ink-2", BEFORE_BALANCE)}>
                  {t("Opening balance")}
                  {openedOn && ` · ${loanRowDate(openedOn, fmt)}`}
                </ListCell>
                <ListCell align="end">{balanceStack(openingBalance)}</ListCell>
              </ListSummaryRow>
            ) : (
              <ListSummaryRow kind="brought-forward" columns={GRID} className="text-body">
                <ListCell className={cn("font-semibold text-ink-2", BEFORE_BALANCE)}>{t("Brought forward")}</ListCell>
                <ListCell align="end">{balanceStack(broughtForward)}</ListCell>
              </ListSummaryRow>
            )}
            {rows.length === 0 && <ListEmpty title={t("No entries in this period.")} />}
            {items.map((item) => (item.kind === "more" ? renderFold(item) : renderRow(item.row)))}
            {lastPage ? (
              <ListSummaryRow kind="closing" columns={GRID} className="min-h-13.75 py-0 text-body font-semibold">
                <ListCell className="font-bold text-ink xl:col-span-3 print:col-span-3">
                  {t("Closing balance")} · {loanRowDate(periodTo, fmt)}
                </ListCell>
                <ListCell align="end" className={cn("hidden tabular-nums xl:block print:block", received ? "text-income" : "text-ink-muted")}>
                  {formatCurrency(received, currency, fmt)}
                </ListCell>
                <ListCell align="end" className={cn("hidden tabular-nums xl:block print:block", paid ? "text-expense" : "text-ink-muted")}>
                  {formatCurrency(paid, currency, fmt)}
                </ListCell>
                <ListCell align="end" className="hidden flex-col items-end tabular-nums xl:flex print:flex">
                  {/* Both, when there was profit both ways. */}
                  {profit.paid > 0 && profitCell(profit.paid, 0)}
                  {profit.received > 0 && profitCell(0, profit.received)}
                  {!hasProfit && <span className="text-ink-muted">{formatCurrency(0, currency, fmt)}</span>}
                </ListCell>
                <ListCell align="end">{balanceStack(closing, false, "text-title font-bold", true)}</ListCell>
              </ListSummaryRow>
            ) : (
              <ListSummaryRow kind="carried-forward" columns={GRID} className="text-body">
                <ListCell className={cn("font-semibold text-ink-2", BEFORE_BALANCE)}>{t("Carried forward")}</ListCell>
                <ListCell align="end">{balanceStack(carriedForward)}</ListCell>
              </ListSummaryRow>
            )}
          </ListCard>
        </>
        )}
        </>
      )}

      <LoanEntryDrawer
        open={entryOpen || editing !== null}
        onClose={() => {
          setEntryOpen(false);
          setEditing(null);
        }}
        businessId={businessId}
        // Edit keeps whoever it was with, archived or not.
        contacts={editing ? contacts.filter((c) => c.status === "ACTIVE" || c.id === editing.contactId) : activeContacts}
        currency={currency}
        initialContactId={selectedContactId || undefined}
        editing={editing}
      />
      {contact && balanceNow > 0 && (
        <LoanReminderDialog
          open={reminding}
          onClose={() => setReminding(false)}
          name={contact.name}
          phone={contact.phone}
          owed={balanceNow}
          currency={currency}
          today={today}
          onAddPhone={() => {
            setReminding(false);
            setContactForm("edit");
          }}
        />
      )}
      <LoanContactDrawer open={contactForm !== "closed"} onClose={() => setContactForm("closed")} businessId={businessId} editing={contactForm === "edit" ? (contact ?? null) : null} currency={currency} canTrade={canTrade} />
      </div>
    </PageFrame>
  );
}

// One of the four figures: its label, the amount, and a line under it; the
// closing one takes its side's colour.
function Figure({ label, sub, tone, className, children }: { label: string; sub?: string; tone?: "PAWNA" | "DENA" | "SETTLED"; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 px-4.5 py-3.5", className)}>
      <span className={cn("text-[12px]", tone ? cn("font-semibold", tone === "SETTLED" ? "text-ink-muted" : DIRECTION_META[tone].status) : "text-ink-muted")}>{label}</span>
      {children}
      {sub && <span className="text-[11.5px] leading-[1.35] text-ink-faint">{sub}</span>}
    </div>
  );
}
