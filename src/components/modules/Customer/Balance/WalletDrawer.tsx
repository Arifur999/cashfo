"use client";

import { PiggyBank, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createAccountAction, updateAccountAction } from "@/lib/customer/accountActions";
import type { Account } from "@/lib/customer/api";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { normalizeMoneyInput } from "@/lib/customer/money";
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

// Add or edit a wallet in the design's drawer: a live preview of the card,
// the kind of wallet, its name, the account number, and -- for a new one --
// what it holds right now. The type goes to the API as accountSubtype.
export function WalletDrawer({ open, onClose, businessId, editing, currency, paletteIndex, savings = false }: WalletDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [type, setType] = useState<WalletType>("bank");
  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const result = editing
        ? // "" clears the account number; left out it would stay.
          await updateAccountAction(businessId, editing.id, { name: name.trim(), accountNumber: accountNumber.trim(), accountSubtype: subtype })
        : await createAccountAction(businessId, {
            name: name.trim(),
            accountNumber: accountNumber.trim() || undefined,
            accountType: "ASSET",
            accountSubtype: subtype,
            openingBalance: openingBalance || undefined,
          });
      if (result.success) {
        toast.success(editing ? t("Wallet updated") : t("Wallet created"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? (editing ? t("Failed to update wallet") : t("Failed to create wallet")));
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-110 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] sm:max-w-110" : "h-[92vh] rounded-t-xl")}
      >
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-6" : "px-4 pt-4 pb-2")}>
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-h3 text-ink">{savings ? (editing ? t("Edit savings wallet") : t("Add savings wallet")) : editing ? t("Edit wallet") : t("Add wallet")}</SheetTitle>
            <p className="text-small text-ink-muted">{savings ? t("Where does your saved money sit?") : t("Where do you keep this money?")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto", wide ? "p-6" : "px-4 py-3")}>
            <div aria-label={t("Preview")} className={cn("relative flex h-33 shrink-0 flex-col justify-between overflow-hidden rounded-lg p-5 text-white", palette.gradient)}>
              <span aria-hidden="true" className="absolute -top-20 -right-15 size-50 rounded-full bg-white/8" />
              <span className="relative inline-flex items-center gap-2 self-start rounded-full bg-white/16 px-2 py-0.75 text-caption font-semibold [&_svg]:size-3.5">
                {createElement(chip.icon, { "aria-hidden": true })}
                {t(chip.label)}
              </span>
              <div className="relative flex items-end justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-title">{name.trim() || t("New wallet")}</span>
                  <span className="text-caption font-normal tracking-[0.08em] text-white/75 tabular-nums">{maskAccountNumber(accountNumber) ?? t("No account number")}</span>
                </span>
                <span className="text-h2 tabular-nums">{formatCurrency(previewAmount, currency)}</span>
              </div>
            </div>

            {!savings && (
            <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-body font-medium text-ink">{t("Type")}</legend>
              <div className="grid grid-cols-3 gap-2">
                {WALLET_TYPES.map((option) => {
                  const on = option === type;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setType(option)}
                      className={cn("flex h-18 flex-col items-center justify-center gap-2 rounded-md border text-small transition-colors [&_svg]:size-5", on ? "border-[1.5px] border-emerald bg-mint-50 font-semibold text-emerald" : "border-line bg-surface font-medium text-ink-2 hover:border-line-strong")}
                    >
                      {createElement(WALLET_TYPE_META[option].icon, { "aria-hidden": true })}
                      {t(WALLET_TYPE_META[option].label)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            )}

            <Field htmlFor="wallet-name" label={<span className="text-body font-medium text-ink">{t("Wallet name")}</span>}>
              <Input id="wallet-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder={savings ? t("e.g. Islami Bank DPS") : t("e.g. Islami Bank")} />
            </Field>

            <Field
              htmlFor="wallet-number"
              label={
                <span className="text-body font-medium text-ink">
                  {t("Account number")} <span className="font-normal text-ink-muted">({t("optional")})</span>
                </span>
              }
            >
              <Input id="wallet-number" size="md" inputMode="numeric" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} maxLength={40} placeholder={t("e.g. 01711223344")} />
            </Field>

            {!editing && (
              <Field
                htmlFor="wallet-opening"
                label={
                  <span className="text-body font-medium text-ink">
                    {t("Opening balance")} <span className="font-normal text-ink-muted">({t("optional")})</span>
                  </span>
                }
                hint={t("How much is in this wallet right now. Bangla digits (২৫০০০) work too.")}
              >
                <Input
                  id="wallet-opening"
                  size="xl"
                  type="text"
                  inputMode="decimal"
                  value={openingBalance}
                  onChange={(event) => setOpeningBalance(normalizeMoneyInput(event.target.value))}
                  placeholder="0"
                  aria-describedby="wallet-opening-hint"
                  leading={<span className="flex h-13 w-12 items-center justify-center border-r border-line bg-cream text-h3 font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                  frameClassName="gap-0 overflow-hidden pl-0"
                  className="pl-4 text-h2 font-semibold tabular-nums"
                />
              </Field>
            )}
          </div>

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 pt-3 pb-6")}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {editing ? t("Save changes") : t("Create wallet")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
