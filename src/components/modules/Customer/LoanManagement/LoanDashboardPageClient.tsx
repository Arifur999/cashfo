"use client";

import { ArrowDownLeft, ArrowUpRight, HandCoins, Plus, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListRowLink, ListTotalRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { Contact, LoanBalanceDirection, LoanDashboard, LoanDashboardRow } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { contactMatches, DIRECTION_META, LOAN_KIND_LABELS, type LoanEntryKind, whoPhrase } from "@/lib/customer/loanDisplay";
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
}

type Tab = "ALL" | LoanBalanceDirection;
type Sort = "biggest" | "smallest" | "name";

// From xl the board's columns, a little narrower so a name keeps room
// beside the sidebar at 1280 (the opening a little wider, for its sign);
// below xl each row is the phone's two lines.
const COLUMNS = "xl:grid-cols-[minmax(0,1fr)_116px_116px_116px_104px_160px]";
const DIRECTIONS: LoanBalanceDirection[] = ["PAWNA", "DENA", "SETTLED"];
const DOT: Record<LoanBalanceDirection, string> = { PAWNA: "var(--income)", DENA: "var(--expense-fill)", SETTLED: "var(--ink-muted)" };

// A grey dash for nothing, else the figure (in the column's own colour).
const NOTHING = <span className="text-ink-muted">—</span>;
const figure = (value: string, currency: string, locale: FormatLocale, className?: string) => (Number(value) === 0 ? NOTHING : <span className={cn("text-ink tabular-nums", className)}>{formatCurrency(Math.abs(Number(value)), currency, locale)}</span>);

// Loans: what you are owed and what you owe, then everyone with a balance,
// filtered by direction. Rows open the statement.
export function LoanDashboardPageClient({ businessId, dashboard, contacts, currency, canManage, canTrade }: LoanDashboardPageClientProps) {
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
  const rows = dashboard.rows.filter((row) => contactsById.has(row.contactId));
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
    .sort((a, b) => (sort === "name" ? a.contactName.localeCompare(b.contactName) : (Math.abs(Number(b.currentBalance)) - Math.abs(Number(a.currentBalance))) * (sort === "biggest" ? 1 : -1)));
  const sums = shown.reduce((sum, row) => ({ opening: sum.opening + Number(row.openingBalance), in: sum.in + Number(row.totalReceive), out: sum.out + Number(row.totalPayment), profit: sum.profit + Number(row.profitPaid), net: sum.net + Number(row.currentBalance) }), { opening: 0, in: 0, out: 0, profit: 0, net: 0 });

  const counted = (label: string, count: number) => (
    <>
      {label} <span className="font-medium text-ink-muted tabular-nums">{formatCount(count, fmt)}</span>
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
    <PageFrame className="md:gap-6">
      {/* The board has no title from md: the topbar names the page. */}
      <PageHeader
        eyebrow={t("Loans")}
        tone="loans"
        title={t("Dena-pawna")}
        description={t("Who you owe, and who owes you.")}
        className="md:hidden"
      />
      <h1 className="hidden md:block md:sr-only">{t("Loans & Dena-Pawna")}</h1>

      {/* From md the board's three figures across the page. */}
      <section>
        <div className="grid min-w-0 grid-cols-2 gap-2 md:grid-cols-3 md:gap-4">
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
          <Card className="hidden min-w-0 flex-col gap-2 md:flex">
            <span className="text-small font-medium text-ink-muted">{t("Net position")}</span>
            <AmountText value={net} currency={currency} size="h2" signed className={DESK_FIGURE} />
          </Card>
        </div>
      </section>

      {contacts.length === 0 ? (
        <EmptyState
          tone="loans"
          icon={<HandCoins />}
          title={t("Nothing outstanding")}
          description={t("Add a bank or person, then record the loan you gave or took.")}
          action={
            canManage && (
              <Button onClick={() => setContactOpen(true)}>
                <UserPlus />
                {t("Add bank / person")}
              </Button>
            )
          }
          className="min-h-80"
        />
      ) : rows.length === 0 ? (
        // People are added, but no loan is recorded yet: the next step is the entry.
        <div className="flex flex-col gap-4">
          <EmptyState
            tone="loans"
            icon={<HandCoins />}
            title={t("No loans recorded yet")}
            description={t("Record the loan you gave or took, and everyone with a balance shows up here.")}
            action={
              canManage && (
                <>
                  {activeContacts.length > 0 && (
                    <Button onClick={() => setEntry({})} className="max-md:hidden">
                      <Plus strokeWidth={2.5} className="size-4" />
                      {t("New loan entry")}
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setContactOpen(true)}>
                    <UserPlus className="text-ink-2" />
                    {t("Add bank / person")}
                  </Button>
                </>
              )
            }
            className="min-h-80"
          />
          {phoneEntryButtons}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Phone: the direction switch above the list, as the board has it. */}
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
          <ListCard
            label={t("Loans")}
            header={
              <div className="hidden flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 md:flex">
                <SegmentedControl options={tabs} value={tab} onChange={setTab} label={t("Balance")} />
                <div className="flex w-full flex-wrap gap-3 md:w-auto">
                  <Input size="sm" type="search" value={search} onChange={(event) => setSearch(event.target.value)} leading={<Search />} placeholder={t("Search name or phone…")} aria-label={t("Search by name or phone")} frameClassName="w-full md:w-60" />
                  <NativeSelect size="sm" value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label={t("Sort")} className="text-small">
                    <option value="biggest">{t("Biggest balance first")}</option>
                    <option value="smallest">{t("Smallest balance first")}</option>
                    <option value="name">{t("Name A–Z")}</option>
                  </NativeSelect>
                </div>
              </div>
            }
            className="max-md:shadow-none"
          >
            <ListHead columns={COLUMNS} className="md:hidden xl:grid">
              <ListHeadCell>{t("Bank / person")}</ListHeadCell>
              <ListHeadCell align="end">{t("Opening")}</ListHeadCell>
              <ListHeadCell align="end">{t("Money in@@loan")}</ListHeadCell>
              <ListHeadCell align="end">{t("Money out@@loan")}</ListHeadCell>
              <ListHeadCell align="end">{t("Profit paid")}</ListHeadCell>
              <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
            </ListHead>
            {shown.length === 0 && <ListEmpty title={t("No one matches")} />}
            {shown.map((row) => (
              <DashboardRow key={row.contactId} row={row} contact={contactsById.get(row.contactId)} currency={currency} />
            ))}
            {shown.length > 0 && (
              <ListTotalRow columns={COLUMNS} className="hidden xl:grid">
                <ListCell>{t("Net")}</ListCell>
                <ListCell align="end">
                  <AmountText value={sums.opening} currency={currency} signed size="sm" className="font-semibold" />
                </ListCell>
                <ListCell align="end" className="tabular-nums">
                  {formatCurrency(sums.in, currency, fmt)}
                </ListCell>
                <ListCell align="end" className="tabular-nums">
                  {formatCurrency(sums.out, currency, fmt)}
                </ListCell>
                <ListCell align="end" className="tabular-nums">
                  {formatCurrency(sums.profit, currency, fmt)}
                </ListCell>
                <ListCell align="end">
                  <AmountText value={sums.net} currency={currency} signed size="sm" className="text-body font-bold" />
                </ListCell>
              </ListTotalRow>
            )}
            {/* Tablet and small laptop: the Net, under the balance column. */}
            {shown.length > 0 && <ListTotalRow label={t("Net")} value={<AmountText value={sums.net} currency={currency} signed size="sm" className="text-body font-bold" />} className="hidden md:flex xl:hidden" />}
          </ListCard>
          {phoneEntryButtons}
        </div>
      )}

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
const DESK_FIGURE = "wrap-anywhere xl:text-h1";

// One contact: the phone's two lines (who, then where it stands) below xl,
// plus a line of its figures from md, and the board's columns from xl. The name is the link, stretched over the row.
function DashboardRow({ row, contact, currency }: { row: LoanDashboardRow; contact?: Contact; currency: string }) {
  const { t, fmt } = useLocale();
  const meta = DIRECTION_META[row.direction];
  const settled = row.direction === "SETTLED";
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
        <PersonAvatar name={row.contactName} src={contact?.photoUrl} kind={contact?.type} size={36} className="hidden xl:inline-flex" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <ListRowLink href={`/loan-management/ledger?contactId=${row.contactId}`} className="truncate text-title text-ink xl:text-body xl:font-medium">
              {row.contactName}
            </ListRowLink>
            {contact && (
              <Chip tone="neutral" size="sm" className="hidden font-semibold xl:inline-flex">
                {t(LOAN_KIND_LABELS[contact.type])}
              </Chip>
            )}
          </span>
          <span className="truncate text-caption font-normal text-ink-muted xl:hidden">{contact ? [t(LOAN_KIND_LABELS[contact.type]), contact.notes].filter(Boolean).join(" · ") : (row.contactPhone ?? "")}</span>
          {/* A bank or NGO by what the loan is ("House loan"), a person by their number. */}
          <span className="hidden truncate text-caption font-normal text-ink-muted xl:block">{(contact && (contact.type === "BANK" || contact.type === "NGO") && contact.notes) || row.contactPhone || contact?.email || contact?.address || "—"}</span>
          {/* Tablet and small laptop: the board's four figures, on a line of their own. */}
          {movements.length > 0 && <span className="hidden truncate text-caption font-normal text-ink-muted tabular-nums md:block xl:hidden">{movements.join(" · ")}</span>}
        </span>
      </ListCell>
      <ListCell align="end" className="hidden xl:block">
        {/* Signed and coloured by side, so the column adds up to the Net below it. */}
        {Number(row.openingBalance) === 0 ? NOTHING : <span className={cn("tabular-nums", Number(row.openingBalance) > 0 ? "text-income" : "text-expense")}>{formatSignedCurrency(row.openingBalance, currency, fmt)}</span>}
      </ListCell>
      <ListCell align="end" className="hidden xl:block">
        {figure(row.totalReceive, currency, fmt)}
      </ListCell>
      <ListCell align="end" className="hidden xl:block">
        {figure(row.totalPayment, currency, fmt)}
      </ListCell>
      <ListCell align="end" className="hidden xl:block">
        {figure(row.profitPaid, currency, fmt, "text-warning")}
      </ListCell>
      <ListCell align="end" className="flex flex-col items-end xl:flex-row xl:items-center xl:justify-end xl:gap-2">
        {settled ? (
          <b className="text-body-lg leading-[normal] font-bold text-ink-muted xl:hidden">{t("Settled")}</b>
        ) : (
          <b className={cn("text-body-lg leading-[normal] font-bold tabular-nums xl:text-body", meta.text)}>{formatCurrency(Math.abs(Number(row.currentBalance)), currency, fmt)}</b>
        )}
        {settled && <b className={cn("hidden text-body font-bold tabular-nums xl:inline", meta.text)}>{formatCurrency(0, currency, fmt)}</b>}
        {!settled && <span className="text-caption leading-[normal] font-normal text-ink-muted xl:hidden">{t(meta.short)}</span>}
        <Chip tone={meta.chip} size="sm" className="hidden font-semibold xl:inline-flex">
          {t(meta.name)}
        </Chip>
      </ListCell>
    </ListRow>
  );
}
