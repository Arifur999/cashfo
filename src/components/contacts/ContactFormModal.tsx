"use client";

import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createContactAction, updateContactAction } from "@/lib/contactActions";
import type { Contact, ContactType } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

const TYPE_OPTIONS: { value: ContactType; label: string }[] = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "SUPPLIER", label: "Supplier" },
  { value: "BOTH", label: "Both" },
];

// Plain-language framing of the sign convention (see lib/contactDisplay.ts)
// so a non-accountant user enters the right number without ever seeing the
// word "positive"/"negative". SUPPLIER's helper collects a plain positive
// number from the user but the CREATE call negates it, since "we owe them"
// is a negative balance in the stored convention.
const OPENING_BALANCE_HELP: Record<ContactType, string> = {
  CUSTOMER: "If they already owe you money, enter that amount here.",
  SUPPLIER: "If you already owe them money, enter that amount here.",
  BOTH: "If there's an existing balance, enter it here. Use the sign that matches: a positive number if they owe you, a negative number if you owe them.",
};

interface ContactFormModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editingContact: Contact | null;
}

export function ContactFormModal({ open, onClose, businessId, editingContact }: ContactFormModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<ContactType>("CUSTOMER");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // React's render-time state-adjustment pattern (not useEffect) -- same
  // convention as AccountFormModal.
  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingContact?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingContact) {
        setName(editingContact.name);
        setType(editingContact.type);
        setPhone(editingContact.phone ?? "");
        setEmail(editingContact.email ?? "");
        setAddress(editingContact.address ?? "");
        setNotes(editingContact.notes ?? "");
      } else {
        setName("");
        setType("CUSTOMER");
        setPhone("");
        setEmail("");
        setAddress("");
        setNotes("");
        setOpeningBalance("");
      }
      setMoreOpen(false);
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      if (editingContact) {
        const result = await updateContactAction(businessId, editingContact.id, {
          name,
          type,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          notes: notes || undefined,
        });
        if (result.success) {
          toast.success("Contact updated");
          onClose();
          router.refresh();
        } else {
          toast.error(result.message ?? "Failed to update contact");
        }
        return;
      }

      // SUPPLIER: the form collects "how much you owe them" as a plain
      // positive number, but the stored sign convention is negative for
      // money the business owes -- negate it here at the form boundary
      // rather than asking the user to type a minus sign themselves.
      const signedOpeningBalance =
        type === "SUPPLIER" && openingBalance ? String(-Math.abs(Number(openingBalance))) : openingBalance || undefined;

      const result = await createContactAction(businessId, {
        name,
        type,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
        openingBalance: signedOpeningBalance,
      });
      if (result.success) {
        toast.success("Contact created");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to create contact");
      }
    });
  }

  const isValid = name.trim().length > 0 && (phone.trim().length > 0 || email.trim().length > 0);

  return (
    <Modal open={open} onClose={onClose} title={editingContact ? "Edit Contact" : "Add Contact"}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Karim Traders"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  type === opt.value
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
              min={type === "BOTH" ? undefined : 0}
              placeholder="0.00"
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
            <p className="mt-1 text-xs text-neutral-400">{OPENING_BALANCE_HELP[type]}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-700"
        >
          {moreOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          More details
        </button>
        {moreOpen && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
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
