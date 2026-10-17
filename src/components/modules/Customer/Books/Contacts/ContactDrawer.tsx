"use client";

import { Archive, Camera, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent } from "react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { Contact, ContactType } from "@/lib/customer/api";
import { CONTACT_TYPE_WORD } from "@/lib/customer/booksDisplay";
import { archiveContactAction, createContactAction, deleteContactAction, updateContactAction, uploadContactPhotoAction } from "@/lib/customer/contactActions";
import { currencySymbol } from "@/lib/customer/currency";
import { limitMoneyDecimals } from "@/lib/customer/money";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Drawer } from "../shared/Drawer";

// The API's own limit for photos.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const TYPES: ContactType[] = ["CUSTOMER", "SUPPLIER", "BOTH"];

interface ContactDrawerProps {
  open: boolean;
  // The person being edited; null adds a new one.
  editing: Contact | null;
  businessId: string;
  currency: string;
  onClose: () => void;
  // Where to go once the person is gone (the detail page leaves).
  onRemoved?: () => void;
}

// Add or edit a customer or supplier: who they are, how to reach them and,
// for a new one, what is already owed either way.
export function ContactDrawer({ open, editing, businessId, currency, onClose, onRemoved }: ContactDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<ContactType>("CUSTOMER");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState("");
  const [direction, setDirection] = useState<"THEY_OWE" | "YOU_OWE">("THEY_OWE");
  const [removing, setRemoving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setType(editing?.type ?? "CUSTOMER");
      setPhone(editing?.phone ?? "");
      setEmail(editing?.email ?? "");
      setAddress(editing?.address ?? "");
      setNotes(editing?.notes ?? "");
      setPhotoUrl(editing?.photoUrl ?? "");
      setOpening("");
      setDirection("THEY_OWE");
      setRemoving(false);
    }
  }

  const valid = name.trim().length > 0;
  // A type from before Books (relative, other) stays pickable while editing.
  const types = editing && !TYPES.includes(editing.type) ? [...TYPES, editing.type] : TYPES;

  async function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error(t("Image must be 5MB or smaller"));
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const result = await uploadContactPhotoAction(businessId, formData);
      if (result.success && result.data) setPhotoUrl(result.data.url);
      else toast.error(result.message ?? t("Failed to upload photo"));
    } catch {
      toast.error(t("Failed to upload photo"));
    } finally {
      setUploading(false);
    }
  }

  function finish(message: string) {
    toast.success(message);
    onClose();
    router.refresh();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      // Sent as-is, empty included: the API reads a missing field as "leave
      // unchanged", so an emptied phone or address must still go.
      const shared = { name: name.trim(), type, phone: phone.trim(), email: email.trim(), address: address.trim(), notes: notes.trim(), photoUrl };
      const amount = Math.abs(Number(opening)) || 0;
      const result = editing
        ? await updateContactAction(businessId, editing.id, shared)
        : await createContactAction(businessId, { ...shared, category: "BUSINESS", phone: shared.phone || undefined, email: shared.email || undefined, address: shared.address || undefined, notes: shared.notes || undefined, photoUrl: photoUrl || undefined, openingBalance: amount > 0 ? (direction === "YOU_OWE" ? -amount : amount).toFixed(2) : undefined });
      if (result.success) finish(t(editing ? "Saved" : "Added"));
      else toast.error(result.message ?? t(editing ? "Failed to update contact" : "Failed to create contact"));
    });
  }

  function archive() {
    if (!editing) return;
    startTransition(async () => {
      const result = await archiveContactAction(businessId, editing.id);
      if (result.success) finish(t("Archived. They stay in the books but drop out of the lists."));
      else toast.error(result.message ?? t("Failed to archive contact"));
    });
  }

  function remove() {
    if (!editing) return;
    startTransition(async () => {
      const result = await deleteContactAction(businessId, editing.id);
      if (result.success) {
        const deleted = result.data?.action === "deleted";
        toast.success(t(deleted ? "Removed" : "Archived instead, as there are entries with them"));
        setRemoving(false);
        onClose();
        if (deleted && onRemoved) onRemoved();
        else router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete contact"));
      }
    });
  }

  const optional = <span className="font-normal text-ink-muted"> ({t("optional")})</span>;

  return (
    <>
      <Drawer
        open={open}
        title={editing ? t("Edit person or shop") : t("Add person or shop")}
        busy={isPending || uploading}
        onClose={onClose}
        onSubmit={submit}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending || uploading} className="px-5">
              {isPending && <Loader />}
              {t(editing ? "Save changes" : "Add")}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-4">
          <PersonAvatar name={name || "?"} src={photoUrl || null} size={44} coloured />
          <label htmlFor="ct-photo" className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-line-strong bg-surface px-3.5 text-small font-semibold text-ink hover:bg-surface-sunken">
            {uploading ? <Loader /> : <Camera className="size-4" aria-hidden="true" />}
            {t(photoUrl ? "Change photo" : "Add a photo")}
          </label>
          <input id="ct-photo" type="file" accept="image/*" onChange={pickPhoto} disabled={uploading} className="hidden" />
          {photoUrl && (
            <button type="button" onClick={() => setPhotoUrl("")} aria-label={t("Remove photo")} className="flex size-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-expense">
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <Field htmlFor="ct-name" label={t("Name")}>
          <Input id="ct-name" size="md" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoFocus placeholder={t("The person's name, or the shop's")} />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-small font-semibold text-ink-2">{t("They are a")}</legend>
          <SegmentedControl label={t("They are a")} value={type} onChange={setType} stretch options={types.map((value) => ({ value, label: t(CONTACT_TYPE_WORD[value]) }))} />
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="ct-phone" label={<>{t("Phone")}{optional}</>}>
            <Input id="ct-phone" size="md" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} placeholder="01712-345678" className="font-mono" />
          </Field>
          <Field htmlFor="ct-email" label={<>{t("Email")}{optional}</>}>
            <Input id="ct-email" size="md" type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={120} />
          </Field>
        </div>
        <Field htmlFor="ct-address" label={<>{t("Address")}{optional}</>}>
          <Input id="ct-address" size="md" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={200} placeholder={t("Shop 14, Eastern Plaza, Hatirpool")} />
        </Field>
        <Field htmlFor="ct-notes" label={<>{t("Notes")}{optional}</>}>
          <Textarea id="ct-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} />
        </Field>

        {!editing && (
          <Field htmlFor="ct-opening" label={<>{t("Already owed")}{optional}</>} hint={t("Money owed from before you started keeping books here. It can't be changed later.")}>
            <div className="flex flex-col gap-2">
              <SegmentedControl label={t("Which way")} value={direction} onChange={setDirection} stretch options={[{ value: "THEY_OWE", label: t("They owe you") }, { value: "YOU_OWE", label: t("You owe them") }]} />
              <Input id="ct-opening" size="md" inputMode="decimal" value={opening} onChange={(event) => setOpening(limitMoneyDecimals(event.target.value))} placeholder="0.00" className="tabular-nums" leading={<span className="font-semibold text-ink-2">{currencySymbol(currency)}</span>} />
            </div>
          </Field>
        )}

        {editing && (
          <div className="mt-2 flex flex-col gap-3 rounded-md border border-line bg-cream p-4">
            <span className="flex flex-col gap-0.5">
              <b className="text-body font-semibold text-ink">{t("Archive or remove")}</b>
              <span className="text-small text-ink-muted">{t("Archiving keeps their history but hides them from the lists. Removing is only possible while there are no entries with them.")}</span>
            </span>
            <span className="flex flex-wrap gap-2">
              {editing.status === "ACTIVE" && (
                <Button type="button" variant="secondary" size="sm" onClick={archive} disabled={isPending}>
                  <Archive />
                  {t("Archive")}
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => setRemoving(true)} disabled={isPending} className="text-expense hover:bg-expense-soft hover:text-expense">
                <Trash2 />
                {t("Remove")}
              </Button>
            </span>
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={removing} onClose={() => setRemoving(false)} onConfirm={remove} isPending={isPending} danger title={t("Remove this person?")} description={editing ? `${editing.name} ${t("will be removed from the books. If there are already entries with them, they are archived instead, so nothing is lost.")}` : ""} confirmLabel={t("Remove")} />
    </>
  );
}
