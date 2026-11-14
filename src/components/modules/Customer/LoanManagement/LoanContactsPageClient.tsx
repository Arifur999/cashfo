"use client";

import { ArchiveRestore, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import IconAction from "@/components/smartly/IconAction";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import LoadMore from "@/components/smartly/LoadMore";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { Contact, ContactType, LoanBalanceDirection, LoanDashboardRow } from "@/lib/customer/api";
import { createContactAction, deleteContactAction, unarchiveContactAction } from "@/lib/customer/contactActions";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { contactMatches, DIRECTION_META, lastActivity, LOAN_KIND_LABELS, LOAN_KINDS, loanDirection, loanErrorText, wordInitials } from "@/lib/customer/loanDisplay";
import { getAppToday } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import { useStoredChoice } from "@/components/modules/Customer/Balance/useStoredChoice";
import { ViewToggle, type ListView } from "@/components/modules/Customer/Shared/ViewToggle";
import { LoanContactDrawer } from "./LoanContactDrawer";
import { LoanContactsTable } from "./LoanContactsTable";
import { LoanDeleteDialog } from "./LoanDeleteDialog";
import { offerUndo } from "./offerUndo";

interface LoanContactsPageClientProps {
  businessId: string;
  // Every loan contact, archived ones too (all pages of the API).
  contacts: Contact[];
  currency: string;
  canManage: boolean;
  // A business workspace, where a contact can be moved to Books' trade list.
  canTrade: boolean;
  // Each contact's entries and what happened last (the dashboard's rows).
  activity: LoanDashboardRow[];
}

type Tab = "ALL" | LoanBalanceDirection | "ARCHIVED";
const DIRECTIONS: LoanBalanceDirection[] = ["PAWNA", "DENA", "SETTLED"];
// Cards come 24 at a time; the totals above them count everyone.
const STEP = 24;
const GRID_ID = "loan-people";
// The board's table first, then the cards.
const VIEWS: readonly ListView[] = ["table", "cards"];

// People & banks: everyone you have dena-pawna with, one card each with
// where the balance stands, Edit and Delete. Archived
// contacts wait in their own tab, out of the counts.
export function LoanContactsPageClient({ businessId, contacts, currency, canManage, canTrade, activity }: LoanContactsPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ALL");
  const [kind, setKind] = useState<ContactType | "">("");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<"closed" | "create" | Contact>("closed");
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useStoredChoice<ListView>("smartly-loan-contacts-view", VIEWS, "table");
  const activityOf = new Map(activity.map((row) => [row.contactId, row]));

  const active = contacts.filter((contact) => contact.status === "ACTIVE");
  const archived = contacts.filter((contact) => contact.status === "ARCHIVED");
  // The archived tab goes once nobody is archived; its filter goes with it.
  const currentTab: Tab = tab === "ARCHIVED" && archived.length === 0 ? "ALL" : tab;
  const counts = { ALL: active.length, ...Object.fromEntries(DIRECTIONS.map((direction) => [direction, active.filter((contact) => loanDirection(contact.currentBalance) === direction).length])) } as Record<Exclude<Tab, "ARCHIVED">, number>;
  const pawna = active.reduce((sum, contact) => sum + Math.max(0, Number(contact.currentBalance)), 0);
  const dena = active.reduce((sum, contact) => sum + Math.max(0, -Number(contact.currentBalance)), 0);
  const shown = (currentTab === "ARCHIVED" ? archived : active)
    .filter((contact) => currentTab === "ALL" || currentTab === "ARCHIVED" || loanDirection(contact.currentBalance) === currentTab)
    .filter((contact) => !kind || contact.type === kind)
    .filter((contact) => contactMatches(contact.name, contact.phone, search))
    // Biggest balance first, either way, as the board lists them.
    .sort((a, b) => Math.abs(Number(b.currentBalance)) - Math.abs(Number(a.currentBalance)));
  const shownPawna = shown.reduce((sum, contact) => sum + Math.max(0, Number(contact.currentBalance)), 0);
  const shownDena = shown.reduce((sum, contact) => sum + Math.max(0, -Number(contact.currentBalance)), 0);

  // How many cards are out, for the filters they were grown under: a new
  // filter starts again at the first 24.
  const filterKey = `${currentTab}|${kind}|${search.trim()}`;
  const [grown, setGrown] = useState({ key: filterKey, count: STEP });
  const visible = grown.key === filterKey ? grown.count : STEP;

  // Back on the active list, the entry form and the counts.
  function restore(contact: Contact) {
    startTransition(async () => {
      try {
        const result = await unarchiveContactAction(businessId, contact.id);
        if (result.success) {
          toast.success(t("Contact restored"));
          router.refresh();
        } else {
          toast.error(loanErrorText(result.message, "Failed to restore contact", t, (amount) => formatCurrency(amount, currency, fmt)));
        }
      } catch {
        toast.error(t("Couldn't save. Check your connection and try again."));
      }
    });
  }

  // Added by mistake and never used: gone for good, with the balance they
  // were added with (the popup names it), and Undo adds them back. With
  // entries the popup says why not and points to Transactions.
  function remove(contact: Contact) {
    setDeleting(contact);
  }

  function confirmRemove(contact: Contact) {
    startTransition(async () => {
      try {
        const result = await deleteContactAction(businessId, contact.id);
        if (!result.success) {
          toast.error(loanErrorText(result.message, "Failed to remove contact", t, (amount) => formatCurrency(amount, currency, fmt)));
          return;
        }
        setDeleting(null);
        router.refresh();
        if (result.data?.action === "archived") {
          toast.success(t("This contact has transaction history, so it was archived instead"));
          return;
        }
        offerUndo({
          message: t("{name} deleted", { name: contact.name }),
          run: () =>
            createContactAction(businessId, {
              name: contact.name,
              type: contact.type,
              category: contact.category,
              phone: contact.phone || undefined,
              email: contact.email || undefined,
              address: contact.address || undefined,
              notes: contact.notes || undefined,
              photoUrl: contact.photoUrl || undefined,
              openingBalance: Number(contact.openingBalance) ? String(contact.openingBalance) : undefined,
            }),
          done: t("Contact restored"),
          failed: t("Couldn't add the contact back"),
          undoLabel: t("Undo"),
          refresh: () => router.refresh(),
        });
      } catch {
        toast.error(t("Couldn't save. Check your connection and try again."));
      }
    });
  }

  const counted = (label: string, count: number) => (
    <>
      {label} <span className="text-ink-faint in-aria-pressed:text-emerald">{formatCount(count, fmt)}</span>
    </>
  );
  const tabs = [
    { value: "ALL" as Tab, label: counted(t("All"), counts.ALL) },
    ...DIRECTIONS.map((direction) => ({ value: direction as Tab, label: counted(t(DIRECTION_META[direction].name), counts[direction]) })),
    ...(archived.length > 0 ? [{ value: "ARCHIVED" as Tab, label: counted(t("Archived@@tab"), archived.length) }] : []),
  ];

  // "Got money back 16 Sep", with the year once it isn't this one.
  const thisYear = getAppToday().slice(0, 4);
  const dayOf = (date: string) => formatDate(date, formatDate(date, "yyyy") === thisYear ? "d MMM" : "d MMM yyyy", fmt);
  const lastOf = (contact: Contact) => {
    const row = activityOf.get(contact.id);
    // An older backend without the activity: the card's line.
    if (!row || row.lastEntry === undefined) return lastLine(contact);
    const last = lastActivity({ ...row, currentBalance: contact.currentBalance });
    return t(last.key, { date: last.date ? dayOf(last.date) : "" });
  };
  const lastLine = (contact: Contact) => {
    if (contact.lastActivityAt === undefined) return t("Added {date}", { date: formatDate(contact.createdAt, undefined, fmt) });
    // Never an entry: what they were added with, when there was something.
    if (!contact.lastActivityAt) return Number(contact.openingBalance) !== 0 ? t("Opening balance") : t("No entries yet");
    const sameYear = formatDate(contact.lastActivityAt, "yyyy") === thisYear;
    return t("Last entry {date}", { date: formatDate(contact.lastActivityAt, sameYear ? "d MMM" : "d MMM yyyy", fmt) });
  };

  return (
    <PageFrame className="gap-5 md:min-h-full md:pb-8">
      <PageHeader
        eyebrow={t("Loans")}
        tone="loans"
        title={t("Contacts")}
        className="md:items-center"
        actions={
          canManage && (
            <Button onClick={() => setDrawer("create")}>
              <Plus strokeWidth={2.5} className="size-4" />
              {t("Add contact")}
            </Button>
          )
        }
      />

      {contacts.length === 0 ? (
        <EmptyState
          tone="loans"
          icon={<Users />}
          title={t("No one yet")}
          description={t("Add the people, banks and NGOs you lend to or borrow from.")}
          action={canManage && <Button onClick={() => setDrawer("create")}>{t("Add contact")}</Button>}
          className="min-h-80"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <SegmentedControl variant="soft" options={tabs} value={currentTab} onChange={setTab} label={t("Balance")} size="coarse" className="border-line-card p-1 max-md:w-full max-md:overflow-x-auto" itemClassName="gap-1.5 not-aria-pressed:text-ink-2 aria-pressed:bg-emerald-soft aria-pressed:text-emerald" />
            <NativeSelect size="sm" frameClassName="[&_svg]:right-2.5" value={kind} onChange={(event) => setKind(event.target.value as ContactType | "")} aria-label={t("Kind")} className="h-10 pr-7.5 pl-2.5 text-small pointer-coarse:h-11">
              <option value="">{t("All types")}</option>
              {LOAN_KINDS.map((option) => (
                <option key={option} value={option}>
                  {t(LOAN_KIND_LABELS[option])}
                </option>
              ))}
            </NativeSelect>
            <Input size="sm" type="search" value={search} onChange={(event) => setSearch(event.target.value)} leading={<Search />} placeholder={t("Search name, phone…")} aria-label={t("Search contacts")} frameClassName="min-w-0 flex-1 md:h-10 md:w-65 md:flex-none" />
            <span className="hidden flex-1 md:block" />
            <span className="text-small text-ink-muted tabular-nums max-md:w-full">
              {t("Pawna")} <span className="font-semibold text-income">{formatCurrency(pawna, currency, fmt)}</span> · {t("Dena")} <span className="font-semibold text-expense">{formatCurrency(dena, currency, fmt)}</span>
            </span>
            <ViewToggle value={view} onChange={setView} order={VIEWS} className="bg-toggle-track max-md:hidden" buttonClassName="h-8 w-9" />
          </div>

          {shown.length === 0 ? (
            <div className="rounded-[18px] border border-line-card bg-surface p-10 text-center text-[14px] text-ink-muted">{t("No contacts match your search or filters.")}</div>
          ) : view === "table" ? (
            <div className="max-md:hidden md:flex md:flex-1 md:flex-col">
              <LoanContactsTable
                contacts={shown}
                currency={currency}
                canManage={canManage}
                busy={isPending}
                lastOf={lastOf}
                subOf={(contact) => contact.notes || null}
                pawna={shownPawna}
                dena={shownDena}
                onEdit={(contact) => setDrawer(contact)}
                onRemove={remove}
                onRestore={restore}
              />
            </div>
          ) : null}
          {shown.length > 0 && (
            <div id={GRID_ID} className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", view === "table" && "md:hidden")}>
              {shown.slice(0, visible).map((contact) => {
                const direction = loanDirection(contact.currentBalance);
                const meta = DIRECTION_META[direction];
                const isArchived = contact.status === "ARCHIVED";
                return (
                  <Card key={contact.id} padding="none" className={cn("flex min-w-0 flex-col gap-3.5 rounded-[18px] p-4.5 leading-[normal]", isArchived && "opacity-60")}>
                    <div className="flex items-center gap-3">
                      <PersonAvatar name={contact.name} src={contact.photoUrl} kind={contact.type} size={44} initials={wordInitials(contact.name)} className="text-[15px]" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                        <span className="flex min-w-0 items-center gap-2">
                          <Link href={`/loan-management/ledger?contactId=${contact.id}`} title={t("Open statement for {name}", { name: contact.name })} className="truncate text-[15px] font-semibold text-ink hover:text-emerald hover:underline">
                            {contact.name}
                          </Link>
                          <Chip tone="neutral" size="sm" className="h-auto bg-page py-px font-semibold">
                            {isArchived ? t("Archived") : t(LOAN_KIND_LABELS[contact.type])}
                          </Chip>
                        </span>
                        {/* The number, else what the loan is ("House loan"), as the board has it. */}
                        {(contact.phone || contact.notes) && <span className="truncate text-[12px] text-ink-muted">{contact.phone || contact.notes}</span>}
                      </span>
                      {canManage && (
                        <span className="flex shrink-0 gap-1.5">
                          {isArchived ? (
                            <IconAction onClick={() => restore(contact)} disabled={isPending} aria-label={t("Restore {name}", { name: contact.name })} title={t("Restore")}>
                              <ArchiveRestore aria-hidden="true" />
                            </IconAction>
                          ) : (
                            <IconAction onClick={() => setDrawer(contact)} disabled={isPending} aria-label={t("Edit {name}", { name: contact.name })} title={t("Edit")}>
                              <Pencil aria-hidden="true" />
                            </IconAction>
                          )}
                          <IconAction tone="danger" onClick={() => remove(contact)} disabled={isPending} aria-label={t("Delete {name}", { name: contact.name })} title={contact.lastActivityAt === null ? t("Delete") : t("Has transactions, can’t be deleted")} className={cn(contact.lastActivityAt !== null && "opacity-40")}>
                            <Trash2 aria-hidden="true" />
                          </IconAction>
                        </span>
                      )}
                    </div>
                    <div className={cn("flex items-end justify-between gap-3 rounded-[10px] px-3.5 py-3", meta.box)}>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className={cn("text-[12px]", meta.ink)}>{t(meta.label)}</span>
                        <span className={cn("truncate text-[22px] leading-[normal] font-bold tracking-[-0.01em] tabular-nums", meta.text)}>{formatCurrency(Math.abs(Number(contact.currentBalance)), currency, fmt)}</span>
                      </span>
                      {/* A white pill, as the board draws it: the tone's own fill is the tile's colour. */}
                      <Chip tone={meta.chip} size="sm" className={cn("h-auto bg-surface py-0.5 font-bold", meta.status)}>
                        {t(meta.name)}
                      </Chip>
                    </div>
                    <div className="truncate text-[12px] text-ink-muted">{lastOf(contact)}</div>
                  </Card>
                );
              })}
            </div>
          )}
          <LoadMore
            className={cn(view === "table" && "md:hidden")}
            shown={Math.min(visible, shown.length)}
            total={shown.length}
            step={STEP}
            onMore={() => setGrown({ key: filterKey, count: visible + STEP })}
            onLess={visible > STEP ? () => setGrown({ key: filterKey, count: STEP }) : undefined}
            focusTargetId={GRID_ID}
          />
        </>
      )}

      <LoanContactDrawer open={drawer !== "closed"} onClose={() => setDrawer("closed")} businessId={businessId} editing={typeof drawer === "object" ? drawer : null} currency={currency} canTrade={canTrade} />
      {deleting && (
        <LoanDeleteDialog
          open
          onClose={() => setDeleting(null)}
          busy={isPending}
          {...(deleting.lastActivityAt === null
            ? {
                title: t("Delete {name}?", { name: deleting.name }),
                body: [
                  t("There are no entries for this contact, so nothing else changes."),
                  Number(deleting.currentBalance) > 0
                    ? t("{name} still owes you {amount}. Removing them deletes that balance too, for good.", { name: deleting.name, amount: formatCurrency(Math.abs(Number(deleting.currentBalance)), currency, fmt) })
                    : Number(deleting.currentBalance) < 0
                      ? t("You still owe {name} {amount}. Removing them deletes that balance too, for good.", { name: deleting.name, amount: formatCurrency(Math.abs(Number(deleting.currentBalance)), currency, fmt) })
                      : null,
                ]
                  .filter(Boolean)
                  .join(" "),
                confirmLabel: t("Delete contact"),
                onConfirm: () => confirmRemove(deleting),
              }
            : {
                title: t("{name} can’t be deleted", { name: deleting.name }),
                body: t(Number(deleting.currentBalance) ? "{name} has {count} entries and {amount} outstanding. Deleting would break your loan history. Delete the entries in Transactions first if this contact was added by mistake." : "{name} has {count} entries. Deleting would break your loan history. Delete the entries in Transactions first if this contact was added by mistake.", {
                  name: deleting.name,
                  count: formatCount(activityOf.get(deleting.id)?.entries ?? 0, fmt),
                  amount: formatCurrency(Math.abs(Number(deleting.currentBalance)), currency, fmt),
                }),
                instead: { href: `/loan-management/transactions?contactId=${deleting.id}&period=all`, label: t("Open Transactions") },
              })}
        />
      )}
    </PageFrame>
  );
}
