"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createContactAction, updateContactAction } from "@/lib/contactActions";
import type { Contact } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

interface BankPersonFormModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editingContact: Contact | null;
}

// A bank/loan contact defaults to type "BOTH" -- unlike Dena-Pawna's
// Customer/Supplier split, a person or bank you have a loan relationship
// with can naturally both receive loans from you AND give you loans over
// time, so there's no useful up-front classification to ask for here
// (type "BOTH" already satisfies both recordSale's and recordPurchase's
// contact-type checks). category is always "LOAN", keeping this contact
// out of the Dena-Pawna business views entirely.
export function BankPersonFormModal({ open, onClose, businessId, editingContact }: BankPersonFormModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingContact?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingContact) {
        setName(editingContact.name);
        setPhone(editingContact.phone ?? "");
        setEmail(editingContact.email ?? "");
      } else {
        setName("");
        setPhone("");
        setEmail("");
        setOpeningBalance("");
      }
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = editingContact
        ? await updateContactAction(businessId, editingContact.id, {
            name,
            phone: phone || undefined,
            email: email || undefined,
          })
        : await createContactAction(businessId, {
            name,
            type: "BOTH",
            category: "LOAN",
            phone: phone || undefined,
            email: email || undefined,
            openingBalance: openingBalance || undefined,
          });

      if (result.success) {
        toast.success(editingContact ? "Updated" : "Added");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to save");
      }
    });
  }

  const isValid = name.trim().length > 0 && (phone.trim().length > 0 || email.trim().length > 0);

  return (
    <Modal open={open} onClose={onClose} title={editingContact ? "Edit Bank / Person" : "Add Bank / Person"}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Arif, or Islami Bank"
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>
        {phone.trim().length === 0 && email.trim().length === 0 && (
          <p className="text-xs text-neutral-400">Provide at least a phone number or an email.</p>
        )}

        {!editingContact && (
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Opening Balance <span className="text-neutral-400">(optional)</span>
            </label>
            <input
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
            <p className="mt-1 text-xs text-neutral-400">
              Positive if they already owe you (Pawna); negative if you already owe them (Dena).
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          Cancel
        </button>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingContact ? "Save Changes" : "Create"}
        </button>
      </div>
    </Modal>
  );
}
