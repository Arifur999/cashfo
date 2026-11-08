"use client";

import { CircleAlert, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import Textarea from "@/components/smartly/form/Textarea";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, AssetCategoryOption } from "@/lib/customer/api";
import { addOwnedAssetAction, purchaseAssetAction } from "@/lib/customer/assetActions";
import { isActiveCategory } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { getAppToday } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { TypeChoice } from "./TypeChoice";
import { useDrawerWallets } from "./useDrawerWallets";

interface AssetDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  categories: AssetCategoryOption[];
  currency: string;
  // Open on "I bought it now" or "I already own it".
  initialMode?: Mode;
  // The type picked when it opens (an empty type's own "Add asset").
  initialCategory?: string;
  // "add": All assets' Add asset popup (the categories as chips, with Add
  // category); "full": Purchase & Sell's (a Category list).
  variant?: "full" | "add";
  // Above the form (Purchase & Sell's Purchase / Sale tabs), with the
  // popup's own title.
  tabs?: React.ReactNode;
  title?: string;
}

type Mode = "buy" | "own";

const NOTE_MAX = 300;
const LABEL = "text-[14px] font-medium text-ink";

// Add an asset: something bought now (the price leaves an account) or
// something already owned (nothing moves; the date it was got and its
// value, and optionally what it is worth today). Name, category, date and
// price, the account for a purchase, and a note.
export function AssetDrawer({ open, onClose, businessId, categories, currency, initialMode = "buy", initialCategory, variant = "full", tabs, title }: AssetDrawerProps) {
  const adding = variant === "add";
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  // What it's worth today ("I already own it"): follows the value until it
  // is typed over.
  const [worth, setWorth] = useState<string | null>(null);
  // An account picked by hand. Until then the popup pays from the first
  // regular account that covers the price.
  const [pickedWalletId, setPickedWalletId] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const { wallets, savingsWallets, loading, error: walletsError } = useDrawerWallets(open, businessId);
  const [isPending, startTransition] = useTransition();
  const offered = categories.filter(isActiveCategory);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMode(initialMode);
      setName("");
      // Purchase & Sell asks for a category; Add asset starts on the one
      // its page was showing.
      setCategory(adding && offered.some((option) => option.name === initialCategory) ? (initialCategory ?? "") : adding ? (offered.find((option) => option.name === "Other")?.name ?? offered[0]?.name ?? "") : "");
      setPrice("");
      setWorth(null);
      setPickedWalletId("");
      setDate(getAppToday());
      setNote("");
    }
  }

  const value = Number(price) || 0;
  const buying = mode === "buy";
  const all = [...wallets, ...savingsWallets];
  const covers = (candidate: Account) => Number(candidate.currentBalance) >= value;
  // The hand-picked account while this workspace still has it, else the
  // first regular account that covers the price. Money set aside in savings
  // is spent only when picked by hand (or when there is no regular account
  // at all); a short regular account says so below instead.
  const wallet = all.find((candidate) => candidate.id === pickedWalletId) ?? wallets.find(covers) ?? wallets[0] ?? savingsWallets.find(covers) ?? savingsWallets[0];
  const lang = displayLanguage(locale);
  const walletLabel = (candidate: Account) => `${accountDisplayName(candidate, lang)} · ${formatCurrency(candidate.currentBalance, currency, fmt)}`;
  const short = buying && wallet !== undefined && value > 0 && !covers(wallet);
  // An emptied "Value today" means the value again.
  const worthValue = worth === null || worth.trim() === "" ? value : Number(worth) || 0;
  const lastDay = getAppToday();
  // A typed date can still fall outside the picker's range.
  const valid = name.trim().length > 0 && category.length > 0 && value > 0 && date <= lastDay && (buying ? wallet !== undefined && !short : worthValue > 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || (buying && !wallet)) return;
    const input = { name: name.trim(), category, purchaseDate: date, purchasePrice: value, notes: note.trim() || undefined };
    // Got today at what it is worth: the value says it all.
    const valueToday = worthValue !== value || date !== lastDay ? worthValue : undefined;
    startTransition(async () => {
      if (buying && wallet) {
        const result = await purchaseAssetAction(businessId, { ...input, purchaseAccountId: wallet.id });
        if (!result.success) {
          toast.error(t(result.message ?? "Failed to add the asset"));
          return;
        }
        toast.success(t("Asset bought"));
      } else {
        const result = await addOwnedAssetAction(businessId, input, valueToday);
        if (!result.success) {
          toast.error(t(result.message ?? "Failed to add the asset"));
          return;
        }
        if (result.data?.valueSaved === false) toast.warning(t("The asset was added, but its value today wasn't saved. Record it from Update value."));
        else toast.success(t("Asset added"));
      }
      onClose();
      router.refresh();
    });
  }

  const optional = <span className="font-normal text-ink-muted">({t("optional")})</span>;

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={580}
      title={title ?? t("Add asset")}
      sub={tabs ? undefined : t("Add something you own to your asset list.")}
      busy={isPending}
      onSubmit={submit}
      bodyClassName="gap-4 py-4.5"
      footerClassName="bg-surface"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending} className="h-11 rounded-full px-4.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={!valid || isPending} className="h-11 rounded-full px-5">
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {t(buying ? "Save purchase" : adding ? "Save asset" : "Add asset")}
          </Button>
        </>
      }
    >
      {tabs}
      <fieldset className="flex flex-col gap-2">
        <legend className={cn(LABEL, "mb-2")}>{t("How did you get it?")}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-[12px] bg-surface-sunken p-1">
          {(
            [
              { value: "buy", label: "I bought it now", sub: "Money paid from an account" },
              { value: "own", label: "I already own it", sub: "No account, no money moves" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => setMode(option.value)}
              className={cn("flex min-h-12 flex-col items-center justify-center gap-px rounded-[9px] px-3 py-1.5 text-center", mode === option.value ? "bg-surface shadow-[0_1px_2px_rgba(18,32,29,0.10)] dark:bg-surface-raised" : "hover:bg-surface/50")}
            >
              <span className={cn("text-[14px] font-semibold", mode === option.value ? "text-ink" : "text-ink-soft")}>{t(option.label)}</span>
              <span className="text-[12px] text-ink-muted">{t(option.sub)}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="asset-name" className={LABEL}>
          {t("Asset name")}
        </label>
        <Input id="asset-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={60} autoComplete="off" placeholder={t("e.g. Gold ring, 22K")} frameClassName="rounded-[10px]" />
      </div>

      {adding ? (
        <TypeChoice categories={categories} value={category} onChange={setCategory} onClose={onClose} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="asset-category" className={LABEL}>
            {t("Category")}
          </label>
          <NativeSelect id="asset-category" value={category} onChange={(event) => setCategory(event.target.value)} frameClassName="h-11 rounded-[10px]" className={cn("text-[14px]", !category && "text-ink-faint")} aria-describedby="asset-category-hint">
            <option value="" disabled>
              {t("Select a category")}
            </option>
            {offered.map((option) => (
              <option key={option.id} value={option.name}>
                {t(option.name)}
              </option>
            ))}
          </NativeSelect>
          <span id="asset-category-hint" className="text-[12px] text-ink-muted">
            {t("Only active categories from the Category page.")}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="asset-date" className={LABEL}>
            {t(buying ? "Purchase date" : "Date you got it")}
          </label>
          <DayInput id="asset-date" size="md" value={date} onChange={setDate} max={lastDay} />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="asset-price" className={LABEL}>
            {t(buying ? "Price" : "Value")}
          </label>
          <AmountInput id="asset-price" size="sm" value={price} onChange={setPrice} currency={currency} />
        </div>
      </div>

      {buying ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="asset-wallet" className={LABEL}>
            {t("Paid from")}
          </label>
          <NativeSelect id="asset-wallet" value={wallet?.id ?? ""} onChange={(event) => setPickedWalletId(event.target.value)} disabled={loading || all.length === 0} frameClassName="h-11 rounded-[10px]" className="text-[14px]" aria-describedby="asset-wallet-hint">
            {!wallet && <option value="">{t(loading ? "Loading..." : "Select an account")}</option>}
            {wallets.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {walletLabel(candidate)}
              </option>
            ))}
            {savingsWallets.length > 0 && (
              <optgroup label={t("Savings")}>
                {savingsWallets.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {walletLabel(candidate)}
                  </option>
                ))}
              </optgroup>
            )}
          </NativeSelect>
          {walletsError ? (
            <p role="alert" className="text-[12.5px] text-expense">
              {t(walletsError)}
            </p>
          ) : !loading && short && wallet ? (
            <p id="asset-wallet-hint" role="alert" className="flex items-center gap-2 text-[12.5px] text-expense">
              <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
              {all.some(covers) ? t("Not enough in {wallet}. Pick another wallet.", { wallet: accountDisplayName(wallet, lang) }) : t("None of your wallets has that much.")}
            </p>
          ) : (
            wallet && (
              <span id="asset-wallet-hint" className="text-[12px] text-ink-muted tabular-nums">
                {value > 0
                  ? t("Left after this: {amount}", { amount: formatCurrency(Number(wallet.currentBalance) - value, currency, fmt) })
                  : t("Balance now: {amount}", { amount: formatCurrency(wallet.currentBalance, currency, fmt) })}
              </span>
            )
          )}
          {!loading && !walletsError && all.length === 0 && <p className="text-[12.5px] text-ink-muted">{t("Add an account in Balance first, or pick I already own it.")}</p>}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="asset-worth" className={LABEL}>
              {t("Value today")} {optional}
            </label>
            <AmountInput id="asset-worth" size="sm" value={worth ?? price} onChange={setWorth} currency={currency} describedBy="asset-worth-hint" />
            <span id="asset-worth-hint" className="text-[12px] text-ink-muted">
              {t("Change it if it's worth more or less now.")}
            </span>
          </div>
          {!adding && (
            <div className="flex items-start gap-2.5 rounded-[12px] border border-line bg-strip px-3.5 py-3 text-[13px] leading-normal text-ink-soft">
              <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              {t("No account is used and no money moves. It goes straight to All Assets with this value, so it does not show in this list.")}
            </div>
          )}
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="asset-note" className={LABEL}>
          {t("Note")} {optional}
        </label>
        <Textarea id="asset-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={NOTE_MAX} rows={3} placeholder={t(adding ? "e.g. Where it is, papers or any notes" : "e.g. Where you bought it, receipt no.")} className="rounded-[10px]" />
        <span aria-hidden="true" className="self-end text-[12px] text-ink-muted tabular-nums">{`${formatCount(note.length, fmt)}/${formatCount(NOTE_MAX, fmt)}`}</span>
      </div>
    </PopupDialog>
  );
}
