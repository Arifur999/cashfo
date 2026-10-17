"use client";

import { MoreHorizontal, Pencil, Search, SquareArrowOutUpRight, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Contact } from "@/lib/customer/api";
import { CONTACT_TYPE_WORD, contactStats, filterContacts, owedByYou, owedToYou, type ContactsFilter } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface ContactsTableProps {
  contacts: Contact[];
  currency: string;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (contact: Contact) => void;
}

const GRID = "md:grid md:grid-cols-[minmax(0,1fr)_180px_140px_120px_120px_40px] md:items-center md:gap-x-4";

// Everyone the business trades with: a filter by role and by who owes whom,
// a search, and a row per person with what is due.
export function ContactsTable({ contacts, currency, canManage, onAdd, onEdit }: ContactsTableProps) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<ContactsFilter>("ALL");
  const [query, setQuery] = useState("");
  const stats = contactStats(contacts);
  const rows = filterContacts(contacts, filter, query).sort((a, b) => a.name.localeCompare(b.name));
  const count = (n: number) => <span className="text-ink-muted">{n}</span>;
  const filters: { value: ContactsFilter; label: React.ReactNode }[] = [
    { value: "ALL", label: <>{t("All")} {count(stats.total)}</> },
    { value: "CUSTOMER", label: <>{t("Customers")} {count(stats.customers)}</> },
    { value: "SUPPLIER", label: <>{t("Suppliers")} {count(stats.suppliers)}</> },
    { value: "OWE_YOU", label: t("Owe you") },
    { value: "YOU_OWE", label: t("You owe") },
  ];

  if (contacts.length === 0) {
    return (
      <EmptyState icon={<UserRoundPlus />} tone="neutral" title={t("No customers or suppliers yet")} description={t("Add the people and shops you sell to or buy from. Sales on credit and payments are recorded against them.")} action={canManage && <Button onClick={onAdd}>{t("Add person or shop")}</Button>} />
    );
  }

  function balance(contact: Contact) {
    const toYou = owedToYou(contact);
    const byYou = owedByYou(contact);
    if (toYou > 0) return { amount: formatCurrency(toYou, currency), note: t("owes you"), className: "text-income" };
    if (byYou > 0) return { amount: formatCurrency(byYou, currency), note: t("you owe"), className: "text-expense" };
    return { amount: t("Settled"), note: t("nothing due"), className: "text-ink-muted" };
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SegmentedControl label={t("Show some of the people")} value={filter} onChange={setFilter} options={filters} className="max-sm:w-full max-sm:overflow-x-auto" />
        <Input size="sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search by name or phone")} aria-label={t("Search by name or phone")} leading={<Search />} frameClassName="sm:ml-auto sm:w-65" />
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className={cn("hidden bg-cream px-5 py-3 text-caption font-semibold text-ink-muted", GRID)}>
          <span>{t("Name")}</span>
          <span>{t("Type")}</span>
          <span>{t("Phone")}</span>
          <span>{t("Last activity")}</span>
          <span className="text-right">{t("Balance")}</span>
          <span />
        </div>
        {rows.length === 0 && <p className="border-t border-surface-sunken px-5 py-10 text-center text-body text-ink-muted">{t("No one matches.")}</p>}
        {rows.map((contact) => {
          const due = balance(contact);
          const archived = contact.status === "ARCHIVED";
          return (
            <div key={contact.id} className={cn("flex min-h-16 items-center justify-between gap-3 border-t border-surface-sunken px-5 py-2 text-body", GRID, archived && "opacity-60")}>
              <Link href={`/contacts/${contact.id}`} className="flex min-w-0 items-center gap-3 hover:underline">
                <PersonAvatar name={contact.name} src={contact.photoUrl} size={36} coloured />
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold text-ink">{contact.name}</span>
                    {archived && (
                      <Chip tone="neutral" size="sm">
                        {t("Archived")}
                      </Chip>
                    )}
                  </span>
                  <span className="truncate text-caption text-ink-muted md:hidden">{[t(CONTACT_TYPE_WORD[contact.type]), contact.phone].filter(Boolean).join(" · ")}</span>
                </span>
              </Link>
              <span className="hidden md:block">
                <Chip tone="neutral" size="sm">
                  {t(CONTACT_TYPE_WORD[contact.type])}
                </Chip>
              </span>
              <span className="hidden font-mono text-small text-ink-2 md:block">{contact.phone || "—"}</span>
              <span className="hidden text-small text-ink-2 md:block">{contact.lastActivityAt ? formatDate(contact.lastActivityAt, "EEE, d MMM") : "—"}</span>
              <span className="flex shrink-0 flex-col items-end">
                <b className={cn("tabular-nums", due.className)}>{due.amount}</b>
                <span className="text-caption text-ink-muted">{due.note}</span>
              </span>
              <span className="hidden justify-end md:flex">
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label={`${t("More for")} ${contact.name}`} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken">
                    <MoreHorizontal className="size-4.5" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                    <DropdownMenuItem asChild className="rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                      <Link href={`/contacts/${contact.id}`}>
                        <SquareArrowOutUpRight className="size-4" aria-hidden="true" />
                        {t("Open")}
                      </Link>
                    </DropdownMenuItem>
                    {canManage && (
                      <DropdownMenuItem onSelect={() => onEdit(contact)} className="rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                        <Pencil className="size-4" aria-hidden="true" />
                        {t("Edit")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
