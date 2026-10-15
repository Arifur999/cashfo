"use client";

import { ArrowDownLeft, ArrowUpRight, HandCoins, Plus, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { Contact, LoanBalanceDirection, LoanDashboard, LoanDashboardRow } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { DIRECTION_META, LOAN_KIND_LABELS, type LoanEntryKind } from "@/lib/customer/loanDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import { LoanContactDrawer } from "./LoanContactDrawer";
import { LoanEntryDrawer } from "./LoanEntryDrawer";

interface LoanDashboardPageClientProps {
  businessId: string;
  dashboard: LoanDashboard;
  // The loan contacts, for each row's kind and photo.
  contacts: Contact[];
  currency: string;
  canManage: boolean;
}

type Tab = "ALL" | LoanBalanceDirection;
type Sort = "biggest" | "smallest" | "name";

const GRID = "grid-cols-[minmax(0,1fr)_120px_130px_130px_170px]";
const DIRECTIONS: LoanBalanceDirection[] = ["PAWNA", "DENA", "SETTLED"];
const DOT: Record<LoanBalanceDirection, string> = { PAWNA: "var(--income)", DENA: "var(--expense-fill)", SETTLED: "var(--ink-muted)" };

// A dash for nothing, else the figure.
const figure = (value: string, currency: string, className?: string) => (Number(value) === 0 ? <span className={cn("text-right text-ink-muted", className)}>—</span> : <span className={cn("text-right text-ink tabular-nums", className)}>{formatCurrency(Math.abs(Number(value)), currency)}</span>);

// Loans: what you are owed and what you owe, then everyone with a balance,
// filtered by direction. Rows open the statement.
export function LoanDashboardPageClient({ businessId, dashboard, contacts, currency, canManage }: LoanDashboardPageClientProps) {
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("biggest");
  const [contactOpen, setContactOpen] = useState(false);
  const [entry, setEntry] = useState<{ kind?: LoanEntryKind } | null>(null);

  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
  const counts = { ALL: dashboard.rows.length, ...Object.fromEntries(DIRECTIONS.map((direction) => [direction, dashboard.rows.filter((row) => row.direction === direction).length])) } as Record<Tab, number>;
  const q = search.trim().toLowerCase();
  const shown = dashboard.rows
    .filter((row) => tab === "ALL" || row.direction === tab)
    .filter((row) => !q || row.contactName.toLowerCase().includes(q) || (row.contactPhone ?? "").includes(q))
    .sort((a, b) => (sort === "name" ? a.contactName.localeCompare(b.contactName) : (Math.abs(Number(b.currentBalance)) - Math.abs(Number(a.currentBalance))) * (sort === "biggest" ? 1 : -1)));
  const sums = shown.reduce((sum, row) => ({ opening: sum.opening + Number(row.openingBalance), in: sum.in + Number(row.totalReceive), out: sum.out + Number(row.totalPayment), net: sum.net + Number(row.currentBalance) }), { opening: 0, in: 0, out: 0, net: 0 });
  const net = Number(dashboard.netBalance);

  const tabs = [{ value: "ALL" as Tab, label: counted(t("All"), counts.ALL) }, ...DIRECTIONS.map((direction) => ({ value: direction as Tab, label: counted(t(DIRECTION_META[direction].name), counts[direction]), dot: DOT[direction] }))];

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={t("Loans")}
        tone="loans"
        title={
          <>
            <span className="md:hidden">{t("Dena-pawna")}</span>
            <span className="hidden md:inline">{t("Loans")}</span>
          </>
        }
        description={
          <>
            <span className="md:hidden">{t("Who you owe, and who owes you.")}</span>
            <span className="hidden md:inline">{t("Who owes you, and whom you owe: people, banks and NGOs.")}</span>
          </>
        }
        actions={
          canManage && (
            <div className="hidden items-center gap-3 md:flex">
              <Button variant="secondary" onClick={() => setContactOpen(true)}>
                <UserPlus className="text-ink-2" />
                {t("Add bank / person")}
              </Button>
              <Button onClick={() => setEntry({})}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("New loan entry")}
              </Button>
            </div>
          )
        }
        className="max-md:gap-0"
      />

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        <Card padding="sm" className="flex flex-col gap-1 md:gap-2 md:p-5">
          <span className="text-small font-medium text-ink-muted">
            <span className="md:hidden">{t("Owed to you")}</span>
            <span className="hidden md:inline">
              {t("You'll receive")} · <span className="font-semibold text-income">{t("Pawna")}</span>
            </span>
          </span>
          <AmountText value={Math.abs(Number(dashboard.totalPawna))} currency={currency} size="h2" tone="income" className="text-h3 whitespace-nowrap md:text-h1" />
          <span className="text-caption font-normal text-ink-muted">
            <span className="md:hidden">
              {t("Pawna")} · {counts.PAWNA} {t("people")}
            </span>
            <span className="hidden md:inline">
              {counts.PAWNA} {t(counts.PAWNA === 1 ? "contact" : "contacts")}
            </span>
          </span>
        </Card>
        <Card padding="sm" className="flex flex-col gap-1 md:gap-2 md:p-5">
          <span className="text-small font-medium text-ink-muted">
            <span className="md:hidden">{t("You owe")}</span>
            <span className="hidden md:inline">
              {t("You owe")} · <span className="font-semibold text-expense">{t("Dena")}</span>
            </span>
          </span>
          <AmountText value={Math.abs(Number(dashboard.totalDena))} currency={currency} size="h2" tone="expense" className="text-h3 whitespace-nowrap md:text-h1" />
          <span className="text-caption font-normal text-ink-muted">
            <span className="md:hidden">
              {t("Dena")} · {counts.DENA} {t("people")}
            </span>
            <span className="hidden md:inline">
              {counts.DENA} {t(counts.DENA === 1 ? "contact" : "contacts")}
            </span>
          </span>
        </Card>
        <Card className="hidden flex-col gap-2 md:flex">
          <span className="text-small font-medium text-ink-muted">{t("Net position")}</span>
          <AmountText value={net} currency={currency} size="h2" signed className="text-h1" />
          <span className="text-caption font-normal text-ink-muted">{net > 0 ? t("You're owed more than you owe") : net < 0 ? t("You owe more than you're owed") : t("All square")}</span>
        </Card>
        <Card className="hidden flex-col gap-2 md:flex">
          <span className="text-small font-medium text-ink-muted">{t("Active accounts")}</span>
          <span className="text-h1 text-ink tabular-nums">{dashboard.activeAccounts}</span>
          <span className="text-caption font-normal text-ink-muted">{t("People and banks with a balance")}</span>
        </Card>
      </section>

      {dashboard.rows.length === 0 ? (
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
      ) : (
        <>
          <Card padding="none" className="hidden overflow-hidden md:block">
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <SegmentedControl options={tabs} value={tab} onChange={setTab} label={t("Balance")} />
              <div className="flex gap-3">
                <Input size="sm" type="search" value={search} onChange={(event) => setSearch(event.target.value)} leading={<Search />} placeholder={t("Search name or phone…")} aria-label={t("Search by name or phone")} frameClassName="w-60" />
                <NativeSelect size="sm" value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label={t("Sort")} className="text-small">
                  <option value="biggest">{t("Biggest balance first")}</option>
                  <option value="smallest">{t("Smallest balance first")}</option>
                  <option value="name">{t("Name A–Z")}</option>
                </NativeSelect>
              </div>
            </div>
            <div className={cn("grid items-center gap-x-4 border-y border-line bg-cream px-6 py-3 text-caption text-ink-muted", GRID)}>
              <span>{t("Bank / person")}</span>
              <span className="text-right">{t("Opening")}</span>
              <span className="text-right">{t("Money in")}</span>
              <span className="text-right">{t("Money out")}</span>
              <span className="text-right">{t("Balance")}</span>
            </div>
            {shown.length === 0 && <p className="px-6 py-10 text-center text-body text-ink-muted">{t("No one matches")}</p>}
            {shown.map((row) => (
              <DashboardRow key={row.contactId} row={row} contact={contactsById.get(row.contactId)} currency={currency} />
            ))}
            <div className={cn("grid h-13 items-center gap-x-4 bg-cream px-6 text-body font-semibold text-ink tabular-nums", GRID)}>
              <span>{t("Net")}</span>
              <span className="text-right">{formatCurrency(Math.abs(sums.opening), currency)}</span>
              <span className="text-right">{formatCurrency(sums.in, currency)}</span>
              <span className="text-right">{formatCurrency(sums.out, currency)}</span>
              <AmountText value={sums.net} currency={currency} signed size="sm" className="text-right text-body font-bold" />
            </div>
          </Card>

          {/* Phone: the direction switch, then one row per contact. */}
          <div className="flex flex-col gap-4 md:hidden">
            <SegmentedControl options={[{ value: "ALL" as Tab, label: counted(t("All"), counts.ALL) }, { value: "PAWNA" as Tab, label: t("Owe you") }, { value: "DENA" as Tab, label: t("You owe") }, { value: "SETTLED" as Tab, label: t("Settled") }]} value={tab} onChange={setTab} label={t("Balance")} stretch />
            <Card padding="none" elevated={false} className="overflow-hidden">
              {shown.length === 0 && <p className="px-4 py-8 text-center text-body text-ink-muted">{t("No one matches")}</p>}
              {shown.map((row, index) => {
                const meta = DIRECTION_META[row.direction];
                const contact = contactsById.get(row.contactId);
                return (
                  <Link key={row.contactId} href={`/loan-management/ledger?contactId=${row.contactId}`} className={cn("flex min-h-16 items-center gap-3 px-4", index > 0 && "border-t border-surface-sunken")}>
                    <PersonAvatar name={row.contactName} src={contact?.photoUrl} size={40} coloured />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <b className="truncate text-title text-ink">{row.contactName}</b>
                      <span className="text-caption font-normal text-ink-muted">{contact ? t(LOAN_KIND_LABELS[contact.type]) : (row.contactPhone ?? "")}</span>
                    </span>
                    {row.direction === "SETTLED" ? (
                      <b className="text-body font-bold text-ink-muted">{t("Settled")}</b>
                    ) : (
                      <span className="flex flex-col items-end">
                        <b className={cn("text-body font-bold tabular-nums", meta.text)}>{formatCurrency(Math.abs(Number(row.currentBalance)), currency)}</b>
                        <span className="text-caption font-normal text-ink-muted">{t(meta.short)}</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </Card>
            {canManage && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="xl" onClick={() => setEntry({ kind: "GIVE_LOAN" })} className="font-semibold">
                  <ArrowUpRight className="text-expense-fill" />
                  {t("Gave or lent")}
                </Button>
                <Button variant="secondary" size="xl" onClick={() => setEntry({ kind: "TAKE_LOAN" })} className="font-semibold">
                  <ArrowDownLeft className="text-income" />
                  {t("Took or borrowed")}
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <LoanContactDrawer open={contactOpen} onClose={() => setContactOpen(false)} businessId={businessId} editing={null} currency={currency} />
      <LoanEntryDrawer open={entry !== null} onClose={() => setEntry(null)} businessId={businessId} contacts={contacts.filter((contact) => contact.status === "ACTIVE")} currency={currency} initialKind={entry?.kind} />
    </PageFrame>
  );
}

function counted(label: string, count: number) {
  return (
    <>
      {label} <span className="font-medium text-ink-muted">{count}</span>
    </>
  );
}

function DashboardRow({ row, contact, currency }: { row: LoanDashboardRow; contact?: Contact; currency: string }) {
  const { t } = useLocale();
  const meta = DIRECTION_META[row.direction];
  return (
    <Link href={`/loan-management/ledger?contactId=${row.contactId}`} className={cn("grid h-15 items-center gap-x-4 border-b border-surface-sunken px-6 text-body text-ink transition-colors hover:bg-cream", GRID)}>
      <span className="flex min-w-0 items-center gap-3">
        <PersonAvatar name={row.contactName} src={contact?.photoUrl} size={36} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{row.contactName}</span>
            {contact && (
              <Chip tone="neutral" size="sm" className="font-semibold">
                {t(LOAN_KIND_LABELS[contact.type])}
              </Chip>
            )}
          </span>
          <span className="text-caption font-normal text-ink-muted">{row.contactPhone ?? contact?.address ?? "—"}</span>
        </span>
      </span>
      {figure(row.openingBalance, currency, "text-ink-2")}
      {figure(row.totalReceive, currency)}
      {figure(row.totalPayment, currency)}
      <span className="flex items-center justify-end gap-2">
        <span className={cn("font-bold tabular-nums", meta.text)}>{formatCurrency(Math.abs(Number(row.currentBalance)), currency)}</span>
        <Chip tone={meta.chip} size="sm" className="font-semibold">
          {t(meta.name)}
        </Chip>
      </span>
    </Link>
  );
}
