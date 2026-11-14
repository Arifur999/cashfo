"use client";

import { ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import Chip from "@/components/smartly/Chip";
import IconAction from "@/components/smartly/IconAction";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import type { Contact } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { DIRECTION_META, LOAN_KIND_LABELS, loanDirection, wordInitials } from "@/lib/customer/loanDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface LoanContactsTableProps {
  contacts: Contact[];
  currency: string;
  canManage: boolean;
  busy: boolean;
  // What each did last ("Got money back 16 Sep").
  lastOf: (contact: Contact) => string;
  // A bank or NGO by what the loan is, else nothing.
  subOf: (contact: Contact) => string | null;
  // Everyone the filters let through, for the foot's totals.
  pawna: number;
  dena: number;
  onEdit: (contact: Contact) => void;
  onRemove: (contact: Contact) => void;
  onRestore: (contact: Contact) => void;
}

// Contact, phone, where the balance stands, what happened last, the
// balance, and Edit and Delete; a phone scrolls it sideways.
const COLUMNS = "grid leading-[normal] grid-cols-[minmax(0,1.5fr)_150px_120px_minmax(150px,1fr)_160px_84px] items-center gap-x-4 min-w-220";

// Loan contacts as a table (LoanContacts board): the name opens the
// statement; Delete waits until nothing was ever entered with them.
export function LoanContactsTable({ contacts, currency, canManage, busy, lastOf, subOf, pawna, dena, onEdit, onRemove, onRestore }: LoanContactsTableProps) {
  const { t, fmt } = useLocale();
  const money = (value: number) => formatCurrency(value, currency, fmt);
  return (
    <section aria-label={t("Contacts table")} className="flex min-h-0 flex-col overflow-x-auto rounded-[18px] border border-line-card bg-surface shadow-card md:flex-1">
      <div className={cn(COLUMNS, "border-b border-line bg-strip px-5 py-3 text-[12px] font-medium text-ink-muted")}>
        <span>{t("Contact")}</span>
        <span>{t("Phone")}</span>
        <span>{t("Status")}</span>
        <span>{t("Last activity")}</span>
        <span className="text-right">
          {t("Balance")}
        </span>
        <span className="text-right">
          {t("Actions")}
        </span>
      </div>
      <div className="flex-1">
        {contacts.map((contact) => {
          const direction = loanDirection(contact.currentBalance);
          const meta = DIRECTION_META[direction];
          const archived = contact.status === "ARCHIVED";
          const sub = subOf(contact);
          // Nothing entered with them yet: they can go for good.
          const removable = contact.lastActivityAt === null;
          return (
            <div key={contact.id} className={cn(COLUMNS, "min-h-16 border-b border-divider px-5 py-2.5 tabular-nums", archived && "opacity-60")}>
              <span className="flex min-w-0 items-center gap-3">
                <PersonAvatar name={contact.name} src={contact.photoUrl} kind={contact.type} size={36} initials={wordInitials(contact.name)} className="size-9.5" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <Link href={`/loan-management/ledger?contactId=${contact.id}`} title={t("Open statement for {name}", { name: contact.name })} className="truncate text-[14.5px] font-semibold text-ink hover:text-emerald hover:underline">
                      {contact.name}
                    </Link>
                    <Chip tone="neutral" size="sm" className="h-auto shrink-0 bg-page px-1.75 py-px text-[11px] font-semibold">
                      {archived ? t("Archived") : t(LOAN_KIND_LABELS[contact.type])}
                    </Chip>
                  </span>
                  {sub && <span className="truncate text-[12px] text-ink-muted">{sub}</span>}
                </span>
              </span>
              <span className="truncate text-[13px] text-ink-2">{contact.phone || "–"}</span>
              <span>
                <span className={cn("rounded-full px-2.5 py-0.75 text-[12px] font-bold", meta.box, meta.status)}>{t(meta.name)}</span>
              </span>
              <span className="truncate text-[13px] text-ink-2">{lastOf(contact)}</span>
              <span className="flex flex-col items-end gap-px leading-[normal]">
                <span className={cn("text-[15px] font-bold", meta.text)}>{money(Math.abs(Number(contact.currentBalance)))}</span>
                <span className={cn("text-[11.5px]", meta.ink)}>{t(meta.label)}</span>
              </span>
              <span className="flex items-center justify-end gap-1.5">
                {canManage && archived && (
                  <IconAction onClick={() => onRestore(contact)} disabled={busy} aria-label={t("Restore {name}", { name: contact.name })} title={t("Restore")}>
                    <ArchiveRestore aria-hidden="true" />
                  </IconAction>
                )}
                {canManage && !archived && (
                  <IconAction onClick={() => onEdit(contact)} disabled={busy} aria-label={t("Edit {name}", { name: contact.name })} title={t("Edit")}>
                    <Pencil aria-hidden="true" />
                  </IconAction>
                )}
                {canManage && (
                  <IconAction
                    tone="danger"
                    onClick={() => onRemove(contact)}
                    disabled={busy}
                    aria-label={t("Delete {name}", { name: contact.name })}
                    title={removable ? t("Delete") : t("Has transactions, can’t be deleted")}
                    // Dimmed while it can't go; pressing it says why.
                    className={cn("disabled:opacity-40", !removable && "opacity-40")}
                  >
                    <Trash2 aria-hidden="true" />
                  </IconAction>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <div className={cn(COLUMNS, "border-t border-line bg-strip px-5 py-3 text-[13px] font-bold tabular-nums")}>
        <span>{t(contacts.length === 1 ? "Total · {count} contact" : "Total · {count} contacts", { count: formatCount(contacts.length, fmt) })}</span>
        <span />
        <span />
        <span />
        <span className="flex flex-col items-end gap-px leading-[normal]">
          <span className="text-income">+ {money(pawna)}</span>
          <span className="text-expense-fill">− {money(dena)}</span>
        </span>
        <span />
      </div>
    </section>
  );
}
