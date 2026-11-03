"use client";

import { Archive, ArchiveRestore, Camera, CircleAlert, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ChangeEvent } from "react";
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
import { archiveContactAction, createContactAction, deleteContactAction, unarchiveContactAction, updateContactAction, uploadContactPhotoAction } from "@/lib/customer/contactActions";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
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
  // Whether anything is posted with them: Remove then archives, which needs
  // a settled balance. Unknown counts as yes.
  hasEntries?: boolean;
  businessId: string;
  currency: string;
  onClose: () => void;
  // Where to go once the person is gone (the detail page leaves).
  onRemoved?: () => void;
}

// Add or edit a customer or supplier: who they are, how to reach them and,
// for a new one, what is already owed either way.
export function ContactDrawer({ open, editing, hasEntries = true, businessId, currency, onClose, onRemoved }: ContactDrawerProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const photoInput = useRef<HTMLInputElement>(null);
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
  // Save was pressed without a phone or an email.
  const [tried, setTried] = useState(false);
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
      setTried(false);
    }
  }

  // The API keeps a contact only with a way to reach them, new or edited.
  const reachable = phone.trim() !== "" || email.trim() !== "";
  const valid = name.trim().length > 0 && reachable;
  const missingReach = tried && !reachable;
  // A type from before Books (relative, other) stays pickable while editing.
  const types = editing && !TYPES.includes(editing.type) ? [...TYPES, editing.type] : TYPES;

  // Archiving needs a settled balance, either way; so does Remove once
  // there are entries with them, since it archives then.
  const balance = Number(editing?.currentBalance ?? 0);
  const owed = Math.abs(balance) >= 0.005;
  const unsettled = !owed ? null : balance > 0 ? t("They still owe you {amount}. It can be archived once that is settled.", { amount: formatCurrency(balance, currency, fmt) }) : t("You still owe them {amount}. It can be archived once that is settled.", { amount: formatCurrency(-balance, currency, fmt) });
  const removeBlocked = owed && hasEntries;
  const archived = editing?.status === "ARCHIVED";

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
      else toast.error(t(result.message ?? "Failed to upload photo"));
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
    if (isPending || uploading) return;
    if (!reachable) {
      setTried(true);
      return;
    }
    if (!valid) return;
    startTransition(async () => {
      // Sent as-is, empty included: the API reads a missing field as "leave
      // unchanged", so an emptied phone or address must still go.
      const shared = { name: name.trim(), type, phone: phone.trim(), email: email.trim(), address: address.trim(), notes: notes.trim(), photoUrl };
      const amount = Math.abs(Number(opening)) || 0;
      const result = editing
        ? await updateContactAction(businessId, editing.id, shared)
        : await createContactAction(businessId, { ...shared, category: "BUSINESS", phone: shared.phone || undefined, email: shared.email || undefined, address: shared.address || undefined, notes: shared.notes || undefined, photoUrl: photoUrl || undefined, openingBalance: amount > 0 ? (direction === "YOU_OWE" ? -amount : amount).toFixed(2) : undefined });
      if (result.success) finish(t(editing ? "Saved@@contact" : "Added"));
      else toast.error(t(result.message ?? (editing ? "Failed to update contact" : "Failed to create contact")));
    });
  }

  function archive() {
    if (!editing) return;
    startTransition(async () => {
      const result = await archiveContactAction(businessId, editing.id);
      if (result.success) finish(t("Archived. They stay in the books, marked archived."));
      else toast.error(t(result.message ?? "Failed to archive contact"));
    });
  }

  // The drawer only opens for the owner or an accountant, the two roles the
  // API lets bring a contact back.
  function unarchive() {
    if (!editing) return;
    startTransition(async () => {
      const result = await unarchiveContactAction(businessId, editing.id);
      if (result.success) finish(t("Active again. New entries can be recorded with them."));
      else toast.error(t(result.message ?? "Failed to reactivate contact"));
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
        toast.error(t(result.message ?? "Failed to remove contact"));
      }
    });
  }

  const optional = <span className="font-normal text-ink-muted"> ({t("optional")})</span>;
  const reachLine = t("A phone or an email, so they can be reached");

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
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending || uploading}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={name.trim().length === 0 || isPending || uploading} className="px-5">
              {isPending && <Loader />}
              {t(editing ? "Save changes" : "Add")}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-4">
          <PersonAvatar name={name || "?"} src={photoUrl || null} size={44} coloured />
          {/* A real button, so the keyboard reaches it; the file field stays hidden. */}
          <Button type="button" variant="secondary" size="sm" onClick={() => photoInput.current?.click()} disabled={uploading} className="pointer-coarse:h-11">
            {uploading ? <Loader /> : <Camera className="size-4" aria-hidden="true" />}
            {t(photoUrl ? "Change photo" : "Add a photo")}
          </Button>
          <input ref={photoInput} id="ct-photo" type="file" accept="image/*" onChange={pickPhoto} disabled={uploading} tabIndex={-1} aria-hidden="true" className="hidden" />
          {photoUrl && (
            <button type="button" onClick={() => setPhotoUrl("")} aria-label={t("Remove photo")} className="flex size-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-expense pointer-coarse:size-11">
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

        {/* One line under the pair: the hint, and the error once Save was
            pressed without either. Both fields point at it. */}
        <div className="flex flex-col gap-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="ct-phone" label={t("Phone")}>
              <Input id="ct-phone" size="md" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} placeholder="01712-345678" invalid={missingReach} aria-describedby="ct-reach" className="font-mono" />
            </Field>
            <Field htmlFor="ct-email" label={t("Email")}>
              <Input id="ct-email" size="md" type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={120} invalid={missingReach} aria-describedby="ct-reach" />
            </Field>
          </div>
          <p id="ct-reach" role={missingReach ? "alert" : undefined} className={missingReach ? "flex items-center gap-2 text-caption text-expense" : "text-caption text-ink-muted"}>
            {missingReach && <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />}
            {reachLine}
          </p>
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
              <Input id="ct-opening" size="md" inputMode="decimal" value={opening} onChange={(event) => setOpening(limitMoneyDecimals(event.target.value))} placeholder="0.00" className="tabular-nums" leading={<span className="font-semibold text-ink-2">{currencySymbol(currency, fmt)}</span>} />
            </div>
          </Field>
        )}

        {editing && (
          <div className="mt-2 flex flex-col gap-3 rounded-md border border-line bg-strip p-4">
            <span className="flex flex-col gap-0.5">
              <b className="text-body font-semibold text-ink">{t(archived ? "Make active again or remove" : "Archive or remove")}</b>
              <span className="text-small text-ink-muted">{t(archived ? "Their history stays here. Make them active again to record new sales, purchases and payments with them." : "Archiving keeps their history and marks them archived. It is possible only when nothing is owed either way.")}</span>
            </span>
            <span className="flex flex-wrap gap-2">
              {editing.status === "ACTIVE" && (
                <Button type="button" variant="secondary" size="sm" onClick={archive} disabled={isPending || owed} aria-describedby={unsettled ? "ct-unsettled" : undefined}>
                  <Archive />
                  {t("Archive")}
                </Button>
              )}
              {archived && (
                <Button type="button" variant="secondary" size="sm" onClick={unarchive} disabled={isPending}>
                  <ArchiveRestore />
                  {t("Make active again")}
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => setRemoving(true)} disabled={isPending || removeBlocked} aria-describedby={removeBlocked && unsettled ? "ct-unsettled" : undefined} className="text-expense hover:bg-expense-soft hover:text-expense">
                <Trash2 />
                {t("Remove")}
              </Button>
            </span>
            {unsettled && (editing.status === "ACTIVE" || removeBlocked) && (
              <p id="ct-unsettled" className="text-caption text-ink-muted">
                {unsettled}
              </p>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={removing} onClose={() => setRemoving(false)} onConfirm={remove} isPending={isPending} danger title={t("Remove this person?")} description={editing ? t("{name} will be removed from the books. If there are already entries with them, they are archived instead, so nothing is lost.", { name: editing.name }) : ""} confirmLabel={t("Remove")} />
    </>
  );
}
