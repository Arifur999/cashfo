"use client";

import { Archive, Pencil, Plus, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveContactAction } from "@/lib/contactActions";
import type { Contact, ContactType } from "@/lib/api";
import { BALANCE_DIRECTION_COLOR, balanceDirection, CONTACT_TYPE_LABELS, contactInitials } from "@/lib/contactDisplay";
import { formatCurrency } from "@/lib/currency";
import { ContactFormModal } from "./ContactFormModal";

interface ContactsPageClientProps {
  businessId: string;
  contacts: Contact[];
  canManage: boolean;
  currency: string;
}

const FILTER_PILLS: { value: ContactType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "CUSTOMER", label: "Customers" },
  { value: "SUPPLIER", label: "Suppliers" },
];

export function ContactsPageClient({ businessId, contacts, canManage, currency }: ContactsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeType = (searchParams.get("type") as ContactType | null) ?? "";

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/contacts?${next.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", searchInput);
  }

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
        toast.success("Contact archived");
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to archive contact");
      }
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8 pb-24 md:pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Contacts</h1>
          <p className="mt-1 text-sm text-neutral-500">Customers and suppliers you do business with.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> Add Contact
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => updateParam("type", pill.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeType === pill.value ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, phone, email..."
            className="w-64 rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary"
          />
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-black/5">
        {contacts.length === 0 && <p className="px-4 py-10 text-center text-sm text-neutral-400">No contacts yet.</p>}
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
                  {contact.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={contact.photoUrl} alt={contact.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    contactInitials(contact.name)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium text-neutral-800 ${isArchived ? "line-through" : ""}`}>{contact.name}</p>
                  <p className="text-xs text-neutral-400">
                    {contact.phone ?? contact.email ?? "No contact info"}
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                      {CONTACT_TYPE_LABELS[contact.type]}
                    </span>
                    {isArchived && (
                      <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                        Archived
                      </span>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-semibold tabular-nums ${BALANCE_DIRECTION_COLOR[direction]}`}>
                  {formatCurrency(Math.abs(Number(contact.currentBalance)), currency)}
                </span>
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
      </div>

      <ContactFormModal open={formOpen} onClose={() => setFormOpen(false)} businessId={businessId} editingContact={editingContact} />
    </div>
  );
}
