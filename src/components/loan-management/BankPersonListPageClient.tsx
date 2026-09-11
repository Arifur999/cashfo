"use client";

import { Archive, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveContactAction } from "@/lib/contactActions";
import type { Contact } from "@/lib/api";
import { BALANCE_DIRECTION_COLOR, BALANCE_DIRECTION_LABEL, balanceDirection, contactInitials } from "@/lib/contactDisplay";
import { formatCurrency } from "@/lib/currency";
import { BankPersonFormModal } from "./BankPersonFormModal";

interface BankPersonListPageClientProps {
  businessId: string;
  contacts: Contact[];
  canManage: boolean;
  currency: string;
}

export function BankPersonListPageClient({ businessId, contacts, canManage, currency }: BankPersonListPageClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditingContact(null);
    setFormOpen(true);
  }

  function openEdit(e: React.MouseEvent, contact: Contact) {
    e.stopPropagation();
    setEditingContact(contact);
    setFormOpen(true);
  }

  function handleArchive(e: React.MouseEvent, contact: Contact) {
    e.stopPropagation();
    if (!window.confirm(`Archive "${contact.name}"?`)) return;
    startTransition(async () => {
      const result = await archiveContactAction(businessId, contact.id);
      if (result.success) {
        toast.success("Archived");
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to archive");
      }
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Bank / Person List</h1>
          <p className="mt-1 text-sm text-neutral-500">Banks and people you lend to or borrow from.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {contacts.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No banks or people added yet.</p>
        ) : (
          <div className="divide-y divide-neutral-50">
            {contacts.map((contact) => {
              const direction = balanceDirection(contact.currentBalance);
              const isArchived = contact.status === "ARCHIVED";
              return (
                <div
                  key={contact.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && router.push(`/contacts/${contact.id}`)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-neutral-50/60 ${isArchived ? "opacity-60" : ""}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-500">
                    {contactInitials(contact.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium text-neutral-800 ${isArchived ? "line-through" : ""}`}>{contact.name}</p>
                    <p className="text-xs text-neutral-400">
                      {contact.phone ?? contact.email ?? "No contact info"}
                      {isArchived && (
                        <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                          Archived
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-semibold tabular-nums ${BALANCE_DIRECTION_COLOR[direction]}`}>
                      {formatCurrency(Math.abs(Number(contact.currentBalance)), currency)}
                    </p>
                    <p className="text-xs text-neutral-400">{BALANCE_DIRECTION_LABEL[direction]}</p>
                  </div>
                  {canManage && !isArchived && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => openEdit(e, contact)}
                        title="Edit"
                        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={(e) => handleArchive(e, contact)}
                        title="Archive"
                        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BankPersonFormModal open={formOpen} onClose={() => setFormOpen(false)} businessId={businessId} editingContact={editingContact} />
    </div>
  );
}
