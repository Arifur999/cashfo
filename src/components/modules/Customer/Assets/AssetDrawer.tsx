"use client";

import { CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, AssetCategoryOption } from "@/lib/customer/api";
import { addOwnedAssetAction, purchaseAssetAction } from "@/lib/customer/assetActions";
import { formatCurrency } from "@/lib/customer/currency";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { TypeChoice } from "./TypeChoice";
import { useDrawerWallets } from "./useDrawerWallets";

interface AssetDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  categories: AssetCategoryOption[];
  // What the owned assets are worth today, for the "after this" line.
  totalValue: number;
  currency: string;
  // Open on "Buying it now" or "I already own it".
  initialMode?: Mode;
  // The type picked when it opens (an empty type's own "Add asset").
  initialCategory?: string;
}

type Mode = "buy" | "own";

// Add an asset: something bought now (the price leaves a wallet) or
// something already owned (nothing moves; what was paid, when, and what it
// is worth today). Name, type, price, the wallet for a purchase, the date
// and a note.
export function AssetDrawer({ open, onClose, businessId, categories, totalValue, currency, initialMode = "buy", initialCategory }: AssetDrawerProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  // What it's worth today ("I already own it"): follows the price until it
  // is typed over.
  const [worth, setWorth] = useState<string | null>(null);
  // A wallet picked by hand. Until then the drawer pays from the first
  // regular wallet that covers the price.
  const [pickedWalletId, setPickedWalletId] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const { wallets, savingsWallets, loading, error: walletsError } = useDrawerWallets(open, businessId);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMode(initialMode);
      setName("");
      setCategory(categories.some((option) => option.name === initialCategory) ? (initialCategory ?? "") : (categories.find((option) => option.name === "Other")?.name ?? categories[0]?.name ?? ""));
      setPrice("");
      setWorth(null);
      setDate(getAppToday());
      setNote("");
    }
  }

  const value = Number(price) || 0;
  const buying = mode === "buy";
  const all = [...wallets, ...savingsWallets];
  const covers = (candidate: Account) => Number(candidate.currentBalance) >= value;
  // The hand-picked wallet while this workspace still has it (a switch or a
  // deleted wallet drops it), else the first regular wallet that covers the
  // price. Money set aside in savings is spent only when picked by hand (or
  // when there is no regular wallet at all); a short regular wallet says so
  // below instead.
  const wallet = all.find((candidate) => candidate.id === pickedWalletId) ?? wallets.find(covers) ?? wallets[0] ?? savingsWallets.find(covers) ?? savingsWallets[0];
  // As the picker names it, in the language on screen.
  const walletName = wallet ? accountDisplayName(wallet, displayLanguage(locale)) : "";
  const short = buying && wallet !== undefined && value > 0 && !covers(wallet);
  // An emptied "Value today" means the price again.
  const worthValue = worth === null || worth.trim() === "" ? value : Number(worth) || 0;
  const lastDay = getAppToday();
  // A typed date can still fall outside the picker's range.
  const valid = name.trim().length > 0 && category.length > 0 && value > 0 && date <= lastDay && (buying ? wallet !== undefined && !short : worthValue > 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || (buying && !wallet)) return;
    const input = { name: name.trim(), category, purchaseDate: date, purchasePrice: value, notes: note.trim() || undefined };
    // Bought today at what it is worth: the purchase says it all.
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

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  return (
    <Drawer
      open={open}
      width={460}
      title={t("Add an asset")}
      description={t("Something you're buying now, or something you already own.")}
      busy={isPending}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={!valid || isPending} className="px-4.5">
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {buying ? (value > 0 ? t("Buy for {amount}", { amount: formatCurrency(value, currency, fmt) }) : t("Buy asset")) : t("Add asset")}
          </Button>
        </>
      }
    >
      {/* The board's tighter 16px rhythm for this longer form. */}
      <div className="-my-1 flex flex-col gap-4">
        <SegmentedControl
          options={[
            { value: "buy", label: t("Buying it now") },
            { value: "own", label: t("I already own it") },
          ]}
          value={mode}
          onChange={setMode}
          label={t("How did you get it")}
          size="lg"
          stretch
        />

        <Field htmlFor="asset-name" label={label(t("Asset name"))}>
          <Input id="asset-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={120} placeholder={t("Gold ring, 22K")} />
        </Field>

        <TypeChoice categories={categories} value={category} onChange={setCategory} onClose={onClose} />

        <Field htmlFor="asset-price" label={label(buying ? t("Price") : t("What you paid"))}>
          <AmountInput id="asset-price" value={price} onChange={setPrice} currency={currency} />
        </Field>

        {!buying && (
          <Field htmlFor="asset-worth" label={label(t("Value today"), true)} hint={t("Change it if it's worth more or less now.")}>
            <AmountInput id="asset-worth" value={worth ?? price} onChange={setWorth} currency={currency} describedBy="asset-worth-hint" />
          </Field>
        )}

        {buying && (
          <div className="flex flex-col gap-2">
            <WalletPicker
              label={t("Pay from")}
              balanceLabel="Available@@balance"
              tone="sand"
              wallets={wallets}
              savingsWallets={savingsWallets}
              value={wallet?.id ?? ""}
              onChange={setPickedWalletId}
              after={null}
              minBalance={value}
              currency={currency}
              loading={loading}
              error={walletsError}
              onClose={onClose}
            />
            {!loading && short && wallet && (
              <p role="alert" className="flex items-center gap-2 text-caption text-expense">
                <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                {all.some(covers) ? t("Not enough in {wallet}. Pick another wallet.", { wallet: walletName }) : t("None of your wallets has that much.")}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
          <Field htmlFor="asset-date" label={label(buying ? t("Date") : t("Bought on"))}>
            <DayInput id="asset-date" size="md" value={date} onChange={setDate} max={lastDay} />
          </Field>
          <Field htmlFor="asset-note" label={label(t("Note"), true)}>
            <Input id="asset-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("e.g. 4 ana, from Baitul Mukarram")} className="px-0" frameClassName="px-3" />
          </Field>
        </div>

        {value > 0 && (
          <div className="flex flex-col gap-2 rounded-md border border-line bg-strip p-4 text-small tabular-nums">
            {buying && wallet && (
              <div className="flex justify-between gap-3">
                <span className="truncate text-ink-2">{walletName}</span>
                <span>
                  <span className="text-ink-muted">{formatCurrency(wallet.currentBalance, currency, fmt)} → </span>
                  <span className={cn("font-semibold", short ? "text-expense" : "text-ink")}>{formatCurrency(Number(wallet.currentBalance) - value, currency, fmt)}</span>
                </span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-ink-2">{t("Your assets")}</span>
              <span>
                <span className="text-ink-muted">{formatCurrency(totalValue, currency, fmt)} → </span>
                <span className="font-semibold text-ink">{formatCurrency(totalValue + (buying ? value : worthValue), currency, fmt)}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
