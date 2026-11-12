"use client";

import { Camera, ImagePlus, Info, Landmark, Trash2, Users, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOnline } from "@/components/modules/Customer/Layout/useOnline";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import { useAmountField } from "@/hooks/useAmountField";
import type { Contact, ContactCategory, ContactType } from "@/lib/customer/api";
import { createContactAction, deleteContactAction, updateContactAction, uploadContactPhotoAction } from "@/lib/customer/contactActions";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { bdMobileOk, LOAN_FORM_KINDS, LOAN_KIND_LABELS, loanErrorText } from "@/lib/customer/loanDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { offerUndo } from "./offerUndo";
import { radioProps } from "./radio";

interface LoanContactDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editing: Contact | null;
  currency: string;
  // A business workspace keeps trade contacts in Books, so only there can a
  // contact be a trade one; everywhere else they are all loans.
  canTrade: boolean;
}

// What was owed before Smartly: nothing, they owe me (pawna, positive) or
// I owe them (dena, negative).
type Owed = "NONE" | "THEY" | "ME";
const OWED: { value: Owed; label: string; on: string }[] = [
  { value: "NONE", label: "Nothing@@owed", on: "text-ink" },
  { value: "THEY", label: "They owe me", on: "text-income" },
  { value: "ME", label: "I owe them", on: "text-expense" },
];
const OWED_VALUES = OWED.map((option) => option.value);
// The photo tile before one is added: a bank or NGO in its own colours.
const KIND_TILE: Partial<Record<ContactType, string>> = { BANK: "bg-info-soft text-info", NGO: "bg-pillar-insights-soft text-pillar-insights" };
const LABEL = "text-[13px] font-semibold text-ink-2 leading-[normal]";
const FIELD = "rounded-field";

// Loose on purpose: the API takes any text, this only catches a slip.
const EMAIL = /^\S+@\S+\.\S+$/;

type Errors = Partial<Record<"name" | "phone" | "amount" | "email", string>>;

// Add or edit a bank or person (LoanContacts board's popup): what they are,
// the name, a phone, what was owed before Smartly, and a line about the
// loan -- plus, on Edit, the photo, email or address a contact already has.
export function LoanContactDrawer({ open, onClose, businessId, editing, currency, canTrade }: LoanContactDrawerProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const online = useOnline();
  const groupId = useId();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ContactType | "">("");
  const [category, setCategory] = useState<ContactCategory>("LOAN");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [owed, setOwed] = useState<Owed>("NONE");
  const [opening, setOpening] = useState("");
  const openingField = useAmountField(opening, setOpening, currency);
  const [errors, setErrors] = useState<Errors>({});
  const [isPending, startTransition] = useTransition();

  // Fill the form the moment it opens, or switches to another contact.
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      const start = Number(editing?.openingBalance ?? 0);
      setPhotoUrl(editing?.photoUrl ?? "");
      setName(editing?.name ?? "");
      setType(editing?.type ?? "");
      setCategory(canTrade ? (editing?.category ?? "LOAN") : "LOAN");
      setPhone(editing?.phone ?? "");
      setEmail(editing?.email ?? "");
      setAddress(editing?.address ?? "");
      setNotes(editing?.notes ?? "");
      setOwed(start > 0 ? "THEY" : start < 0 ? "ME" : "NONE");
      setOpening(start ? String(Math.abs(start)) : "");
      setErrors({});
    }
  }

  async function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadContactPhotoAction(businessId, formData);
      if (result.success && result.data) setPhotoUrl(result.data.url);
      else toast.error(t(result.message ?? "Failed to upload photo"));
    } catch {
      toast.error(t("Failed to upload photo"));
    } finally {
      setUploading(false);
    }
  }

  const trade = canTrade && category === "BUSINESS";
  const amount = Number(opening) || 0;
  const signedOpening = owed === "NONE" ? 0 : owed === "ME" ? -amount : amount;
  // An older contact may be a supplier or "other": it keeps that choice.
  const kinds = editing && !LOAN_FORM_KINDS.includes(editing.type) ? [...LOAN_FORM_KINDS, editing.type] : LOAN_FORM_KINDS;
  // Moving a contact with a loan history to Books takes them, and their
  // entries, out of every Loans page.
  const hasLoanHistory = !!editing && (!!editing.lastActivityAt || Number(editing.currentBalance) !== 0 || Number(editing.openingBalance) !== 0);
  const hasEntries = !!editing?.lastActivityAt;
  const money = (figure: number) => formatCurrency(figure, currency, fmt);

  // The board's checks, said under the field on Save. A phone kept as it
  // was (a bank's hotline, say) is not checked again.
  function check(): Errors {
    const found: Errors = {};
    const phoneChanged = phone.trim() !== (editing?.phone ?? "");
    if (!name.trim()) found.name = t(type ? "Enter a name." : "Pick a type first.");
    if (phoneChanged && !bdMobileOk(phone)) found.phone = t("Enter a Bangladeshi mobile number, like 01711-223344.");
    if (owed !== "NONE" && !(amount > 0)) found.amount = t(opening.trim() ? "The amount must be more than 0." : "Enter the amount.");
    if (email.trim() && !EMAIL.test(email.trim())) found.email = t("Enter a valid email");
    // A trade contact is invoiced, so it needs a way to be reached.
    if (trade && !phone.trim() && !email.trim()) found.phone = t("Add a phone or an email, so they can be reached.");
    return found;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !online) return;
    const found = check();
    if (!type) found.name = found.name ?? t("Pick a type first.");
    setErrors(found);
    if (Object.keys(found).length > 0 || !type) return;
    if (trade && editing?.category === "LOAN" && hasLoanHistory) {
      const moving = await confirm({
        title: t("Move {name} to Books?", { name: name.trim() }),
        message: t("They and their entries leave Loans and show in Books › Customers & suppliers instead."),
        confirmLabel: "Move to Books",
        danger: false,
      });
      if (!moving) return;
    }
    startTransition(async () => {
      try {
        const base = { name: name.trim(), type, category: canTrade ? category : ("LOAN" as const), photoUrl: photoUrl || undefined, openingBalance: String(signedOpening) };
        const result = editing
          ? // Empty fields sent as "" so they clear; left out they would stay.
            await updateContactAction(businessId, editing.id, { ...base, phone: phone.trim(), email: email.trim(), address: address.trim(), notes: notes.trim(), photoUrl, ...(signedOpening === Number(editing.openingBalance) && { openingBalance: undefined }) })
          : await createContactAction(businessId, { ...base, phone: phone.trim() || undefined, email: email.trim() || undefined, address: address.trim() || undefined, notes: notes.trim() || undefined, openingBalance: signedOpening ? String(signedOpening) : undefined });
        if (!result.success) {
          toast.error(loanErrorText(result.message, editing ? "Failed to update contact" : "Failed to create contact", t, money));
          return;
        }
        if (trade) {
          // They live in Books now, not on this page: say where.
          toast.success(t("Saved in Books › Customers & suppliers"), { action: { label: t("Open Books"), onClick: () => router.push("/contacts") } });
        } else if (editing) {
          // Undo puts every field back as it was, the opening balance too.
          const before = editing;
          offerUndo({
            message: t("Contact updated"),
            run: () =>
              updateContactAction(businessId, before.id, {
                name: before.name,
                type: before.type,
                phone: before.phone ?? "",
                email: before.email ?? "",
                address: before.address ?? "",
                notes: before.notes ?? "",
                photoUrl: before.photoUrl ?? "",
                ...{ openingBalance: String(before.openingBalance) },
              }),
            done: t("Change undone"),
            failed: t("Couldn't undo the change"),
            undoLabel: t("Undo"),
            refresh: () => router.refresh(),
          });
        } else if (result.data) {
          // Nothing is entered with them yet, so Undo deletes them for good.
          const addedId = result.data.id;
          offerUndo({
            message: t("Contact added"),
            run: () => deleteContactAction(businessId, addedId),
            done: t("Contact removed"),
            failed: t("Couldn't remove the contact"),
            undoLabel: t("Undo"),
            refresh: () => router.refresh(),
          });
        }
        onClose();
        router.refresh();
      } catch {
        toast.error(t("Couldn't save. Check your connection and try again."));
      }
    });
  }

  const photoLabel = photoUrl ? t("Change photo or logo") : t("Upload photo or logo");
  // The board asks for none of these. A contact that already has a photo,
  // an email or an address keeps them in sight on Edit, to change or clear.
  const keepPhoto = !!editing?.photoUrl;
  const keepMore = !!(editing?.email || editing?.address);
  const errorLine = (id: string, text: string | undefined) =>
    text && (
      <span id={id} role="alert" className="text-[12.5px] text-expense">
        {text}
      </span>
    );

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={520}
      busy={isPending}
      onSubmit={submit}
      headClassName="items-center pt-4 pr-5 pb-3.5 pl-6"
      titleClassName="text-[18px] font-bold leading-[normal]"
      closeClassName="my-0 bg-surface-sunken text-ink-soft hover:bg-line"
      bodyClassName="gap-4 px-6 py-4.5"
      footerClassName="px-6"
      title={editing ? t("Edit contact") : t("Add contact")}
      sub={<span className="text-[12.5px] leading-[normal]">{editing ? t("Fix the name, type, phone or details.") : t("Someone you lend to or borrow from.")}</span>}
      footer={
        <div className="flex w-full flex-col gap-2">
          {!online && (
            <p role="status" className="flex items-center gap-2 text-caption text-warning">
              <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
              {t("You're offline. Saving waits until the internet is back.")}
            </p>
          )}
          <div className="flex items-center justify-end gap-2.5">
            <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" size="lg" disabled={isPending || uploading || !online} className="px-5.5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {editing ? t("Save changes") : t("Add contact@@button")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <span id={`${groupId}-kind`} className={LABEL}>
          {t("Type")}
        </span>
        <div role="radiogroup" aria-labelledby={`${groupId}-kind`} className="flex flex-wrap gap-1.5">
          {kinds.map((kind) => {
            const on = kind === type;
            return (
              <button
                key={kind}
                {...radioProps<ContactType | "">(kind, { values: kinds, value: type, onChange: (next) => setType(next) })}
                className={cn("h-8.5 rounded-full border-[1.5px] px-3.5 text-[13px] font-semibold transition-colors pointer-coarse:h-11", on ? "border-emerald bg-emerald-soft text-emerald" : "border-line bg-surface text-ink-2 hover:border-input")}
              >
                {t(LOAN_KIND_LABELS[kind])}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ct-name" className={LABEL}>
          {t("Name")}
        </label>
        <div className="flex items-center gap-2.5">
          {keepPhoto && (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            aria-label={photoLabel}
            title={photoLabel}
            className={cn("relative flex size-11 shrink-0 items-center justify-center rounded-field border border-dashed border-input disabled:opacity-60", type ? (KIND_TILE[type] ?? "bg-surface-sunken text-ink-2") : "bg-surface-sunken text-ink-2")}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="size-full rounded-field object-cover" />
            ) : uploading ? (
              <Loader size={16} label={t("Loading...")} />
            ) : (
              createElement(type === "BANK" ? Landmark : type === "NGO" ? Users : ImagePlus, { className: "size-4.5", "aria-hidden": true })
            )}
            <span aria-hidden="true" className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full border border-line bg-surface text-ink-soft">
              <Camera className="size-2.75" strokeWidth={2.25} />
            </span>
          </button>
          )}
          {keepPhoto && <input ref={fileInput} type="file" accept="image/*" onChange={choosePhoto} className="hidden" />}
          <Input
            id="ct-name"
            size="md"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            maxLength={50}
            placeholder={t("e.g. Rahim Uddin or Sonali Bank")}
            invalid={!!errors.name}
            aria-describedby={errors.name ? "ct-name-error" : undefined}
            frameClassName={cn(FIELD, "flex-1")}
          />
        </div>
        {errorLine("ct-name-error", errors.name)}
        {photoUrl && (
          <button type="button" onClick={() => setPhotoUrl("")} disabled={uploading} className="inline-flex w-fit items-center gap-1.5 rounded-sm text-caption font-semibold text-expense hover:underline disabled:opacity-60">
            <Trash2 className="size-3.5" aria-hidden="true" />
            {t("Remove photo")}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ct-phone" className={LABEL}>
          {t(trade ? "Phone" : "Phone (optional)")}
        </label>
        <Input
          id="ct-phone"
          size="md"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          maxLength={16}
          placeholder="01XXXXXXXXX"
          invalid={!!errors.phone}
          aria-describedby={errors.phone ? "ct-phone-error" : undefined}
          frameClassName={FIELD}
          className="tabular-nums"
        />
        {errorLine("ct-phone-error", errors.phone)}
      </div>

      <div className="flex flex-col gap-2">
        <span id={`${groupId}-owed`} className="flex flex-col gap-px">
          <span className={LABEL}>{t("Opening balance")}</span>
          <span className="text-[12px] leading-[normal] text-ink-muted">{t("What was owed before you started using Smartly")}</span>
        </span>
        <div role="radiogroup" aria-labelledby={`${groupId}-owed`} className="grid grid-cols-3 gap-1 rounded-[12px] bg-surface-sunken p-1">
          {OWED.map((option) => {
            const on = option.value === owed;
            return (
              <button key={option.value} {...radioProps(option.value, { values: OWED_VALUES, value: owed, onChange: setOwed })} className={cn("h-9 rounded-[9px] text-[13px] font-semibold transition-colors pointer-coarse:h-11", on ? cn("bg-surface shadow-[0_1px_3px_rgba(18,32,29,0.12)]", option.on) : "text-ink-soft hover:text-ink")}>
                {t(option.label)}
              </button>
            );
          })}
        </div>
        {owed !== "NONE" && (
          <>
            <Input
              size="md"
              type="text"
              inputMode="decimal"
              {...openingField}
              placeholder="0"
              aria-label={t("Opening balance")}
              invalid={!!errors.amount}
              aria-describedby={errors.amount ? "ct-amount-error" : undefined}
              leading={<span className="text-[14px] font-semibold text-ink-faint">{currencySymbol(currency, fmt)}</span>}
              frameClassName={cn(FIELD, "gap-1.5")}
              className="text-[14px] font-semibold tabular-nums"
            />
            {errorLine("ct-amount-error", errors.amount)}
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ct-notes" className={LABEL}>
          {t("Details (optional)")}
        </label>
        <Input id="ct-notes" size="md" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={80} placeholder={t("e.g. House loan, shop credit")} frameClassName={FIELD} />
      </div>

      {keepMore && (
        <div id="ct-more" className="grid gap-2.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ct-email" className={LABEL}>
              {t("Email")}
            </label>
            <Input id="ct-email" size="md" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={120} placeholder="name@example.com" invalid={!!errors.email} autoComplete="off" frameClassName={FIELD} />
            {errorLine("ct-email-error", errors.email)}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ct-address" className={LABEL}>
              {t("Address")}
            </label>
            <Input id="ct-address" size="md" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={200} placeholder={t("Motijheel branch")} frameClassName={FIELD} />
          </div>
        </div>
      )}

      {editing && hasEntries && (
        <p className="flex gap-2.5 rounded-[12px] bg-mint-50 px-3 py-2.5 text-[12.5px] leading-normal text-brand-ink">
          <Info className="mt-0.5 size-3.75 shrink-0" strokeWidth={2.25} aria-hidden="true" />
          <span>{t("Its entries stay as they are. Changing the opening balance moves the current balance by the same amount.")}</span>
        </p>
      )}
      {confirmDialog}
    </PopupDialog>
  );
}
