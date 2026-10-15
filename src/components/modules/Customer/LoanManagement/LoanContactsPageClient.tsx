"use client";

import { Archive, Ellipsis, Pencil, Plus, ScrollText, Search, Users } from "lucide-react";
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
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Contact, ContactType, LoanBalanceDirection } from "@/lib/customer/api";
import { archiveContactAction } from "@/lib/customer/contactActions";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { DIRECTION_META, LOAN_KIND_LABELS, loanDirection } from "@/lib/customer/loanDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import { LoanContactDrawer } from "./LoanContactDrawer";
import { LoanEntryDrawer } from "./LoanEntryDrawer";

interface LoanContactsPageClientProps {
  businessId: string;
  contacts: Contact[];
  currency: string;
  canManage: boolean;
}

type Tab = "ALL" | LoanBalanceDirection;
const DIRECTIONS: LoanBalanceDirection[] = ["PAWNA", "DENA", "SETTLED"];
const KINDS: ContactType[] = ["BOTH", "RELATIVE", "CUSTOMER", "SUPPLIER", "OTHER"];
const MENU_ITEM = "flex h-9 cursor-pointer items-center gap-3 rounded-sm px-3 text-small font-medium text-ink focus:bg-cream [&_svg]:size-3.75";

// People & banks: everyone you have dena-pawna with, one card each with
// where the balance stands and the two things you do next.
export function LoanContactsPageClient({ businessId, contacts, currency, canManage }: LoanContactsPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [tab, setTab] = useState<Tab>("ALL");
  const [kind, setKind] = useState<ContactType | "">("");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<"closed" | "create" | Contact>("closed");
  const [entryFor, setEntryFor] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const active = contacts.filter((contact) => contact.status === "ACTIVE");
  const counts = { ALL: active.length, ...Object.fromEntries(DIRECTIONS.map((direction) => [direction, active.filter((contact) => loanDirection(contact.currentBalance) === direction).length])) } as Record<Tab, number>;
  const pawna = active.reduce((sum, contact) => sum + Math.max(0, Number(contact.currentBalance)), 0);
  const dena = active.reduce((sum, contact) => sum + Math.max(0, -Number(contact.currentBalance)), 0);
  const q = search.trim().toLowerCase();
  const shown = contacts
    .filter((contact) => tab === "ALL" || loanDirection(contact.currentBalance) === tab)
    .filter((contact) => !kind || contact.type === kind)
    .filter((contact) => !q || contact.name.toLowerCase().includes(q) || (contact.phone ?? "").includes(q))
    .sort((a, b) => Number(a.status === "ARCHIVED") - Number(b.status === "ARCHIVED"));

  async function archive(contact: Contact) {
    if (!(await confirm({ title: `${t("Archive")} ${contact.name}?`, message: t("They leave the lists; their entries and statement stay."), confirmLabel: "Archive contact" }))) return;
    startTransition(async () => {
      const result = await archiveContactAction(businessId, contact.id);
      if (result.success) {
        toast.success(t("Contact archived"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to archive contact"));
      }
    });
  }

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
            <SegmentedControl variant="soft" options={[{ value: "ALL" as Tab, label: counted(t("All"), counts.ALL) }, ...DIRECTIONS.map((direction) => ({ value: direction as Tab, label: counted(t(DIRECTION_META[direction].name), counts[direction]) }))]} value={tab} onChange={setTab} label={t("Balance")} className="max-md:w-full max-md:overflow-x-auto" />
            <NativeSelect size="sm" value={kind} onChange={(event) => setKind(event.target.value as ContactType | "")} aria-label={t("Kind")} className="text-small">
              <option value="">{t("All types")}</option>
              {KINDS.map((option) => (
                <option key={option} value={option}>
                  {t(LOAN_KIND_LABELS[option])}
                </option>
              ))}
            </NativeSelect>
            <Input size="sm" type="search" value={search} onChange={(event) => setSearch(event.target.value)} leading={<Search />} placeholder={t("Search name, phone…")} aria-label={t("Search contacts")} frameClassName="w-full md:w-65" />
            <span className="flex-1" />
            <span className="text-small text-ink-muted tabular-nums">
              {t("Pawna")} <span className="font-semibold text-income">{formatCurrency(pawna, currency)}</span> · {t("Dena")} <span className="font-semibold text-expense">{formatCurrency(dena, currency)}</span>
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shown.length === 0 && <p className="py-10 text-center text-body text-ink-muted md:col-span-2 lg:col-span-3">{t("No one matches")}</p>}
            {shown.map((contact) => {
              const direction = loanDirection(contact.currentBalance);
              const meta = DIRECTION_META[direction];
              const archived = contact.status === "ARCHIVED";
              return (
                <Card key={contact.id} className={cn("flex flex-col gap-4", archived && "opacity-60")}>
                  <div className="flex items-center gap-3">
                    <PersonAvatar name={contact.name} src={contact.photoUrl} size={44} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-title text-ink">{contact.name}</span>
                        <Chip tone="neutral" size="sm" className="font-semibold">
                          {archived ? t("Archived") : t(LOAN_KIND_LABELS[contact.type])}
                        </Chip>
                      </span>
                      <span className="truncate text-caption font-normal text-ink-muted">{contact.phone ?? contact.address ?? t("No contact info")}</span>
                    </span>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger aria-label={`${t("Actions for")} ${contact.name}`} className="flex size-7.5 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-cream data-open:bg-cream">
                          <Ellipsis className="size-4.5" aria-hidden="true" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={6} className="w-49 rounded-md border border-line bg-surface p-2 shadow-overlay ring-0">
                          <DropdownMenuItem onSelect={() => setDrawer(contact)} className={MENU_ITEM}>
                            <Pencil aria-hidden="true" />
                            {t("Edit")}
                          </DropdownMenuItem>
                          {!archived && (
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
                          {!archived && (
                            <>
                              <DropdownMenuSeparator className="my-1 bg-line" />
                              <DropdownMenuItem onSelect={() => archive(contact)} className={cn(MENU_ITEM, "text-expense focus:bg-expense-soft focus:text-expense")}>
                                <Archive aria-hidden="true" />
                                {t("Archive")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className={cn("flex items-end justify-between rounded-md px-4 py-3", meta.box)}>
                    <span className="flex flex-col gap-0.5">
                      <span className={cn("text-caption font-normal", direction === "SETTLED" ? "text-ink-muted" : meta.text)}>{t(meta.label)}</span>
                      <span className={cn("text-h2 tracking-[-0.01em] tabular-nums", meta.text)}>{formatCurrency(Math.abs(Number(contact.currentBalance)), currency)}</span>
                    </span>
                    <span className={cn("rounded-full bg-surface px-2 py-0.5 text-caption font-bold", direction === "SETTLED" ? "text-ink-2" : meta.text)}>{t(meta.name)}</span>
                  </div>
                  <div className="flex items-center justify-between text-caption font-normal text-ink-muted">
                    <span>
                      {t("Added")} {formatDate(contact.createdAt, "d MMM")}
                    </span>
                    <span className="flex gap-3">
                      {canManage && !archived && (
                        <button type="button" onClick={() => setEntryFor(contact.id)} className="font-semibold text-emerald hover:text-emerald-hover">
                          {t("New entry")}
                        </button>
                      )}
                      <Link href={`/loan-management/ledger?contactId=${contact.id}`} className="font-semibold text-ink-2 hover:text-ink">
                        {t("Statement")}
                      </Link>
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <LoanContactDrawer open={drawer !== "closed"} onClose={() => setDrawer("closed")} businessId={businessId} editing={typeof drawer === "object" ? drawer : null} currency={currency} />
      <LoanEntryDrawer open={entryFor !== null} onClose={() => setEntryFor(null)} businessId={businessId} contacts={active} currency={currency} initialContactId={entryFor ?? undefined} />
      {confirmDialog}
    </PageFrame>
  );
}

function counted(label: string, count: number) {
  return (
    <>
      {label} <span className="font-medium opacity-70">{count}</span>
    </>
  );
}
