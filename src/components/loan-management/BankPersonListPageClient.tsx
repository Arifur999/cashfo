"use client";

import { Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveContactAction } from "@/lib/contactActions";
import type { Contact } from "@/lib/api";
import { BALANCE_DIRECTION_COLOR, balanceDirection } from "@/lib/contactDisplay";
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

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setFormOpen(true);
  }

  function handleArchive(contact: Contact) {
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
          <p className="mt-1 text-sm text-neutral-500">Loan account information</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> Add Bank / Person
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-900">Bank / Person List</h2>
        </div>

        {contacts.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No banks or people added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium text-right">Opening Balance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {canManage && <th className="px-4 py-3 font-medium text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {contacts.map((contact, index) => {
                  const isArchived = contact.status === "ARCHIVED";
                  return (
                    <tr key={contact.id}>
                      <td className="px-4 py-3 text-neutral-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/contacts/${contact.id}`} className="flex items-center gap-2 hover:underline">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                            <Landmark className="h-4 w-4" />
                          </div>
                          <div>
                            <p className={`font-medium text-neutral-800 ${isArchived ? "line-through" : ""}`}>{contact.name}</p>
                            <p className="text-xs text-neutral-400">{contact.address || "-"}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{contact.phone ?? "-"}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${BALANCE_DIRECTION_COLOR[balanceDirection(contact.openingBalance)]}`}>
                        {formatCurrency(Math.abs(Number(contact.openingBalance)), currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={isArchived ? "text-neutral-400" : "text-brand-primary"}>{isArchived ? "Inactive" : "Active"}</span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(contact)}
                              title="Edit"
                              className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {!isArchived && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleArchive(contact)}
                                title="Archive"
                                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BankPersonFormModal open={formOpen} onClose={() => setFormOpen(false)} businessId={businessId} editingContact={editingContact} />
    </div>
  );
}
