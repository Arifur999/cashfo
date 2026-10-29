"use client";

import { Info } from "lucide-react";
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
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { sellAssetAction } from "@/lib/customer/assetActions";
import { categoryVisual } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getAppToday } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetTypeTile } from "./AssetTypeTile";
import { useDrawerWallets } from "./useDrawerWallets";

const BOX = { income: "bg-mint-50 text-income", expense: "bg-expense-soft text-expense", neutral: "bg-strip text-ink-2" } as const;

interface SellAssetDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  asset: Asset | null;
  categories: AssetCategoryOption[];
  currency: string;
  // With no asset given: the owned assets to pick the one to sell from.
  choices?: Asset[];
  // Above the form (Purchase & Sell's Purchase / Sale tabs).
  tabs?: React.ReactNode;
  title?: string;
}

// Sell an asset: the sale price against what was paid and today's value,
// the wallet it lands in, and the note that the whole price counts as
// income and the asset moves to Sold.
export function SellAssetDrawer({ open, onClose, businessId, asset: given, categories, currency, choices, tabs, title }: SellAssetDrawerProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const [price, setPrice] = useState("");
  // A wallet picked by hand; until then the first one.
  const [pickedWalletId, setPickedWalletId] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const { wallets, savingsWallets, loading, error: walletsError } = useDrawerWallets(open, businessId);
  const [isPending, startTransition] = useTransition();

  // The asset picked from the choices.
  const [pickedId, setPickedId] = useState("");
  const asset = given ?? choices?.find((choice) => choice.id === pickedId) ?? null;

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (asset?.id ?? "none") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open && prevKey === "closed") {
      setPickedId("");
      setDate(getAppToday());
      setNote("");
    }
    if (open) setPrice(asset ? String(Number(asset.currentValue)) : "");
  }

  if (!asset && !choices) return null;
  // The Sale tab before an asset is picked: the tabs and the picker.
  const picker = choices && (
    <Field htmlFor="sell-asset" label={<span className="text-body font-medium text-ink">{t("Asset to sell")}</span>}>
      <NativeSelect id="sell-asset" value={asset?.id ?? ""} onChange={(event) => setPickedId(event.target.value)}>
        <option value="">{t("Select one of your active assets")}</option>
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {`${choice.name} · ${t(choice.category)}`}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
  if (!asset) {
    return (
      <Drawer
        open={open}
        popup
        width={460}
        title={title ?? t("Sell asset")}
        onClose={onClose}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button type="button" disabled className="px-4.5">
              {t("Submit sale")}
            </Button>
          </>
        }
      >
        <div className="-my-0.5 flex flex-col gap-4.5">
          {tabs}
          {picker}
          {choices?.length === 0 && <p className="text-small text-ink-muted">{t("You have no active asset to sell.")}</p>}
        </div>
      </Drawer>
    );
  }
  const value = Number(price) || 0;
  const paid = Number(asset.purchasePrice);
  const today = Number(asset.currentValue);
  const all = [...wallets, ...savingsWallets];
  // The hand-picked wallet while this workspace still has it, else the first.
  const wallet = all.find((candidate) => candidate.id === pickedWalletId) ?? all[0];
  const visual = categoryVisual(categories, asset.category);
  // Nothing is sold before it was bought; a typed date can still fall
  // outside the picker's range.
  const bought = asset.purchaseDate.slice(0, 10);
  const lastDay = getAppToday();
  const valid = value > 0 && wallet !== undefined && date >= bought && date <= lastDay;

  // "− ৳ 2,50,000 · −15.2%" against a reference figure.
  const diff = (against: number): { amount: number; text: string; tone: keyof typeof BOX } => {
    const amount = value - against;
    const percent = against > 0 ? (amount / against) * 100 : 0;
    const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
    return { amount, text: `${sign} ${formatCurrency(Math.abs(amount), currency, fmt)} · ${toLocaleDigits(`${sign}${Math.abs(percent).toFixed(1)}%`, fmt)}`.trim(), tone: amount > 0 ? "income" : amount < 0 ? "expense" : "neutral" };
  };
  const vsPaid = diff(paid);
  const vsToday = diff(today);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || !asset || !wallet) return;
    startTransition(async () => {
      const result = await sellAssetAction(businessId, asset.id, { soldPrice: value, soldAccountId: wallet.id, date, notes: note.trim() || undefined });
      if (result.success) {
        toast.success(t("Sold and recorded as income"));
        onClose();
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to record the sale"));
      }
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
      popup
      width={460}
      title={title ?? t("Sell asset")}
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
            {value > 0 ? t("Sell for {amount}", { amount: formatCurrency(value, currency, fmt) }) : t("Sell asset")}
          </Button>
        </>
      }
    >
      {/* The board's 18px rhythm. */}
      <div className="-my-0.5 flex flex-col gap-4.5">
        {tabs}
        {picker}
        <div className="flex flex-col gap-3.5 rounded-[14px] border border-line bg-strip p-4">
          <div className="flex items-center gap-3">
            <AssetTypeTile visual={visual} size="lg" />
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-[15px] leading-[normal] font-semibold text-ink">{asset.name}</span>
              <span className="text-caption font-normal text-ink-muted">
                {t(asset.category)} · {t("bought {month}", { month: formatDate(asset.purchaseDate, "d MMM yyyy", fmt) })}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 tabular-nums">
            <span className="flex flex-col gap-0.5 *:leading-[normal]">
              <span className="text-caption font-normal text-ink-muted">{t("You paid")}</span>
              <span className="text-title text-ink">{formatCurrency(paid, currency, fmt)}</span>
            </span>
            <span className="flex flex-col gap-0.5 *:leading-[normal]">
              <span className="text-caption font-normal text-ink-muted">{t("Value today")}</span>
              <span className="text-title text-ink">{formatCurrency(today, currency, fmt)}</span>
            </span>
          </div>
        </div>

        <Field htmlFor="sell-price" label={label(t("Sale price"))}>
          <AmountInput id="sell-price" value={price} onChange={setPrice} currency={currency} autoFocus />
          {value > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <span className={cn("flex flex-col gap-0.5 rounded-sm px-3 py-2.5", BOX[vsPaid.tone])}>
                <span className="text-caption font-normal">{t("vs what you paid")}</span>
                <span className="text-body font-bold tabular-nums">{vsPaid.text}</span>
              </span>
              <span className={cn("flex flex-col gap-0.5 rounded-sm px-3 py-2.5", BOX[vsToday.tone])}>
                <span className="text-caption font-normal">{t("vs value today")}</span>
                <span className="text-body font-bold tabular-nums">{vsToday.text}</span>
              </span>
            </div>
          )}
        </Field>

        <WalletPicker label={t("Receive into")} wallets={wallets} savingsWallets={savingsWallets} value={wallet?.id ?? ""} onChange={setPickedWalletId} after={wallet && value > 0 ? Number(wallet.currentBalance) + value : null} currency={currency} loading={loading} error={walletsError} onClose={onClose} />

        <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
          <Field htmlFor="sell-date" label={label(t("Date"))}>
            <DayInput id="sell-date" size="md" value={date} onChange={setDate} min={bought} max={lastDay} />
          </Field>
          <Field htmlFor="sell-note" label={label(t("Note"), true)}>
            <Input id="sell-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("Sold to a colleague")} className="px-0" frameClassName="px-3" />
          </Field>
        </div>

        {value > 0 && wallet && (
          <div className="flex gap-3 rounded-md border border-info-line bg-info-50 px-4 py-3 text-small leading-relaxed text-info-ink">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {fillNodes(t("The full {amount} is recorded as income in {wallet}, and {asset} moves to Sold."), {
                amount: <b className="font-semibold">{formatCurrency(value, currency, fmt)}</b>,
                wallet: accountDisplayName(wallet, displayLanguage(locale)),
                asset: asset.name,
              })}
            </span>
          </div>
        )}
      </div>
    </Drawer>
  );
}
