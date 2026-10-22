"use client";

import { Archive, ArchiveRestore, Ellipsis, Pencil, Plus, ScrollText, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import LoadMore from "@/components/smartly/LoadMore";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Contact, ContactType, LoanBalanceDirection } from "@/lib/customer/api";
import { archiveContactAction, deleteContactAction, unarchiveContactAction } from "@/lib/customer/contactActions";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { contactMatches, DIRECTION_META, LOAN_KIND_LABELS, LOAN_KINDS, loanDirection, loanErrorText } from "@/lib/customer/loanDisplay";
import { getAppToday } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import { LoanContactDrawer } from "./LoanContactDrawer";
import { LoanEntryDrawer } from "./LoanEntryDrawer";

interface LoanContactsPageClientProps {
  businessId: string;
  // Every loan contact, archived ones too (all pages of the API).
  contacts: Contact[];
  currency: string;
  canManage: boolean;
  // A business workspace, where a contact can be moved to Books' trade list.
  canTrade: boolean;
}

type Tab = "ALL" | LoanBalanceDirection | "ARCHIVED";
const DIRECTIONS: LoanBalanceDirection[] = ["PAWNA", "DENA", "SETTLED"];
const MENU_ITEM = "flex h-9 cursor-pointer items-center gap-3 rounded-sm px-3 text-small font-medium text-ink focus:bg-surface-sunken [&_svg]:size-3.75";
// Cards come 24 at a time; the totals above them count everyone.
const STEP = 24;
const GRID_ID = "loan-people";

// People & banks: everyone you have dena-pawna with, one card each with
// where the balance stands and the two things you do next. Archived
// contacts wait in their own tab, out of the counts.
export function LoanContactsPageClient({ businessId, contacts, currency, canManage, canTrade }: LoanContactsPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [tab, setTab] = useState<Tab>("ALL");
  const [kind, setKind] = useState<ContactType | "">("");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<"closed" | "create" | Contact>("closed");
  const [entryFor, setEntryFor] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    .filter((contact) => contactMatches(contact.name, contact.phone, search));
  const filtered = currentTab !== "ALL" || kind !== "" || search.trim() !== "";

  // How many cards are out, for the filters they were grown under: a new
  // filter starts again at the first 24.
  const filterKey = `${currentTab}|${kind}|${search.trim()}`;
  const [grown, setGrown] = useState({ key: filterKey, count: STEP });
  const visible = grown.key === filterKey ? grown.count : STEP;

  function clearFilters() {
    setTab("ALL");
    setKind("");
    setSearch("");
  }

  async function archive(contact: Contact) {
    if (!(await confirm({ title: t("Archive {name}?", { name: contact.name }), message: t("They move to the Archived tab and leave the entry form. Their entries and statement stay."), confirmLabel: "Archive contact" }))) return;
    startTransition(async () => {
      try {
        const result = await archiveContactAction(businessId, contact.id);
        if (result.success) {
          toast.success(t("Contact archived"));
          router.refresh();
        } else {
          toast.error(loanErrorText(result.message, "Failed to archive contact", t, (amount) => formatCurrency(amount, currency)));
        }
      } catch {
        toast.error(t("Couldn't save. Check your connection and try again."));
      }
    });
  }

  // Back on the active list, the entry form and the counts.
  function restore(contact: Contact) {
    startTransition(async () => {
      try {
        const result = await unarchiveContactAction(businessId, contact.id);
        if (result.success) {
          toast.success(t("Contact restored"));
          router.refresh();
        } else {
          toast.error(loanErrorText(result.message, "Failed to restore contact", t, (amount) => formatCurrency(amount, currency)));
        }
      } catch {
        toast.error(t("Couldn't save. Check your connection and try again."));
      }
    });
  }

  // Added by mistake and never used: gone for good. With any history the
  // API archives instead, and says so. A balance they were added with goes
  // with them, so the confirm names it.
  async function remove(contact: Contact) {
    const direction = loanDirection(contact.currentBalance);
    const values = { name: contact.name, amount: formatCurrency(Math.abs(Number(contact.currentBalance)), currency) };
    const message =
      direction === "PAWNA"
        ? t("{name} still owes you {amount}. Removing them deletes that balance too, for good.", values)
        : direction === "DENA"
          ? t("You still owe {name} {amount}. Removing them deletes that balance too, for good.", values)
          : t("If this contact has no transaction history, it will be permanently deleted; otherwise it will be archived instead.");
    if (!(await confirm({ title: t("Remove {name}?", { name: contact.name }), message, confirmLabel: "Remove" }))) return;
    startTransition(async () => {
      try {
        const result = await deleteContactAction(businessId, contact.id);
        if (result.success) {
          toast.success(result.data?.action === "archived" ? t("This contact has transaction history, so it was archived instead") : t("Contact deleted"));
          router.refresh();
        } else {
          toast.error(loanErrorText(result.message, "Failed to remove contact", t, (amount) => formatCurrency(amount, currency)));
        }
      } catch {
        toast.error(t("Couldn't save. Check your connection and try again."));
      }
    });
  }

  const counted = (label: string, count: number) => (
    <>
      {label} <span className="font-medium text-ink-muted tabular-nums">{formatCount(count, locale)}</span>
    </>
  );
  const tabs = [
    { value: "ALL" as Tab, label: counted(t("All"), counts.ALL) },
    ...DIRECTIONS.map((direction) => ({ value: direction as Tab, label: counted(t(DIRECTION_META[direction].name), counts[direction]) })),
    ...(archived.length > 0 ? [{ value: "ARCHIVED" as Tab, label: counted(t("Archived@@tab"), archived.length) }] : []),
  ];

  // "Last entry 3 Mar", with the year once it isn't this one.
  const thisYear = getAppToday().slice(0, 4);
  const lastLine = (contact: Contact) => {
    if (contact.lastActivityAt === undefined) return t("Added {date}", { date: formatDate(contact.createdAt, undefined, locale) });
    if (!contact.lastActivityAt) return t("No entries yet");
    const sameYear = formatDate(contact.lastActivityAt, "yyyy") === thisYear;
    return t("Last entry {date}", { date: formatDate(contact.lastActivityAt, sameYear ? "d MMM" : "d MMM yyyy", locale) });
  };

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Loans")}
        tone="loans"
        title={t("People & banks")}
        description={t("Everyone you have dena-pawna with: people, banks, NGOs, customers and suppliers.")}
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
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl variant="soft" options={tabs} value={currentTab} onChange={setTab} label={t("Balance")} size="coarse" className="max-md:w-full max-md:overflow-x-auto" />
            <NativeSelect size="sm" value={kind} onChange={(event) => setKind(event.target.value as ContactType | "")} aria-label={t("Kind")} className="text-small pointer-coarse:h-11">
              <option value="">{t("All types")}</option>
              {LOAN_KINDS.map((option) => (
                <option key={option} value={option}>
                  {t(LOAN_KIND_LABELS[option])}
                </option>
              ))}
            </NativeSelect>
            <Input size="sm" type="search" value={search} onChange={(event) => setSearch(event.target.value)} leading={<Search />} placeholder={t("Search name or phone…")} aria-label={t("Search by name or phone")} frameClassName="min-w-0 flex-1 md:w-65 md:flex-none" />
            <span className="hidden flex-1 md:block" />
            <span className="text-small text-ink-muted tabular-nums max-md:w-full">
              {t("Pawna")} <span className="font-semibold text-income">{formatCurrency(pawna, currency)}</span> · {t("Dena")} <span className="font-semibold text-expense">{formatCurrency(dena, currency)}</span>
            </span>
          </div>

          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-body text-ink-muted">{t("No one matches")}</p>
              {filtered && (
                <Button variant="secondary" size="sm" onClick={clearFilters} className="pointer-coarse:h-11">
                  {t("Clear search and filters")}
                </Button>
              )}
            </div>
          ) : (
            <div id={GRID_ID} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shown.slice(0, visible).map((contact) => {
                const direction = loanDirection(contact.currentBalance);
                const meta = DIRECTION_META[direction];
                const isArchived = contact.status === "ARCHIVED";
                const settled = direction === "SETTLED";
                return (
                  <Card key={contact.id} className={cn("flex min-w-0 flex-col gap-4", isArchived && "opacity-60")}>
                    <div className="flex items-center gap-3">
                      <PersonAvatar name={contact.name} src={contact.photoUrl} kind={contact.type} size={44} />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-title text-ink">{contact.name}</span>
                          <Chip tone="neutral" size="sm" className="font-semibold">
                            {isArchived ? t("Archived") : t(LOAN_KIND_LABELS[contact.type])}
                          </Chip>
                        </span>
                        <span className="truncate text-caption font-normal text-ink-muted">{contact.phone || contact.email || contact.address || t("No contact info")}</span>
                      </span>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            disabled={isPending}
                            aria-label={t("Actions for {name}", { name: contact.name })}
                            className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-surface-sunken disabled:opacity-50 data-open:bg-surface-sunken pointer-coarse:size-11"
                          >
                            <Ellipsis className="size-4.5" aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={6} className="w-56 rounded-md border border-line bg-surface p-2 shadow-overlay ring-0">
                            <DropdownMenuItem onSelect={() => setDrawer(contact)} className={MENU_ITEM}>
                              <Pencil aria-hidden="true" />
                              {t("Edit")}
                            </DropdownMenuItem>
                            {!isArchived && (
                              <DropdownMenuItem onSelect={() => setEntryFor(contact.id)} className={MENU_ITEM}>
                                <Plus aria-hidden="true" />
                                {t("New entry")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild className={MENU_ITEM}>
                              <Link href={`/loan-management/ledger?contactId=${contact.id}`}>
                                <ScrollText aria-hidden="true" />
                                {t("Statement")}
                              </Link>
                            </DropdownMenuItem>
                            {isArchived && (
                              <DropdownMenuItem onSelect={() => restore(contact)} className={MENU_ITEM}>
                                <ArchiveRestore aria-hidden="true" />
                                {t("Restore")}
                              </DropdownMenuItem>
                            )}
                            {!isArchived && (
                              <>
                                <DropdownMenuSeparator className="my-1 bg-line" />
                                {/* Only a settled balance can be archived; otherwise the item says why. */}
                                <DropdownMenuItem
                                  disabled={!settled}
                                  onSelect={() => archive(contact)}
                                  className={cn(MENU_ITEM, "text-expense focus:bg-expense-soft focus:text-expense data-disabled:h-auto data-disabled:cursor-not-allowed data-disabled:py-1.5 data-disabled:text-ink-muted data-disabled:opacity-100")}
                                >
                                  <Archive aria-hidden="true" />
                                  <span className="flex flex-col">
                                    {t("Archive")}
                                    {!settled && <span className="text-caption font-normal">{t("Settle the balance first")}</span>}
                                  </span>
                                </DropdownMenuItem>
                                {contact.lastActivityAt === null && (
                                  <DropdownMenuItem onSelect={() => remove(contact)} className={cn(MENU_ITEM, "text-expense focus:bg-expense-soft focus:text-expense")}>
                                    <Trash2 aria-hidden="true" />
                                    {t("Remove")}
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className={cn("flex items-end justify-between gap-3 rounded-md px-4 py-3", meta.box)}>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className={cn("text-caption font-normal", settled ? "text-ink-muted" : meta.text)}>{t(meta.label)}</span>
                        <span className={cn("truncate text-h2 tracking-[-0.01em] tabular-nums", meta.text)}>{formatCurrency(Math.abs(Number(contact.currentBalance)), currency)}</span>
                      </span>
                      {/* A white pill, as the board draws it: the tone's own fill is the tile's colour. */}
                      <Chip tone={meta.chip} size="sm" className="bg-surface font-bold">
                        {t(meta.name)}
                      </Chip>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-caption font-normal text-ink-muted">
                      <span className="min-w-0 truncate">{lastLine(contact)}</span>
                      {/* The board's text links, 44px tall under a finger. */}
                      <span className="flex shrink-0 gap-3">
                        {canManage && !isArchived && (
                          <Button variant="link" size="sm" onClick={() => setEntryFor(contact.id)} className="h-auto px-0 font-semibold pointer-coarse:h-11 pointer-coarse:px-2">
                            {t("New entry")}
                          </Button>
                        )}
                        <Button variant="link" size="sm" asChild className="h-auto px-0 font-semibold text-ink-2 hover:text-ink pointer-coarse:h-11 pointer-coarse:px-2">
                          <Link href={`/loan-management/ledger?contactId=${contact.id}`}>{t("Statement")}</Link>
                        </Button>
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          <LoadMore
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
      <LoanEntryDrawer open={entryFor !== null} onClose={() => setEntryFor(null)} businessId={businessId} contacts={active} currency={currency} initialContactId={entryFor ?? undefined} />
      {confirmDialog}
    </PageFrame>
  );
}
