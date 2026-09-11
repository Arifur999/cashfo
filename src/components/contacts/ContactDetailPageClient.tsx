"use client";

import { ArrowDownCircle, ArrowUpCircle, Archive, Circle, Mail, MapPin, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveContactAction } from "@/lib/contactActions";
import type { Contact, Transaction, TransactionType } from "@/lib/api";
import { BALANCE_DIRECTION_COLOR, BALANCE_DIRECTION_LABEL, balanceDirection, CONTACT_TYPE_LABELS, contactInitials } from "@/lib/contactDisplay";
import { formatCurrency } from "@/lib/currency";
import { ContactFormModal } from "./ContactFormModal";

interface ContactDetailPageClientProps {
  businessId: string;
  contact: Contact;
  transactions: Transaction[];
  canManage: boolean;
  currency: string;
}

function typeVisual(type: TransactionType) {
  switch (type) {
    case "INCOME":
    case "SALE":
    case "PAYMENT":
      return { Icon: ArrowUpCircle, color: "text-brand-primary" };
    case "EXPENSE":
    case "PURCHASE":
      return { Icon: ArrowDownCircle, color: "text-brand-danger" };
    default:
      return { Icon: Circle, color: "text-neutral-400" };
  }
}

export function ContactDetailPageClient({ businessId, contact, transactions, canManage, currency }: ContactDetailPageClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const direction = balanceDirection(contact.currentBalance);
  const isArchived = contact.status === "ARCHIVED";

  function handleArchive() {
    if (!window.confirm(`Archive "${contact.name}"?`)) return;
    startTransition(async () => {
      const result = await archiveContactAction(businessId, contact.id);
      if (result.success) {
        toast.success("Contact archived");
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to archive contact");
      }
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-lg font-semibold text-neutral-500">
              {contact.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={contact.photoUrl} alt={contact.name} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                contactInitials(contact.name)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-semibold text-neutral-900 ${isArchived ? "line-through" : ""}`}>{contact.name}</h1>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                  {CONTACT_TYPE_LABELS[contact.type]}
                </span>
                {isArchived && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                    Archived
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
                {contact.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {contact.phone}
                  </span>
                )}
                {contact.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {contact.email}
                  </span>
                )}
                {contact.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {contact.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {canManage && !isArchived && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleArchive}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-brand-danger disabled:opacity-50"
              >
                <Archive className="h-3.5 w-3.5" /> Archive
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-neutral-50 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Current Balance</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${BALANCE_DIRECTION_COLOR[direction]}`}>
            {formatCurrency(Math.abs(Number(contact.currentBalance)), currency)}
          </p>
          <p className="text-xs text-neutral-400">{BALANCE_DIRECTION_LABEL[direction]}</p>
        </div>

        {contact.notes && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Notes</p>
            <p className="mt-1 text-sm text-neutral-600">{contact.notes}</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Activity</h2>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-black/5">
          {transactions.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-neutral-400">
              No transactions with this contact yet.
            </p>
          ) : (
            <div className="divide-y divide-neutral-50">
              {transactions.map((t) => {
                const { Icon, color } = typeVisual(t.transactionType);
                const isVoided = t.status === "VOIDED";
                return (
                  <Link
                    key={t.id}
                    href={`/transactions/${t.id}`}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/60 ${isVoided ? "opacity-50" : ""}`}
                  >
                    <Icon className={`h-6 w-6 shrink-0 ${color}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium text-neutral-800 ${isVoided ? "line-through" : ""}`}>
                        {t.description ?? t.transactionType}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {new Date(t.transactionDate).toLocaleDateString()}
                        {isVoided && <span className="text-brand-danger"> · Voided</span>}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ContactFormModal open={formOpen} onClose={() => setFormOpen(false)} businessId={businessId} editingContact={contact} />
    </div>
  );
}
