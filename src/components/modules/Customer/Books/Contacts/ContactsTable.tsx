"use client";

import { MoreHorizontal, Pencil, Search, SquareArrowOutUpRight, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions, ListRowLink } from "@/components/smartly/list";
import Pagination from "@/components/smartly/Pagination";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePageParam } from "@/hooks/usePageParam";
import type { Contact } from "@/lib/customer/api";
import { booksDate, CONTACT_TYPE_WORD, contactStats, filterContacts, owedByYou, owedToYou, type ContactsFilter } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { paginate } from "@/lib/table/paginate";
import { cn } from "@/lib/utils";

interface ContactsTableProps {
  contacts: Contact[];
  currency: string;
  canManage: boolean;
  today: string;
  onAdd: () => void;
  onEdit: (contact: Contact) => void;
}

const PAGE_SIZE = 25;
const LIST_ID = "contacts-list";

// Name, type, balance and the menu until xl, so the name keeps its room at
// 768px and beside the sidebar; phone and last activity sit under the name
// until then, and get their own columns from xl.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_110px_120px_40px] xl:grid-cols-[minmax(0,1fr)_180px_140px_120px_120px_40px]";

// Everyone the business trades with: a filter by role and by who owes whom,
// a search, and a row per person with what is due, 25 a page.
export function ContactsTable({ contacts, currency, canManage, today, onAdd, onEdit }: ContactsTableProps) {
  const { t, fmt } = useLocale();
  const [filter, setFilter] = useState<ContactsFilter>("ALL");
  const [query, setQuery] = useState("");
  const { page, setPage } = usePageParam();
  const stats = contactStats(contacts);
  // One fixed locale, so the server and every browser sort alike.
  const rows = filterContacts(contacts, filter, query).sort((a, b) => a.name.localeCompare(b.name, "en"));
  const list = paginate(rows, page, PAGE_SIZE);
  const count = (n: number) => <span className="text-ink-muted">{formatCount(n, fmt)}</span>;
  const filters: { value: ContactsFilter; label: React.ReactNode }[] = [
    { value: "ALL", label: <>{t("All")} {count(stats.total)}</> },
    { value: "CUSTOMER", label: <>{t("Customers@@books")} {count(stats.customers)}</> },
    { value: "SUPPLIER", label: <>{t("Suppliers")} {count(stats.suppliers)}</> },
    { value: "OWE_YOU", label: t("Owe you") },
    { value: "YOU_OWE", label: t("You owe") },
  ];

  // A new filter or search starts from its first page.
  function narrow(next: { filter?: ContactsFilter; query?: string }) {
    if (next.filter !== undefined) setFilter(next.filter);
    if (next.query !== undefined) setQuery(next.query);
    setPage(1);
  }

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={<UserRoundPlus />}
        tone="neutral"
        title={t("No customers or suppliers yet")}
        description={canManage ? t("Add the people and shops you sell to or buy from. Sales on credit and payments are recorded against them.") : t("The people and shops this business trades with show up here once the owner or an accountant adds them.")}
        action={canManage && <Button onClick={onAdd}>{t("Add person or shop")}</Button>}
      />
    );
  }

  function balance(contact: Contact) {
    const toYou = owedToYou(contact);
    const byYou = owedByYou(contact);
    if (toYou > 0) return { amount: formatCurrency(toYou, currency, fmt), note: t("owes you"), className: "text-income" };
    if (byYou > 0) return { amount: formatCurrency(byYou, currency, fmt), note: t("you owe"), className: "text-expense" };
    return { amount: t("Settled"), note: t("nothing due"), className: "text-ink-muted" };
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* On a phone the five filters wrap rather than run off screen. Each
            keeps its own width (the labels carry counts), and each row
            stretches to fill the track, so a pill left over on its own
            spans its row. */}
        <SegmentedControl label={t("Show some of the people")} value={filter} onChange={(value) => narrow({ filter: value })} options={filters} className="max-sm:flex max-sm:w-full max-sm:flex-wrap max-sm:[&>button]:flex-auto" />
        <Input size="sm" value={query} onChange={(event) => narrow({ query: event.target.value })} placeholder={t("Search by name or phone")} aria-label={t("Search by name or phone")} leading={<Search />} frameClassName="sm:ml-auto sm:w-65" />
      </div>

      <ListCard
        id={LIST_ID}
        label={t("Customers & suppliers")}
        footer={
          list.total > 0 && (
            <ListFooter>
              <Pagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={setPage} focusTargetId={LIST_ID} />
            </ListFooter>
          )
        }
      >
        {rows.length === 0 ? (
          <ListEmpty
            icon={<Search />}
            tone="neutral"
            title={t("No one matches.")}
            action={query.trim() ? <Button variant="secondary" onClick={() => narrow({ query: "" })}>{t("Clear search")}</Button> : <Button variant="secondary" onClick={() => narrow({ filter: "ALL" })}>{t("Show everyone")}</Button>}
          />
        ) : (
          <>
            <ListHead columns={COLUMNS}>
              <ListHeadCell>{t("Name")}</ListHeadCell>
              <ListHeadCell>{t("Type")}</ListHeadCell>
              <ListHeadCell className="hidden xl:block">{t("Phone")}</ListHeadCell>
              <ListHeadCell className="hidden xl:block">{t("Last activity")}</ListHeadCell>
              <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
              <ListHeadCell>
                <span className="sr-only">{t("Actions")}</span>
              </ListHeadCell>
            </ListHead>
            {list.rows.map((contact) => {
              const due = balance(contact);
              const archived = contact.status === "ARCHIVED";
              return (
                <ListRow key={contact.id} columns={COLUMNS} density="relaxed" muted={archived}>
                  <ListCell className="flex min-w-0 items-center gap-3">
                    <PersonAvatar name={contact.name} src={contact.photoUrl} size={36} coloured />
                    <span className="flex min-w-0 flex-col">
                      <span className="flex min-w-0 items-center gap-2">
                        <ListRowLink href={`/contacts/${contact.id}`} className="truncate font-semibold text-ink">
                          {contact.name}
                        </ListRowLink>
                        {archived && (
                          <Chip tone="neutral" size="sm">
                            {t("Archived")}
                          </Chip>
                        )}
                      </span>
                      <span className="truncate text-caption text-ink-muted md:hidden">{[t(CONTACT_TYPE_WORD[contact.type]), contact.phone].filter(Boolean).join(" · ")}</span>
                      {(contact.phone || contact.lastActivityAt) && (
                        <span className="hidden truncate text-caption text-ink-muted md:block xl:hidden">
                          {contact.phone && <span className="font-mono">{contact.phone}</span>}
                          {contact.phone && contact.lastActivityAt && " · "}
                          {contact.lastActivityAt && t("Last activity {date}", { date: booksDate(contact.lastActivityAt, fmt, { today, weekday: true }) })}
                        </span>
                      )}
                    </span>
                  </ListCell>
                  <ListCell className="hidden md:block">
                    <Chip tone="neutral" size="sm" className="max-w-full truncate">
                      {t(CONTACT_TYPE_WORD[contact.type])}
                    </Chip>
                  </ListCell>
                  <ListCell className="hidden truncate font-mono text-small text-ink-2 xl:block">{contact.phone || "—"}</ListCell>
                  <ListCell className="hidden text-small text-ink-2 xl:block">{contact.lastActivityAt ? booksDate(contact.lastActivityAt, fmt, { today, weekday: true }) : "—"}</ListCell>
                  <ListCell align="end" className="flex shrink-0 flex-col items-end">
                    <b className={cn("tabular-nums whitespace-nowrap", due.className)}>{due.amount}</b>
                    <span className="text-caption text-ink-muted">{due.note}</span>
                  </ListCell>
                  <ListRowActions className="hidden md:flex">
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label={t("More for {name}", { name: contact.name })} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
                        <MoreHorizontal className="size-4.5" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                        <DropdownMenuItem asChild className="rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken">
                          <Link href={`/contacts/${contact.id}`}>
                            <SquareArrowOutUpRight className="size-4" aria-hidden="true" />
                            {t("Open")}
                          </Link>
                        </DropdownMenuItem>
                        {canManage && (
                          <DropdownMenuItem onSelect={() => onEdit(contact)} className="rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken">
                            <Pencil className="size-4" aria-hidden="true" />
                            {t("Edit")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ListRowActions>
                </ListRow>
              );
            })}
          </>
        )}
      </ListCard>
    </div>
  );
}
