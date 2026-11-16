"use client";

import { ArrowDownLeft, ArrowDownWideNarrow, ArrowUpRight, CalendarDays, Check, ChevronDown, Plus, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import { ListCard, ListCell, ListHead, ListHeadCell, ListRow, ListRowLink, ListTotalRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Contact, LoanBalanceDirection, LoanDashboard, LoanDashboardRow, LoanMonth } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { contactMatches, DIRECTION_META, LOAN_KIND_LABELS, type LoanEntryKind, monthItems, whoPhrase, wordInitials } from "@/lib/customer/loanDisplay";
import { formatCount } from "@/lib/i18n/digits";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import { LoanContactDrawer } from "./LoanContactDrawer";
import { LoanEntryDrawer } from "./LoanEntryDrawer";

interface LoanDashboardPageClientProps {
  businessId: string;
  dashboard: LoanDashboard;
  // Every loan contact: each row's kind and photo, and which rows are loans.
  contacts: Contact[];
  currency: string;
  canManage: boolean;
  canTrade: boolean;
  // "YYYY-MM-DD" in Asia/Dhaka: the month the strip is for.
  today: string;
}

type Tab = "ALL" | LoanBalanceDirection;
type Sort = "biggest" | "smallest";
const SORTS: { value: Sort; label: string }[] = [
  { value: "biggest", label: "Highest to lowest" },
  { value: "smallest", label: "Lowest to highest" },
];

// From xl the board's columns, a little narrower so a name keeps room
// beside the sidebar at 1280 (the opening a little wider, for its sign);
// below xl each row is the phone's two lines.
const COLUMNS = "xl:grid-cols-[minmax(0,1fr)_120px_136px_136px_136px_190px] xl:gap-x-3.5";
const DIRECTIONS: LoanBalanceDirection[] = ["PAWNA", "DENA", "SETTLED"];
const DOT: Record<LoanBalanceDirection, string> = { PAWNA: "var(--income)", DENA: "var(--expense-fill)", SETTLED: "var(--ink-faint)" };

// A grey dash for nothing, else the figure (in the column's own colour).
const NOTHING = <span className="text-input">–</span>;
const figure = (value: string, currency: string, locale: FormatLocale, className?: string) => (Number(value) === 0 ? NOTHING : <span className={cn("text-ink tabular-nums", className)}>{formatCurrency(Math.abs(Number(value)), currency, locale)}</span>);

// Loans: what you are owed and what you owe, then everyone with a balance,
// filtered by direction. Rows open the statement.
export function LoanDashboardPageClient({ businessId, dashboard, contacts, currency, canManage, canTrade, today }: LoanDashboardPageClientProps) {
  const { t, fmt } = useLocale();
  const [tab, setTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("biggest");
  const [contactOpen, setContactOpen] = useState(false);
  const [entry, setEntry] = useState<{ kind?: LoanEntryKind } | null>(null);

  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
  // Loan contacts only, whatever the API sends: a trade customer or
  // supplier belongs to Books, and its statement here would be empty. The
  // totals are worked out from the same rows, so they always agree.
  // Every loan contact is a row, as on the board: one with nothing entered
  // yet stands at ৳ 0, Settled (the API lists only those with money moved).
  const apiRows = new Map(dashboard.rows.map((row) => [row.contactId, row]));
  const rows = contacts.filter((contact) => apiRows.has(contact.id) || contact.status === "ACTIVE").map((contact) => apiRows.get(contact.id) ?? emptyRow(contact));
  const totalPawna = rows.reduce((sum, row) => sum + Math.max(0, Number(row.currentBalance)), 0);
  const totalDena = rows.reduce((sum, row) => sum + Math.max(0, -Number(row.currentBalance)), 0);
  const net = totalPawna - totalDena;

  const onSide = (direction: LoanBalanceDirection) => rows.filter((row) => row.direction === direction);
  // "3 contacts", "1 bank and 1 NGO": who a side's total is with.
  const whoOf = (direction: LoanBalanceDirection) => whoPhrase(onSide(direction).map((row) => contactsById.get(row.contactId)?.type), t, fmt);
  const counts = { ALL: rows.length, ...Object.fromEntries(DIRECTIONS.map((direction) => [direction, onSide(direction).length])) } as Record<Tab, number>;
  const shown = rows
    .filter((row) => tab === "ALL" || row.direction === tab)
    .filter((row) => contactMatches(row.contactName, row.contactPhone, search))
    .sort((a, b) => (Math.abs(Number(b.currentBalance)) - Math.abs(Number(a.currentBalance))) * (sort === "biggest" ? 1 : -1));
  const sums = shown.reduce(
    (sum, row) => ({ opening: sum.opening + Number(row.openingBalance), in: sum.in + Number(row.totalReceive), out: sum.out + Number(row.totalPayment), profit: sum.profit + Number(row.profitPaid), got: sum.got + Number(row.profitReceived), net: sum.net + Number(row.currentBalance) }),
    { opening: 0, in: 0, out: 0, profit: 0, got: 0, net: 0 },
  );

  const counted = (label: string, count: number) => (
    <>
      {label} <span className="text-ink-faint">{formatCount(count, fmt)}</span>
    </>
  );
  const tabs = [{ value: "ALL" as Tab, label: counted(t("All"), counts.ALL) }, ...DIRECTIONS.map((direction) => ({ value: direction as Tab, label: counted(t(DIRECTION_META[direction].name), counts[direction]), dot: DOT[direction] }))];
  // A side's caption: who it is with, or that nobody is on it.
  const sideCaption = (direction: "PAWNA" | "DENA", sentence: string) => (counts[direction] === 0 ? t(direction === "PAWNA" ? "No one owes you" : "You owe no one") : t(sentence, { who: whoOf(direction), side: t(DIRECTION_META[direction].name) }));
  const activeContacts = contacts.filter((contact) => contact.status === "ACTIVE");

  const phoneEntryButtons = canManage && activeContacts.length > 0 && (
    <div className="grid grid-cols-2 gap-2 md:hidden">
      {/* The arrows point the way the balance goes, as the board draws them: lent comes back to you, borrowed goes out. */}
      <Button variant="secondary" size="xl" onClick={() => setEntry({ kind: "GIVE_LOAN" })} className="font-semibold">
        <ArrowDownLeft />
        {t("Gave or lent")}
      </Button>
      <Button variant="secondary" size="xl" onClick={() => setEntry({ kind: "TAKE_LOAN" })} className="font-semibold">
        <ArrowUpRight />
        {t("Took or borrowed")}
      </Button>
    </div>
  );

  return (
    <PageFrame className="md:min-h-full md:gap-4.5 md:pt-6 md:pb-8">
      {/* The board has no title from md: the topbar names the page. */}
      <PageHeader
        eyebrow={t("Loans")}
        tone="loans"
        title={t("Dena-pawna")}
        description={t("Who you owe, and who owes you.")}
        className="md:hidden"
      />
      <h1 className="hidden md:block md:sr-only">{t("Loans & Dena-Pawna")}</h1>

      {/* From md: this month's loan money, and New entry beside it. */}
      <div className="hidden items-center gap-3 md:flex">
        <MonthStrip month={dashboard.thisMonth} today={today} currency={currency} />
        {canManage && activeContacts.length > 0 && (
          <Button onClick={() => setEntry({})} className="shrink-0">
            <Plus strokeWidth={2.5} className="size-4" />
            {t("New entry")}
          </Button>
        )}
      </div>

      {/* From md the board's three figures, each picking its tab. */}
      <section aria-label={t("Balance")} className="hidden grid-cols-3 gap-4 md:grid">
        <KpiCard on={tab === "PAWNA"} side="PAWNA" onPick={() => setTab("PAWNA")} title={t("Show only Pawna")} label={t("Pawna")} count={counts.PAWNA} sub={t("They owe you")}>
          <AmountText value={totalPawna} currency={currency} tone="income" signed className={KPI_FIGURE} />
        </KpiCard>
        <KpiCard on={tab === "DENA"} side="DENA" onPick={() => setTab("DENA")} title={t("Show only Dena")} label={t("Dena")} count={counts.DENA} sub={t("You owe them")}>
          <AmountText value={-totalDena} currency={currency} tone="expense" signed className={cn(KPI_FIGURE, "text-expense-fill")} />
        </KpiCard>
        <KpiCard
          on={tab === "ALL"}
          side="ALL"
          onPick={() => setTab("ALL")}
          title={t("Show everyone")}
          label={t("Net position")}
          count={counts.ALL}
          sub={t(net > 0 ? "You are owed more than you owe" : net < 0 ? "You owe more than you are owed" : "Pawna and Dena are even")}
        >
          <AmountText value={net} currency={currency} tone="auto" signed className={cn(KPI_FIGURE, net < 0 && "text-expense-fill")} />
        </KpiCard>
      </section>

      {/* Phone: the two figures, two to a row. */}
      <section className="md:hidden">
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <Card padding="sm" className={PHONE_FIGURE_CARD}>
            <span className={PHONE_FIGURE_LABEL}>
              <span className="md:hidden">{t("Owed to you")}</span>
              <span className="hidden font-semibold text-income md:inline">{t("Pawna")}</span>
            </span>
            {/* Signed from md, the two terms of the net position beside them; the phone board is unsigned. */}
            <AmountText value={totalPawna} currency={currency} size="h2" tone="income" className={cn(PHONE_FIGURE, "md:hidden")} />
            <AmountText value={totalPawna} currency={currency} size="h2" tone="income" signed className={cn(PHONE_FIGURE, "max-md:hidden")} />
            <span className="text-caption font-normal text-ink-muted md:hidden">{sideCaption("PAWNA", "{side} · {who}")}</span>
          </Card>
          <Card padding="sm" className={PHONE_FIGURE_CARD}>
            <span className={PHONE_FIGURE_LABEL}>
              <span className="md:hidden">{t("You owe")}</span>
              <span className="hidden font-semibold text-expense md:inline">{t("Dena")}</span>
            </span>
            <AmountText value={totalDena} currency={currency} size="h2" tone="expense" className={cn(PHONE_FIGURE, "md:hidden")} />
            <AmountText value={-totalDena} currency={currency} size="h2" tone="expense" signed className={cn(PHONE_FIGURE, "max-md:hidden")} />
            <span className="text-caption font-normal text-ink-muted md:hidden">{sideCaption("DENA", "{side} · {who}")}</span>
          </Card>
        </div>
      </section>

      <div className="flex flex-col gap-4 md:flex-1">
          {/* Phone: the direction switch above the list, as the board has it. */}
          {rows.length > 0 && (
            <SegmentedControl
              options={[
                { value: "ALL" as Tab, label: counted(t("All"), counts.ALL) },
                { value: "PAWNA" as Tab, label: t("Owe you") },
                { value: "DENA" as Tab, label: t("You owe") },
                { value: "SETTLED" as Tab, label: t("Settled") },
              ]}
              value={tab}
              onChange={setTab}
              label={t("Balance")}
              size="coarse"
              stretch
              className="md:hidden"
            />
          )}
          <ListCard
            label={t("Loans")}
            header={
              <div className="hidden items-center justify-between gap-4 px-6 py-3.5 md:flex">
                <SegmentedControl options={tabs} value={tab} onChange={setTab} label={t("Balance")} className="rounded-full p-1" itemClassName="gap-1.5 px-3 not-aria-pressed:text-ink-2" />
                <div className="flex min-w-0 flex-1 gap-2.5 lg:ml-4">
                  <Input size="sm" type="search" value={search} onChange={(event) => setSearch(event.target.value)} leading={<Search />} placeholder={t("Search name or phone…")} aria-label={t("Search by name or phone")} frameClassName="min-w-0 flex-1" />
                  <SortMenu value={sort} onChange={setSort} />
                </div>
              </div>
            }
            className="max-md:shadow-none md:flex md:min-h-65 md:flex-1 md:flex-col"
            tableClassName="md:flex md:flex-1 md:flex-col md:border-t md:border-line"
          >
            <ListHead columns={COLUMNS} className="md:hidden xl:grid xl:h-9">
              <ListHeadCell>{t("Bank / person")}</ListHeadCell>
              <ListHeadCell align="end">{t("Opening")}</ListHeadCell>
              <ListHeadCell align="end">{t("Money in@@loan")}</ListHeadCell>
              <ListHeadCell align="end">{t("Money out@@loan")}</ListHeadCell>
              <ListHeadCell align="end">{t("Profit paid")}</ListHeadCell>
              <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
            </ListHead>
            {shown.length === 0 && (
              <BalancesEmpty
                none={rows.length === 0}
                query={search.trim()}
                tab={tab}
                onClear={() => setSearch("")}
                onShowAll={() => setTab("ALL")}
                onAdd={canManage ? () => setContactOpen(true) : undefined}
              />
            )}
            {shown.map((row) => (
              <DashboardRow key={row.contactId} row={row} contact={contactsById.get(row.contactId)} currency={currency} />
            ))}
            {shown.length > 0 && (
              <ListTotalRow columns={COLUMNS} className="hidden xl:mt-auto xl:grid">
                <ListCell className="truncate">{t(shown.length === 1 ? "Net · {count} contact" : "Net · {count} contacts", { count: formatCount(shown.length, fmt) })}</ListCell>
                <ListCell align="end">
                  <AmountText value={sums.opening} currency={currency} signed size="sm" className="font-semibold" />
                </ListCell>
                <ListCell align="end" className="tabular-nums">
                  {formatCurrency(sums.in, currency, fmt)}
                </ListCell>
                <ListCell align="end" className="tabular-nums">
                  {formatCurrency(sums.out, currency, fmt)}
                </ListCell>
                <ListCell align="end" className="flex flex-col items-end gap-px tabular-nums">
                  {formatCurrency(sums.profit, currency, fmt)}
                  {sums.got > 0 && <span className="text-[11.5px] font-medium text-income">{t("+ {amount} received", { amount: formatCurrency(sums.got, currency, fmt) })}</span>}
                </ListCell>
                <ListCell align="end">
                  <AmountText value={sums.net} currency={currency} tone="auto" signed size="sm" className={cn("text-body font-bold", sums.net < 0 && "text-expense-fill")} />
                </ListCell>
              </ListTotalRow>
            )}
            {/* Tablet and small laptop: the Net, under the balance column. */}
            {shown.length > 0 && <ListTotalRow label={t("Net")} value={<AmountText value={sums.net} currency={currency} signed size="sm" className="text-body font-bold" />} className="hidden md:mt-auto md:flex xl:hidden" />}
          </ListCard>
          {phoneEntryButtons}
      </div>

      <LoanContactDrawer open={contactOpen} onClose={() => setContactOpen(false)} businessId={businessId} editing={null} currency={currency} canTrade={canTrade} />
      <LoanEntryDrawer open={entry !== null} onClose={() => setEntry(null)} businessId={businessId} contacts={activeContacts} currency={currency} initialKind={entry?.kind} />
    </PageFrame>
  );
}

// The two figures on a phone: flat cards, a 13px label, 18px bold on a
// 1.2 line; two to a row up to xl (a lakh or crore needs the room), 22px
// there and the board's 28px from xl.
const PHONE_FIGURE_CARD = "flex min-w-0 flex-col gap-1 max-md:shadow-none md:gap-2 md:p-5";
const PHONE_FIGURE_LABEL = "text-small font-medium text-ink-muted max-md:font-normal";
const PHONE_FIGURE = "text-h3 wrap-anywhere max-md:leading-[1.2] max-md:font-bold md:text-h2 xl:text-h1";
const KPI_FIGURE = "text-[26px] font-bold tracking-[-0.02em] whitespace-nowrap leading-[normal]";

// A side's card: a dot, its name and how many are on it, the figure and
// what it means; pressing it shows only that side (Net: everyone).
const KPI_TONE = {
  PAWNA: { label: "text-income", dot: "bg-income", on: "border-income ring-3 ring-income-soft" },
  DENA: { label: "text-expense-fill", dot: "bg-expense-fill", on: "border-expense-fill ring-3 ring-expense-soft" },
  ALL: { label: "text-ink-muted", dot: "", on: "border-emerald ring-3 ring-emerald-soft" },
} as const;

function KpiCard({ on, side, onPick, title, label, count, sub, children }: { on: boolean; side: keyof typeof KPI_TONE; onPick: () => void; title: string; label: string; count: number; sub: string; children: React.ReactNode }) {
  const { t, fmt } = useLocale();
  const tone = KPI_TONE[side];
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      title={title}
      className={cn("flex min-w-0 flex-col gap-1 rounded-[18px] border bg-surface px-5 py-4 text-left leading-[normal] text-ink shadow-card transition-[border-color,box-shadow] hover:border-input", on ? tone.on : "border-line-card")}
    >
      <span className={cn("flex w-full items-center justify-between gap-2 text-[13px] font-semibold", tone.label)}>
        <span className="flex items-center gap-1.75">
          {tone.dot && <span aria-hidden="true" className={cn("size-2 rounded-full", tone.dot)} />}
          {label}
        </span>
        <span className="text-[12px] font-medium text-ink-faint">{t(count === 1 ? "{count} contact" : "{count} contacts", { count: formatCount(count, fmt) })}</span>
      </span>
      {children}
      <span className="text-[12.5px] text-ink-muted">{sub}</span>
    </button>
  );
}

// This month's loan money: lent, borrowed, money back both ways and the
// profit, each greyed while it is nothing.
const MONTH_TONE = { income: "text-income", expense: "text-expense", warning: "text-warning" };

function MonthStrip({ month, today, currency }: { month: LoanMonth | undefined; today: string; currency: string }) {
  const { t, fmt } = useLocale();
  const items = monthItems(month).map((item) => ({ ...item, label: t(item.label), value: formatCurrency(item.amount, currency, fmt) }));
  const entries = month?.entries ?? 0;
  return (
    <div
      role="group"
      aria-label={t("Loan activity this month")}
      title={items.map((item) => `${item.label} ${item.value}`).join(" · ")}
      className="flex h-14 min-w-0 flex-1 items-center gap-4.5 overflow-hidden rounded-[16px] border border-line-card bg-surface px-4.5 whitespace-nowrap tabular-nums leading-[normal]"
    >
      <span className="flex shrink-0 items-center gap-2.5">
        <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-[10px] bg-surface-sunken text-ink-muted">
          <CalendarDays className="size-4" strokeWidth={2} />
        </span>
        <span className="flex flex-col gap-px">
          <span className="text-[13px] font-semibold text-ink">{t("This month@@loan")}</span>
          <span className="text-[11.5px] text-ink-faint">
            {formatDate(today, "MMMM", fmt)} · {entries ? t(entries === 1 ? "{count} entry" : "{count} entries", { count: formatCount(entries, fmt) }) : t("no entries yet")}
          </span>
        </span>
      </span>
      <span aria-hidden="true" className="h-7 w-px shrink-0 bg-line" />
      {items.map((item) => (
        <span key={item.label} className="flex shrink-0 flex-col gap-px">
          <span className="text-[11.5px] text-ink-muted">{item.label}</span>
          <span className={cn("text-[13.5px] font-semibold", item.amount ? MONTH_TONE[item.tone] : "text-ink-faint")}>{item.value}</span>
        </span>
      ))}
    </div>
  );
}

// The order of the rows: a button with the sort icon and the choice, and
// its menu.
function SortMenu({ value, onChange }: { value: Sort; onChange: (next: Sort) => void }) {
  const { t } = useLocale();
  const current = SORTS.find((sort) => sort.value === value) ?? SORTS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`${t("Sort by")}: ${t(current.label)}`} className="flex h-9.5 shrink-0 items-center gap-2 rounded-field border border-input bg-surface px-3 text-[13px] font-medium whitespace-nowrap text-ink hover:border-ink-faint data-open:border-emerald">
        <ArrowDownWideNarrow className="size-4 text-ink-muted" aria-hidden="true" />
        {t(current.label)}
        <ChevronDown className="size-3.5 text-ink-muted" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-60 rounded-[12px] border border-line bg-surface p-1.5 shadow-overlay ring-0">
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as Sort)}>
          {SORTS.map((sort) => (
            <DropdownMenuRadioItem key={sort.value} value={sort.value} className={cn("min-h-10 justify-between rounded-[8px] px-2.5 text-[13.5px] [&>span:first-child]:hidden", sort.value === value ? "bg-emerald-soft/50 font-semibold" : "font-medium")}>
              {t(sort.label)}
              {sort.value === value && <Check className="size-3.5 text-emerald" strokeWidth={2.75} aria-hidden="true" />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// A contact with nothing entered yet: ৳ 0 everywhere, Settled.
function emptyRow(contact: Contact): LoanDashboardRow {
  const balance = Number(contact.currentBalance ?? contact.openingBalance ?? 0);
  return {
    contactId: contact.id,
    contactName: contact.name,
    contactPhone: contact.phone ?? null,
    openingBalance: String(contact.openingBalance ?? "0"),
    totalReceive: "0",
    totalPayment: "0",
    profitPaid: "0",
    profitReceived: "0",
    currentBalance: String(balance),
    direction: balance > 0 ? "PAWNA" : balance < 0 ? "DENA" : "SETTLED",
    entries: 0,
    lastEntry: null,
    firstEntryDate: null,
  };
}

// The board's empty table: no contacts yet, nobody matching the search, or
// nobody on the picked side; each with the way back.
function BalancesEmpty({ none, query, tab, onClear, onShowAll, onAdd }: { none: boolean; query: string; tab: Tab; onClear: () => void; onShowAll: () => void; onAdd?: () => void }) {
  const { t } = useLocale();
  const hasQuery = !none && query !== "";
  const hasTab = !none && tab !== "ALL";
  const button = "h-9.5 rounded-full border border-input bg-surface px-4 text-[13.5px] font-semibold text-ink hover:bg-page";
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-12 text-center leading-[normal]">
      <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-[14px] bg-page text-ink-muted">
        {none ? <UserPlus className="size-5.5" strokeWidth={2} /> : <Search className="size-5.5" strokeWidth={2} />}
      </span>
      <span className="text-[15px] font-semibold text-ink">{none ? t("No loan contacts yet") : hasQuery ? t("No one matches “{query}”", { query }) : t("No one here right now")}</span>
      <span className="max-w-105 text-[13px] leading-normal text-ink-muted">
        {none
          ? t("Add the people, shops, banks or NGOs you lend to or borrow from. Their balances show up here.")
          : hasQuery
            ? t(tab !== "ALL" ? "Try another name or phone number, or look in All." : "Try another name or phone number.")
            : t("No contact has this balance status.")}
      </span>
      <span className="mt-1 flex gap-2">
        {hasQuery && (
          <button type="button" onClick={onClear} className={button}>
            {t("Clear search")}
          </button>
        )}
        {hasTab && (
          <button type="button" onClick={onShowAll} className={button}>
            {t("Show all")}
          </button>
        )}
        {none && onAdd && (
          <Button onClick={onAdd} className="h-9.5 px-4 text-[13.5px]">
            {t("Add contact")}
          </Button>
        )}
      </span>
    </div>
  );
}

// One contact: the phone's two lines (who, then where it stands) below xl,
// plus a line of its figures from md, and the board's columns from xl. The name is the link, stretched over the row.
function DashboardRow({ row, contact, currency }: { row: LoanDashboardRow; contact?: Contact; currency: string }) {
  const { t, fmt } = useLocale();
  const meta = DIRECTION_META[row.direction];
  const settled = row.direction === "SETTLED";
  const sub = [row.contactPhone, contact?.notes].filter(Boolean).join(" · ");
  // The figures the xl columns show, those that are not nothing.
  const movements = [
    Number(row.openingBalance) !== 0 && `${t("Opening")} ${formatSignedCurrency(row.openingBalance, currency, fmt)}`,
    Number(row.totalReceive) !== 0 && `${t("Money in@@loan")} ${formatCurrency(Math.abs(Number(row.totalReceive)), currency, fmt)}`,
    Number(row.totalPayment) !== 0 && `${t("Money out@@loan")} ${formatCurrency(Math.abs(Number(row.totalPayment)), currency, fmt)}`,
    Number(row.profitPaid) !== 0 && `${t("Profit paid")} ${formatCurrency(Math.abs(Number(row.profitPaid)), currency, fmt)}`,
  ].filter(Boolean);
  return (
    <ListRow columns={COLUMNS} density="relaxed" className="xl:min-h-15">
      <ListCell className="flex min-w-0 items-center gap-3">
        <PersonAvatar name={row.contactName} src={contact?.photoUrl} kind={contact?.type} size={40} coloured className="xl:hidden" />
        <PersonAvatar name={row.contactName} src={contact?.photoUrl} kind={contact?.type} size={36} initials={wordInitials(row.contactName)} className="hidden xl:inline-flex" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <ListRowLink href={`/loan-management/ledger?contactId=${row.contactId}`} className="truncate text-title text-ink xl:text-body xl:font-semibold">
              {row.contactName}
            </ListRowLink>
            {contact && (
              <Chip tone="neutral" size="sm" className="hidden h-auto bg-page py-px font-semibold xl:inline-flex">
                {t(LOAN_KIND_LABELS[contact.type])}
              </Chip>
            )}
          </span>
          <span className="truncate text-caption font-normal text-ink-muted xl:hidden">{contact ? [t(LOAN_KIND_LABELS[contact.type]), contact.notes].filter(Boolean).join(" · ") : (row.contactPhone ?? "")}</span>
          {/* The number and what the loan is ("House loan"), as the board joins them. */}
          {sub && <span className="hidden truncate text-[12px] text-ink-muted xl:block">{sub}</span>}
          {/* Tablet and small laptop: the board's four figures, on a line of their own. */}
          {movements.length > 0 && <span className="hidden truncate text-caption font-normal text-ink-muted tabular-nums md:block xl:hidden">{movements.join(" · ")}</span>}
        </span>
      </ListCell>
      <ListCell align="end" className="hidden xl:block">
        {/* Signed and coloured by side, so the column adds up to the Net below it. */}
        {Number(row.openingBalance) === 0 ? NOTHING : <span className={cn("tabular-nums", Number(row.openingBalance) > 0 ? "text-income" : "text-expense-fill")}>{formatSignedCurrency(row.openingBalance, currency, fmt)}</span>}
      </ListCell>
      <ListCell align="end" className="hidden xl:block">
        {figure(row.totalReceive, currency, fmt)}
      </ListCell>
      <ListCell align="end" className="hidden xl:block">
        {figure(row.totalPayment, currency, fmt)}
      </ListCell>
      <ListCell align="end" className="hidden flex-col items-end gap-px xl:flex">
        {figure(row.profitPaid, currency, fmt, "text-warning")}
        {Number(row.profitReceived) > 0 && <span className="text-[11.5px] text-income tabular-nums">{t("+ {amount} received", { amount: formatCurrency(row.profitReceived, currency, fmt) })}</span>}
      </ListCell>
      <ListCell align="end" className="flex flex-col items-end xl:flex-row xl:items-center xl:justify-end xl:gap-2">
        {settled ? (
          <b className="text-body-lg leading-[normal] font-bold text-ink-muted xl:hidden">{t("Settled")}</b>
        ) : (
          <b className={cn("text-body-lg leading-[normal] font-bold tabular-nums xl:text-body", meta.text)}>{formatCurrency(Math.abs(Number(row.currentBalance)), currency, fmt)}</b>
        )}
        {settled && <b className={cn("hidden text-body font-bold tabular-nums xl:inline", meta.text)}>{formatCurrency(0, currency, fmt)}</b>}
        {!settled && <span className="text-caption leading-[normal] font-normal text-ink-muted xl:hidden">{t(meta.short)}</span>}
        <Chip tone={meta.chip} size="sm" className={cn("hidden h-auto px-2 py-0.5 font-semibold xl:inline-flex", meta.tag)}>
          {t(meta.name)}
        </Chip>
      </ListCell>
    </ListRow>
  );
}
