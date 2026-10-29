"use client";

import { PiggyBank } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import { useOnline } from "@/components/modules/Customer/Layout/useOnline";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { useAmountField } from "@/hooks/useAmountField";
import { createAccountAction, updateAccountAction } from "@/lib/customer/accountActions";
import type { Account } from "@/lib/customer/api";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { savingsPalette } from "@/lib/customer/savingsDisplay";
import { maskAccountNumber, WALLET_TYPE_META, WALLET_TYPES, walletPalette, walletType, type WalletType } from "@/lib/customer/walletVisuals";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface WalletDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editing: Account | null;
  currency: string;
  // Which of the design's card colours the preview wears: the wallet's own
  // place in the list, or the next free one for a new wallet.
  paletteIndex: number;
  // A savings wallet (a DPS, an FDR): no kind to pick, and it is saved with
  // the savings subtype so goals can be kept in it.
  savings?: boolean;
}

// What an account number looks like for each kind; cash has none.
const NUMBER_PLACEHOLDER: Record<Exclude<WalletType, "cash">, string> = {
  bank: "e.g. 1234 5678 9012",
  mfs: "e.g. 01711223344",
};

// Add or edit a wallet in the design's 440px drawer (the shared frame): a
// live preview of the card, the kind of wallet, its name, the account
// number, and -- for a new one -- what it holds right now (an edit shows it,
// since it can't change). The type goes to the API as accountSubtype.
export function WalletDrawer({ open, onClose, businessId, editing, currency, paletteIndex, savings = false }: WalletDrawerProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  // Offline, Save waits for the connection instead of failing on send.
  const online = useOnline();
  const [type, setType] = useState<WalletType>("bank");
  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const openingBalanceField = useAmountField(openingBalance, setOpeningBalance, currency);
  const [isPending, startTransition] = useTransition();

  // Populate the instant the drawer opens, or switches to another wallet.
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setType(editing ? walletType(editing) : "bank");
      setName(editing?.name ?? "");
      setAccountNumber(editing?.accountNumber ?? "");
      setOpeningBalance("");
    }
  }

  const valid = name.trim().length > 0;
  const palette = savings ? savingsPalette(paletteIndex) : walletPalette(paletteIndex);
  const chip = savings ? { icon: PiggyBank, label: "Savings wallet" } : WALLET_TYPE_META[type];
  const subtype = savings ? "savings" : type;
  const previewAmount = editing ? editing.currentBalance : openingBalance || 0;
  // Cash has no account number; a savings wallet's reads like a bank's.
  const numbered = savings || type !== "cash";
  const numberPlaceholder = NUMBER_PLACEHOLDER[savings || type === "cash" ? "bank" : type];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || !online) return;
    startTransition(async () => {
      try {
        const result = editing
          ? // "" clears the account number. Cash has none, so a wallet
            // turned into Cash (or a cash one holding a stray number) loses it,
            // as the preview above already shows.
            await updateAccountAction(businessId, editing.id, { name: name.trim(), accountNumber: numbered ? accountNumber.trim() : "", accountSubtype: subtype })
          : await createAccountAction(businessId, {
              name: name.trim(),
              accountNumber: (numbered && accountNumber.trim()) || undefined,
              accountType: "ASSET",
              accountSubtype: subtype,
              openingBalance: openingBalance || undefined,
            });
        if (result.success) {
          toast.success(editing ? t("Wallet updated") : t("Wallet created"));
          onClose();
          router.refresh();
        } else {
          toast.error(t(result.message ?? (editing ? "Failed to update wallet" : "Failed to create wallet")));
        }
      } catch {
        // No answer at all (offline): nothing was saved, and the form keeps what was typed.
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  return (
    <Drawer
      popup
      open={open}
      width={440}
      title={savings ? (editing ? t("Edit savings wallet") : t("Add savings wallet")) : editing ? t("Edit wallet") : t("Add wallet")}
      description={savings ? t("Where does your saved money sit?") : t("Where do you keep this money?")}
      busy={isPending}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={!valid || isPending || !online} className="px-4.5">
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {editing ? t("Save changes") : t("Create wallet")}
          </Button>
        </>
      }
    >
      {/* One picture to a screen reader; the fields below say the same. */}
      <div role="img" aria-label={t("Preview")} className={cn("relative flex h-33 shrink-0 flex-col justify-between overflow-hidden rounded-[14px] p-4.5 text-white", palette.gradient)}>
        <span aria-hidden="true" className="absolute -top-20 -right-15 size-50 rounded-full bg-white/8" />
        <span className="relative inline-flex items-center gap-1.5 self-start rounded-full bg-white/16 px-2.25 py-0.75 text-[11px] font-semibold [&_svg]:size-3">
          {createElement(chip.icon, { "aria-hidden": true })}
          {t(chip.label)}
        </span>
        <div className="relative flex items-end justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-title">{name.trim() || t("New wallet")}</span>
            <span className="text-caption font-normal tracking-[0.08em] text-white/75 tabular-nums">{(numbered && maskAccountNumber(accountNumber)) || t("No account number")}</span>
          </span>
          <span className="text-h2 tabular-nums">{formatCurrency(previewAmount, currency, fmt)}</span>
        </div>
      </div>

      {!savings && (
        // Real radio buttons: one kind at a time, arrow keys move between them.
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Type")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {WALLET_TYPES.map((option) => {
              const on = option === type;
              return (
                <label
                  key={option}
                  className={cn(
                    "flex h-18 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-field border text-small transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring [&_svg]:size-5",
                    on ? "border-[1.5px] border-emerald bg-mint-50 font-semibold text-emerald" : "border-line bg-surface font-medium text-ink-soft hover:border-line-strong",
                  )}
                >
                  <input type="radio" name="wallet-type" value={option} checked={on} onChange={() => setType(option)} className="sr-only" />
                  {createElement(WALLET_TYPE_META[option].icon, { "aria-hidden": true })}
                  {t(WALLET_TYPE_META[option].label)}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <Field htmlFor="wallet-name" label={t("Wallet name")}>
        <Input id="wallet-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder={savings ? t("e.g. Islami Bank DPS") : t("e.g. Islami Bank")} />
      </Field>

      {numbered && (
        <Field
          htmlFor="wallet-number"
          label={
            <>
              {t("Account number")} <span className="font-normal text-ink-muted">({t("optional")})</span>
            </>
          }
        >
          <Input id="wallet-number" size="md" inputMode="numeric" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} maxLength={40} placeholder={t(numberPlaceholder)} />
        </Field>
      )}

      {editing ? (
        // It can't be edited (the API keeps the opening as it was), so show
        // it and say how a wrong one is put right.
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-body leading-[normal] font-medium text-ink">{t("Opening balance")}</span>
          <div className="flex h-11 items-center rounded-field border border-line bg-strip px-3.5 text-body font-semibold text-ink tabular-nums">{formatCurrency(editing.openingBalance, currency, fmt)}</div>
          <p className="text-caption font-normal text-ink-muted">{t("It can't be changed. To fix the balance, add an income or expense for the difference.")}</p>
        </div>
      ) : (
        <Field
          htmlFor="wallet-opening"
          label={
            <>
              {t("Opening balance")} <span className="font-normal text-ink-muted">({t("optional")})</span>
            </>
          }
          hint={t("How much is in this wallet right now. Bangla digits (২৫০০০) work too.")}
        >
          {/* The board's 52px amount box with 8px corners (a touch smaller
              than the Move money one). */}
          <Input
            id="wallet-opening"
            size="xl"
            type="text"
            inputMode="decimal"
            {...openingBalanceField}
            placeholder="0"
            aria-describedby="wallet-opening-hint"
            leading={<span className="flex h-13 w-12 items-center justify-center border-r border-line bg-strip text-h3 font-semibold text-ink-soft">{currencySymbol(currency)}</span>}
            frameClassName="h-13 gap-0 overflow-hidden rounded-sm pl-0"
            className="pl-3.5 text-[20px] font-semibold tabular-nums"
          />
        </Field>
      )}
    </Drawer>
  );
}
