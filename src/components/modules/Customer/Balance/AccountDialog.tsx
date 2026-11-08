"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOnline } from "@/components/modules/Customer/Layout/useOnline";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { createAccountAction, updateAccountAction } from "@/lib/customer/accountActions";
import type { WalletOverviewRow } from "@/lib/customer/api";
import { ACCOUNT_COLORS, accountColor, TYPE_COLOR, walletColorStyle } from "@/lib/customer/balanceDisplay";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { maskAccountNumber, WALLET_TYPE_META, WALLET_TYPES, walletType, type WalletType } from "@/lib/customer/walletVisuals";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  // The account being edited; null adds one.
  editing: WalletOverviewRow | null;
  // Every account's name, for "you already have one called that".
  takenNames: { id: string; name: string }[];
  currency: string;
  // The account is saved: the page shows it. openingNow is the new opening
  // balance when an edit changed it.
  onSaved: (name: string, created: boolean, openingNow?: string) => void;
}

// What each kind's name and number look like.
const PLACEHOLDERS: Record<WalletType, { name: string; numberLabel: string; number: string }> = {
  cash: { name: "e.g. Cash in hand", numberLabel: "Account number", number: "" },
  bank: { name: "e.g. Dutch-Bangla Bank", numberLabel: "Account number", number: "1051 2345 6789" },
  mfs: { name: "e.g. Nagad", numberLabel: "Mobile number", number: "01711-223344" },
};

// Add or edit an account (board: Balance — Add account popup): a live
// preview of its card, its colour, its kind (fixed once made), its name and
// number, and what it held at the start. An edit can put a wrong opening
// balance right; the current balance moves by the same amount.
export function AccountDialog({ open, onClose, businessId, editing, takenNames, currency, onSaved }: AccountDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const online = useOnline();
  const [type, setType] = useState<WalletType>("bank");
  const [color, setColor] = useState<string>(TYPE_COLOR.bank);
  // The colour follows the kind until one is picked.
  const [colorPicked, setColorPicked] = useState(false);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [opening, setOpening] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "add") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      const kind = editing ? walletType(editing) : "bank";
      setType(kind);
      setColor(editing ? accountColor(editing) : TYPE_COLOR[kind]);
      setColorPicked(Boolean(editing?.color));
      setName(editing?.name ?? "");
      setNumber(editing?.accountNumber ?? "");
      setOpening(editing ? String(Number(editing.openingBalance)) : "");
      setError("");
    }
  }

  const placeholders = PLACEHOLDERS[type];
  const numbered = type !== "cash";
  const digits = number.replace(/\D/g, "");
  // An edit's opening balance, left empty, stays as it was.
  const openingShift = editing && opening.trim() !== "" ? Number(opening) - Number(editing.openingBalance) : 0;
  const openingChanged = Boolean(editing) && Number.isFinite(openingShift) && Math.abs(openingShift) >= 0.005;
  const previewBalance = editing ? Number(editing.currentBalance) + (openingChanged ? openingShift : 0) : opening || 0;

  function pickType(next: WalletType) {
    if (editing) return;
    setType(next);
    if (!colorPicked) setColor(TYPE_COLOR[next]);
    setError("");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !online) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("Give the account a name."));
      return;
    }
    if (takenNames.some((other) => other.id !== editing?.id && other.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(t("You already have an account named {name}.", { name: trimmed }));
      return;
    }
    // A colour the kind gives anyway is stored as none, so it follows the kind.
    const ownColor = color === TYPE_COLOR[type] && !editing?.color ? undefined : color;
    startTransition(async () => {
      try {
        const result = editing
          ? await updateAccountAction(businessId, editing.id, { name: trimmed, accountNumber: numbered ? digits : "", ...(ownColor && { color: ownColor }), ...(openingChanged && { openingBalance: String(Number(opening)) }) })
          : await createAccountAction(businessId, {
              name: trimmed,
              accountType: "ASSET",
              accountSubtype: type,
              accountNumber: numbered && digits ? digits : undefined,
              openingBalance: opening || undefined,
              ...(ownColor && { color: ownColor }),
            });
        if (result.success) {
          onSaved(trimmed, !editing, openingChanged ? String(Number(opening)) : undefined);
          onClose();
          router.refresh();
        } else {
          setError(t(result.message ?? (editing ? "Couldn't save the account." : "Couldn't add the account.")));
        }
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={500}
      title={t(editing ? "Edit account" : "Add account")}
      onSubmit={submit}
      bodyClassName="gap-3.5"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending || !online}>
            {isPending && <Loader size={16} onDark label={t("Saving...")} />}
            {t(editing ? "Save changes" : "Add account")}
          </Button>
        </>
      }
    >
      {/* One picture to a screen reader; the fields below say the same. */}
      <div role="img" aria-label={t("Card preview")} style={walletColorStyle(color)} className="relative flex h-30 shrink-0 flex-col justify-between overflow-hidden rounded-[14px] bg-wallet-card px-4.5 py-4 text-white">
        <span aria-hidden="true" className="absolute -top-20 -right-15 size-50 rounded-full bg-white/8" />
        <span className="relative inline-flex items-center gap-1.5 self-start rounded-full bg-white/16 px-2.25 py-0.75 text-[11px] font-semibold [&_svg]:size-3">
          {createElement(WALLET_TYPE_META[type].icon, { "aria-hidden": true })}
          {t(WALLET_TYPE_META[type].label)}
        </span>
        <span className="relative flex items-end justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-body-lg font-semibold">{name.trim() || t("Account name")}</span>
            <span className="text-caption tracking-[0.08em] text-white/75 tabular-nums">{(numbered && maskAccountNumber(digits)) || t("No account number")}</span>
          </span>
          <span className="text-[22px] font-bold whitespace-nowrap tabular-nums">{formatCurrency(previewBalance, currency, fmt)}</span>
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span id="account-color" className="text-small font-semibold text-ink-2">
          {t("Card colour")}
        </span>
        <div role="radiogroup" aria-labelledby="account-color" className="flex flex-wrap gap-2.5 px-1 py-0.5">
          {ACCOUNT_COLORS.map((swatch, index) => {
            const on = swatch === color;
            return (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={t("Colour {number}", { number: formatCount(index + 1, fmt) })}
                title={t("Colour {number}", { number: formatCount(index + 1, fmt) })}
                onClick={() => {
                  setColor(swatch);
                  setColorPicked(true);
                }}
                style={walletColorStyle(swatch)}
                className={cn("flex size-7.5 items-center justify-center rounded-full bg-(--wallet) text-white", on && "ring-2 ring-(--wallet) ring-offset-2 ring-offset-surface")}
              >
                {on && <Check className="size-3.75" strokeWidth={3} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1.5 text-small font-semibold text-ink-2">{t("Type")}</legend>
        <div className="grid grid-cols-3 gap-2">
          {WALLET_TYPES.map((option) => {
            const on = option === type;
            const locked = !!editing && !on;
            return (
              <label
                key={option}
                className={cn(
                  "flex h-15 flex-col items-center justify-center gap-1 rounded-xl border text-small transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring [&_svg]:size-4.5",
                  on ? "border-[1.5px] border-emerald bg-mint-50 font-semibold text-emerald" : "border-line bg-surface font-medium text-ink-soft",
                  locked ? "cursor-not-allowed opacity-45" : !on && "cursor-pointer hover:border-line-strong",
                )}
              >
                <input type="radio" name="account-type" value={option} checked={on} disabled={locked} onChange={() => pickType(option)} className="sr-only" />
                {createElement(WALLET_TYPE_META[option].icon, { "aria-hidden": true })}
                {t(WALLET_TYPE_META[option].label)}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field htmlFor="account-name" label={<span className="text-small font-semibold text-ink-2">{t("Account name")}</span>}>
        <Input
          id="account-name"
          size="md"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          maxLength={40}
          placeholder={t(placeholders.name)}
          invalid={Boolean(error) && !name.trim()}
          autoFocus={!editing}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          htmlFor="account-number"
          label={
            <span className={cn("text-small font-semibold text-ink-2", !numbered && "opacity-50")}>
              {t(placeholders.numberLabel)} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
            </span>
          }
        >
          <Input id="account-number" size="md" inputMode="numeric" value={numbered ? number : ""} onChange={(event) => setNumber(event.target.value)} disabled={!numbered} maxLength={40} placeholder={placeholders.number} />
        </Field>
        <Field htmlFor="account-opening" label={<span className="text-small font-semibold text-ink-2">{t("Opening balance ({symbol})", { symbol: currencySymbol(currency, fmt) })}</span>}>
          <AmountInput id="account-opening" size="field" value={opening} onChange={setOpening} currency={currency} describedBy="account-opening-hint" />
        </Field>
      </div>
      <p id="account-opening-hint" aria-live="polite" className={cn("-mt-1.5 text-caption leading-[1.45]", openingChanged ? "text-warning" : "text-ink-muted")}>
        {editing
          ? openingChanged
            ? t("Opening balance {from} → {to}. The current balance moves the same way: {now} → {after}.", {
                from: formatCurrency(editing.openingBalance, currency, fmt),
                to: formatCurrency(opening, currency, fmt),
                now: formatCurrency(editing.currentBalance, currency, fmt),
                after: formatCurrency(previewBalance, currency, fmt),
              })
            : t("Entered it wrong? Fix it here. The current balance moves by the same amount.")
          : t("How much is in this account right now.")}
      </p>
      {error && (
        <p role="alert" className="-mt-1 text-small text-expense">
          {error}
        </p>
      )}
    </PopupDialog>
  );
}
