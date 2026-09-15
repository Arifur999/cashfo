"use client";

import { Camera, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent } from "react";
import { toast } from "sonner";
import { createContactAction, updateContactAction, uploadContactPhotoAction } from "@/lib/contactActions";
import type { Contact, ContactCategory, ContactType } from "@/lib/api";
import { contactInitials } from "@/lib/contactDisplay";
import { Modal } from "@/components/ui/Modal";

// "Both" is deliberately not offered here anymore -- new/edited contacts
// pick a single type. It's still a valid stored value though (existing
// contacts created before this change may have it), so the select adds it
// back in as an option ONLY while editing a contact that's currently BOTH
// (see the render below), rather than silently breaking that contact's
// dropdown or forcing a type change just to open the edit form.
const TYPE_OPTIONS: { value: ContactType; label: string }[] = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "SUPPLIER", label: "Supplier" },
  { value: "RELATIVE", label: "Relative" },
  { value: "OTHER", label: "Other" },
];

type BalanceDirection = "THEY_OWE_ME" | "I_OWE_THEM";

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
  const [category, setCategory] = useState<ContactCategory>("BUSINESS");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [direction, setDirection] = useState<BalanceDirection>("THEY_OWE_ME");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
        setCategory(editingContact.category);
        setPhone(editingContact.phone ?? "");
        setAddress(editingContact.address ?? "");
        setNotes(editingContact.notes ?? "");
        setPhotoUrl(editingContact.photoUrl ?? "");
      } else {
        setName("");
        setType("CUSTOMER");
        setCategory("BUSINESS");
        setPhone("");
        setAddress("");
        setNotes("");
        setOpeningBalance("");
        setDirection("THEY_OWE_ME");
        setPhotoUrl("");
      }
    }
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadContactPhotoAction(businessId, formData);
    if (result.success && result.data) {
      setPhotoUrl(result.data.url);
    } else {
      toast.error(result.message ?? "Failed to upload photo");
    }
    setUploadingPhoto(false);
  }

  function handleSubmit() {
    startTransition(async () => {
      if (editingContact) {
        const result = await updateContactAction(businessId, editingContact.id, {
          name,
          type,
          category,
          phone: phone || undefined,
          address: address || undefined,
          notes: notes || undefined,
          // Sent as-is (not `|| undefined`) -- the backend treats `undefined`
          // as "leave unchanged", so clearing the photo (empty string) has to
          // be sent explicitly rather than omitted, unlike the other optional
          // fields above where "" and "never touched" are meant to behave
          // the same way.
          photoUrl,
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

      // The user always picks a plain-language direction ("They owe me" /
      // "I owe them") rather than typing a signed number -- converted here
      // to the stored sign convention (positive = business is owed,
      // negative = business owes them; see lib/contactDisplay.ts).
      const signedOpeningBalance = openingBalance
        ? String(direction === "I_OWE_THEM" ? -Math.abs(Number(openingBalance)) : Math.abs(Number(openingBalance)))
        : undefined;

      const result = await createContactAction(businessId, {
        name,
        type,
        category,
        phone: phone || undefined,
        address: address || undefined,
        notes: notes || undefined,
        openingBalance: signedOpeningBalance,
        photoUrl: photoUrl || undefined,
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

  const isValid = name.trim().length > 0 && phone.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title={editingContact ? "Edit Contact" : "Add Contact"}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Photo <span className="text-neutral-400">(optional)</span>
          </label>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-sm font-semibold text-neutral-500">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Contact" className="h-14 w-14 object-cover" />
              ) : (
                contactInitials(name || "?")
              )}
            </div>
            <label
              htmlFor="contact-photo-input"
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {photoUrl ? "Change Photo" : "Upload Photo"}
            </label>
            <input id="contact-photo-input" type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} className="hidden" />
            {photoUrl && (
              <button
                type="button"
                onClick={() => setPhotoUrl("")}
                title="Remove photo"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Karim Traders"
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ContactType)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            {editingContact?.type === "BOTH" && <option value="BOTH">Both</option>}
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Relationship</label>
          <div className="flex gap-2 rounded-xl bg-neutral-50 p-1">
            <button
              type="button"
              onClick={() => setCategory("BUSINESS")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                category === "BUSINESS" ? "bg-surface text-brand-primary shadow-sm ring-2 ring-brand-primary" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Trade (Sale/Purchase)
            </button>
            <button
              type="button"
              onClick={() => setCategory("LOAN")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                category === "LOAN" ? "bg-surface text-brand-primary shadow-sm ring-2 ring-brand-primary" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Loan
            </button>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            This contact shows up in every dashboard and report either way — it only changes the wording used on their page (e.g. &quot;Give a Loan&quot; vs
            &quot;Record Sale on Credit&quot;).
          </p>
        </div>

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
          <label className="mb-1 block text-sm font-medium text-neutral-700">Address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        {!editingContact && (
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Opening Balance <span className="text-neutral-400">(optional)</span>
            </label>
            <div className="mb-2 flex gap-2 rounded-xl bg-neutral-50 p-1">
              <button
                type="button"
                onClick={() => setDirection("THEY_OWE_ME")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  direction === "THEY_OWE_ME" ? "bg-surface text-brand-primary shadow-sm ring-2 ring-brand-primary" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                They owe me
              </button>
              <button
                type="button"
                onClick={() => setDirection("I_OWE_THEM")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  direction === "I_OWE_THEM" ? "bg-surface text-brand-danger shadow-sm ring-2 ring-brand-danger" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                I owe them
              </button>
            </div>
            <input
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              type="number"
              step="0.01"
              min={0}
              placeholder="0.00"
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
            <p className="mt-1 text-xs text-neutral-400">If there&apos;s an existing balance, enter the amount and pick who owes whom.</p>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Notes <span className="text-neutral-400">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
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
