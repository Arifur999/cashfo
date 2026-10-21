"use client";

import { Camera, ImagePlus, Trash2, WifiOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOnline } from "@/components/modules/Customer/Layout/useOnline";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAmountField } from "@/hooks/useAmountField";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Contact, ContactCategory, ContactType } from "@/lib/customer/api";
import { createContactAction, updateContactAction, uploadContactPhotoAction } from "@/lib/customer/contactActions";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { DIRECTION_META, LOAN_KIND_LABELS, LOAN_KINDS, loanErrorText } from "@/lib/customer/loanDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
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

type BalanceKind = "PAWNA" | "DENA" | "ZERO";

const BALANCE_KINDS: { value: BalanceKind; label: string; on: string }[] = [
  { value: "PAWNA", label: "They owe me", on: "text-income" },
  { value: "DENA", label: "I owe them", on: "text-expense" },
  { value: "ZERO", label: "Nothing yet", on: "text-ink" },
];
const BALANCE_VALUES = BALANCE_KINDS.map((option) => option.value);
const CATEGORIES: ContactCategory[] = ["LOAN", "BUSINESS"];

// Loose on purpose: the API takes any text, this only catches a slip.
const EMAIL = /^\S+@\S+\.\S+$/;

// Add or edit a bank or person in the design's drawer: a photo or logo,
// the name, what they are, (in a business workspace) whether you lend to
// them or trade with them, a phone or an email, the address, and -- for a
// new one -- where the balance stands now.
export function LoanContactDrawer({ open, onClose, businessId, editing, currency, canTrade }: LoanContactDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const online = useOnline();
  const wide = useMediaQuery("(min-width: 768px)");
  const groupId = useId();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ContactType>("BOTH");
  const [category, setCategory] = useState<ContactCategory>("LOAN");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [balanceKind, setBalanceKind] = useState<BalanceKind>("ZERO");
  const [openingBalance, setOpeningBalance] = useState("");
  const openingBalanceField = useAmountField(openingBalance, setOpeningBalance, currency);
  const [isPending, startTransition] = useTransition();

  // Populate the instant the drawer opens, or switches to another contact.
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setPhotoUrl(editing?.photoUrl ?? "");
      setName(editing?.name ?? "");
      setType(editing?.type ?? "BOTH");
      setCategory(canTrade ? (editing?.category ?? "LOAN") : "LOAN");
      setPhone(editing?.phone ?? "");
      setEmail(editing?.email ?? "");
      setAddress(editing?.address ?? "");
      setBalanceKind("ZERO");
      setOpeningBalance("");
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

  const amount = Number(openingBalance) || 0;
  const trimmedName = name.trim();
  const reachable = phone.trim().length > 0 || email.trim().length > 0;
  const emailOk = !email.trim() || EMAIL.test(email.trim());
  const valid = trimmedName.length > 0 && reachable && emailOk && (balanceKind === "ZERO" || amount > 0);
  // Moving a contact with a loan history to Books takes them, and their
  // entries, out of every Loans page.
  const hasLoanHistory = !!editing && (!!editing.lastActivityAt || Number(editing.currentBalance) !== 0 || Number(editing.openingBalance) !== 0);
  const money = (figure: number) => formatCurrency(figure, currency);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || !online) return;
    const trade = canTrade && category === "BUSINESS";
    if (trade && editing?.category === "LOAN" && hasLoanHistory) {
      const moving = await confirm({
        title: t("Move {name} to Books?", { name: trimmedName }),
        message: t("They and their entries leave Loans and show in Books › Customers & suppliers instead."),
        confirmLabel: "Move to Books",
        danger: false,
      });
      if (!moving) return;
    }
    startTransition(async () => {
      try {
        const base = { name: trimmedName, type, category: canTrade ? category : "LOAN", phone: phone.trim() || undefined, email: email.trim() || undefined, address: address.trim() || undefined, photoUrl: photoUrl || undefined };
        const result = editing
          ? // Empty fields sent as "" so they clear; left out they would stay.
            await updateContactAction(businessId, editing.id, { ...base, phone: phone.trim(), email: email.trim(), address: address.trim(), photoUrl })
          : // Pawna (they owe us) is positive, dena (we owe them) negative, as
            // everywhere else in the app.
            await createContactAction(businessId, { ...base, openingBalance: balanceKind === "ZERO" ? undefined : String(balanceKind === "DENA" ? -amount : amount) });
        if (!result.success) {
          toast.error(loanErrorText(result.message, editing ? "Failed to update contact" : "Failed to create contact", t, money));
          return;
        }
        if (trade) {
          // They live in Books now, not on this page: say where.
          toast.success(t("Saved in Books › Customers & suppliers"), { action: { label: t("Open Books"), onClick: () => router.push("/contacts") } });
        } else {
          toast.success(editing ? t("Contact updated") : t("Contact added"));
        }
        onClose();
        router.refresh();
      } catch {
        toast.error(t("Couldn't save. Check your connection and try again."));
      }
    });
  }

  const direction = balanceKind === "PAWNA" ? DIRECTION_META.PAWNA : DIRECTION_META.DENA;
  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );
  const shownName = trimmedName || t("This contact");
  const reachError = trimmedName.length > 0 && !reachable;
  const photoLabel = photoUrl ? t("Change photo or logo") : t("Upload photo or logo");

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-117.5 shadow-drawer data-[side=right]:sm:max-w-117.5" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}
      >
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-h3 text-ink">{editing ? t("Edit contact") : t("Add contact")}</SheetTitle>
            <SheetDescription className="text-small leading-[normal] text-ink-muted">{t("A person, bank or NGO you lend to or borrow from.")}</SheetDescription>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                aria-label={photoLabel}
                title={photoLabel}
                className="relative flex size-13 shrink-0 items-center justify-center overflow-visible rounded-lg border border-dashed border-line-strong bg-info-soft text-info disabled:opacity-60"
              >
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="size-full rounded-lg object-cover" />
                ) : uploading ? (
                  <Loader size={18} label={t("Loading...")} />
                ) : (
                  <ImagePlus className="size-5.5" aria-hidden="true" />
                )}
                <span aria-hidden="true" className="absolute -right-1.5 -bottom-1.5 flex size-5.5 items-center justify-center rounded-full border border-line bg-surface text-ink-2">
                  <Camera className="size-3" />
                </span>
              </button>
              <input ref={fileInput} type="file" accept="image/*" onChange={choosePhoto} className="hidden" />
              <Field htmlFor="ct-name" label={label(t("Name"))} className="flex-1">
                <Input id="ct-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={120} placeholder={t("e.g. Arif, or Islami Bank")} />
              </Field>
            </div>
            {photoUrl && (
              <button type="button" onClick={() => setPhotoUrl("")} disabled={uploading} className="-mt-2 inline-flex w-fit items-center gap-1.5 rounded-sm text-caption font-semibold text-expense hover:underline disabled:opacity-60">
                <Trash2 className="size-3.5" aria-hidden="true" />
                {t("Remove photo")}
              </button>
            )}

            <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
              <legend id={`${groupId}-kind`} className="mb-2 text-body leading-[normal] font-medium text-ink">
                {t("Who is this?")}
              </legend>
              <div role="radiogroup" aria-labelledby={`${groupId}-kind`} className="flex flex-wrap gap-2">
                {LOAN_KINDS.map((kind) => {
                  const on = kind === type;
                  return (
                    <button key={kind} {...radioProps(kind, { values: LOAN_KINDS, value: type, onChange: setType })} className={cn("h-8.5 rounded-full border px-3 text-small transition-colors pointer-coarse:h-11", on ? "border-[1.5px] border-emerald bg-mint-50 font-semibold text-emerald" : "border-line bg-surface font-medium text-ink-2 hover:border-line-strong")}>
                      {t(LOAN_KIND_LABELS[kind])}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {canTrade && (
              <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                <legend id={`${groupId}-category`} className="mb-2 text-body leading-[normal] font-medium text-ink">
                  {t("What do you do with them?")}
                </legend>
                <div role="radiogroup" aria-labelledby={`${groupId}-category`} aria-describedby={`${groupId}-category-hint`} className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "LOAN", title: "Loan", sub: "Lend or borrow money" },
                      { value: "BUSINESS", title: "Trade", sub: "Sell or buy on credit" },
                    ] as const
                  ).map((option) => {
                    const on = option.value === category;
                    return (
                      <button key={option.value} {...radioProps(option.value, { values: CATEGORIES, value: category, onChange: setCategory })} className={cn("flex flex-col items-start gap-0.5 rounded-md border p-3 text-left transition-colors", on ? "border-[1.5px] border-emerald bg-mint-50" : "border-line bg-surface hover:border-line-strong")}>
                        <span className={cn("text-small font-semibold", on ? "text-emerald" : "text-ink")}>{t(option.title)}</span>
                        <span className={cn("text-caption font-normal", on ? "text-ink-2" : "text-ink-muted")}>{t(option.sub)}</span>
                      </button>
                    );
                  })}
                </div>
                <span id={`${groupId}-category-hint`} className="text-caption font-normal text-ink-muted">
                  {t("Trade contacts are kept in Books › Customers & suppliers, not in Loans.")}
                </span>
              </fieldset>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                htmlFor="ct-phone"
                label={label(t("Phone"))}
                hint={t("A phone or an email is needed, so they can be reached.")}
                error={reachError ? t("Add a phone or an email, so they can be reached.") : undefined}
              >
                <Input id="ct-phone" size="md" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} placeholder="01XXX-XXXXXX" invalid={reachError} aria-describedby={reachError ? "ct-phone-error" : "ct-phone-hint"} className="px-0" frameClassName="px-3" />
              </Field>
              <Field htmlFor="ct-email" label={label(t("Email"))} error={!emailOk ? t("Enter a valid email") : undefined}>
                <Input id="ct-email" size="md" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={120} placeholder="name@example.com" invalid={!emailOk} autoComplete="off" className="px-0" frameClassName="px-3" />
              </Field>
            </div>
            <Field htmlFor="ct-address" label={label(t("Address"), true)}>
              <Input id="ct-address" size="md" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={200} placeholder={t("Motijheel branch")} className="px-0" frameClassName="px-3" />
            </Field>

            {!editing && (
              <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                <legend id={`${groupId}-balance`} className="mb-2 text-body leading-[normal] font-medium text-ink">
                  {t("Balance right now")} <span className="font-normal text-ink-muted">({t("optional")})</span>
                </legend>
                <div role="radiogroup" aria-labelledby={`${groupId}-balance`} className="grid grid-cols-3 gap-1 rounded-md bg-surface-sunken p-1">
                  {BALANCE_KINDS.map((option) => {
                    const on = option.value === balanceKind;
                    return (
                      <button key={option.value} {...radioProps(option.value, { values: BALANCE_VALUES, value: balanceKind, onChange: setBalanceKind })} className={cn("h-9 rounded-sm text-small transition-colors pointer-coarse:h-11", on ? cn("bg-surface font-semibold shadow-card", option.on) : "font-medium text-ink-2 hover:text-ink")}>
                        {t(option.label)}
                      </button>
                    );
                  })}
                </div>
                {balanceKind !== "ZERO" && (
                  <>
                    <Input
                      size="xl"
                      type="text"
                      inputMode="decimal"
                      {...openingBalanceField}
                      placeholder="0"
                      aria-label={t("Opening balance")}
                      autoFocus
                      leading={<span className="flex h-13 w-12 items-center justify-center border-r border-line bg-strip text-h3 font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                      frameClassName="gap-0 overflow-hidden pl-0"
                      className="pl-4 text-h2 font-bold tabular-nums"
                    />
                    <span className={cn("flex items-center gap-2 text-caption font-normal", direction.text)}>
                      <Chip tone={direction.chip} size="sm">
                        {t(direction.name)}
                      </Chip>
                      <span className="min-w-0">{t(balanceKind === "DENA" ? "{name} starts with {amount} you owe them." : "{name} starts with {amount} they owe you.", { name: shownName, amount: money(amount) })}</span>
                    </span>
                  </>
                )}
              </fieldset>
            )}
          </div>

          <div className={cn("flex flex-col gap-2 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 pt-3 pb-6")}>
            {!online && (
              <p role="status" className="flex items-center gap-2 text-caption text-warning">
                <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
                {t("You're offline. Saving waits until the internet is back.")}
              </p>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
                {t("Cancel")}
              </Button>
              <Button type="submit" variant="action" disabled={!valid || isPending || uploading || !online} className="px-5">
                {isPending && <Loader size={16} onDark label={t("Loading...")} />}
                {editing ? t("Save changes") : t("Add contact")}
              </Button>
            </div>
          </div>
        </form>
        {confirmDialog}
      </SheetContent>
    </Sheet>
  );
}
