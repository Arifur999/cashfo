"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createContactAction, updateContactAction } from "@/lib/contactActions";
import type { Contact } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface BankPersonFormModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editingContact: Contact | null;
}

type OpeningBalanceKind = "PAWNA" | "DENA" | "ZERO";

// A bank/loan contact defaults to type "BOTH" -- unlike Dena-Pawna's
// Customer/Supplier split, a person or bank you have a loan relationship
// with can naturally both receive loans from you AND give you loans over
// time, so there's no useful up-front classification to ask for here
// (type "BOTH" already satisfies both recordSale's and recordPurchase's
// contact-type checks). category is always "LOAN", keeping this contact
// out of the Dena-Pawna business views entirely.
export function BankPersonFormModal({ open, onClose, businessId, editingContact }: BankPersonFormModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [balanceKind, setBalanceKind] = useState<OpeningBalanceKind>("ZERO");
  const [openingBalance, setOpeningBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingContact?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingContact) {
        setName(editingContact.name);
        setPhone(editingContact.phone ?? "");
        setAddress(editingContact.address ?? "");
        setNotes(editingContact.notes ?? "");
      } else {
        setName("");
        setPhone("");
        setAddress("");
        setBalanceKind("ZERO");
        setOpeningBalance("");
        setNotes("");
      }
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = editingContact
        ? await updateContactAction(businessId, editingContact.id, {
            name,
            phone: phone || undefined,
            address: address || undefined,
            notes: notes || undefined,
          })
        : await createContactAction(businessId, {
            name,
            type: "BOTH",
            category: "LOAN",
            phone: phone || undefined,
            address: address || undefined,
            notes: notes || undefined,
            // Pawna ("they owe us") is positive, Dena ("we owe them") is
            // negative -- same sign convention as everywhere else in this
            // app (Contact.currentBalance, the Loan Dashboard's Total
            // Dena/Pawna split). Zero Balance skips asking for an amount.
            openingBalance:
              balanceKind === "ZERO" ? undefined : balanceKind === "DENA" ? String(-Math.abs(Number(openingBalance || 0))) : openingBalance || undefined,
          });

      if (result.success) {
        toast.success(editingContact ? t("Updated") : t("Added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save"));
      }
    });
  }

  const isValid = name.trim().length > 0 && phone.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title={editingContact ? t("Edit Bank / Person") : t("Add Bank / Person")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Name")} <span className="text-brand-danger">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g. Arif, or Islami Bank")}
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Phone")} <span className="text-brand-danger">*</span>
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Address")} <span className="text-neutral-400">{t("(optional)")}</span>
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        {!editingContact && (
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Opening Balance")}</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBalanceKind("PAWNA")}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                  balanceKind === "PAWNA" ? "border-brand-primary bg-brand-primary/10" : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium text-neutral-800">
                  <span className="h-2 w-2 rounded-full bg-brand-primary" /> {t("Pawna")}
                </span>
                <span className="text-xs text-neutral-400">{t("They owe us")}</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceKind("DENA")}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                  balanceKind === "DENA" ? "border-brand-danger bg-brand-danger/10" : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium text-neutral-800">
                  <span className="h-2 w-2 rounded-full bg-brand-danger" /> {t("Dena")}
                </span>
                <span className="text-xs text-neutral-400">{t("We owe them")}</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceKind("ZERO")}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                  balanceKind === "ZERO" ? "border-neutral-400 bg-neutral-100" : "border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium text-neutral-800">
                  <span className="h-2 w-2 rounded-full bg-neutral-300" /> {t("Zero Balance")}
                </span>
                <span className="text-xs text-neutral-400">{t("Nothing outstanding")}</span>
              </button>
            </div>
            {balanceKind !== "ZERO" && (
              <input
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                autoFocus
                className="mt-2 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Notes")} <span className="text-neutral-400">{t("(optional)")}</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingContact ? t("Save Changes") : t("Save")}
        </button>
      </div>
    </Modal>
  );
}
