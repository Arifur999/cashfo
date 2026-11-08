"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import Textarea from "@/components/smartly/form/Textarea";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, Asset } from "@/lib/customer/api";
import { sellAssetAction } from "@/lib/customer/assetActions";
import { lastValued } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getAppToday } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { useDrawerWallets } from "./useDrawerWallets";

const BOX = { income: "bg-income-soft/60 text-income", expense: "bg-expense-soft/60 text-expense", neutral: "bg-strip text-ink-2" } as const;
const LABEL = "text-[14px] font-medium text-ink";
const NOTE_MAX = 300;

interface SellAssetDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  // The asset being sold, or null to pick one from the choices.
  asset: Asset | null;
  currency: string;
  // With no asset given: the owned assets to pick the one to sell from.
  choices?: Asset[];
  // Above the form (Purchase & Sell's Purchase / Sale tabs).
  tabs?: React.ReactNode;
  title?: string;
}

// Sell an asset: which one, what was paid and what it is worth now, the
// sale date and price against both, the account the money lands in, and the
// note that the whole price counts as income and the asset moves to Sold.
export function SellAssetDrawer({ open, onClose, businessId, asset: given, currency, choices, tabs, title }: SellAssetDrawerProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const [price, setPrice] = useState("");
  // An account picked by hand; until then the first one.
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
      setPickedWalletId("");
      setDate(getAppToday());
      setNote("");
    }
    if (open) setPrice(asset ? String(Number(asset.currentValue)) : "");
  }

  const lang = displayLanguage(locale);
  const money = (value: number) => formatCurrency(value, currency, fmt);
  const value = Number(price) || 0;
  const all = [...wallets, ...savingsWallets];
  // The hand-picked account while this workspace still has it, else the first.
  const wallet = all.find((candidate) => candidate.id === pickedWalletId) ?? all[0];
  const walletLabel = (candidate: Account) => `${accountDisplayName(candidate, lang)} · ${formatCurrency(candidate.currentBalance, currency, fmt)}`;
  // Nothing is sold before it was bought; a typed date can still fall
  // outside the picker's range.
  const bought = asset ? asset.purchaseDate.slice(0, 10) : "";
  const lastDay = getAppToday();
  const valid = asset !== null && value > 0 && wallet !== undefined && date >= bought && date <= lastDay;

  // "− ৳ 2,50,000 · −15.2%" against a reference figure.
  const diff = (against: number): { text: string; tone: keyof typeof BOX } => {
    const amount = value - against;
    const percent = against > 0 ? (amount / against) * 100 : 0;
    const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
    return { text: `${sign} ${money(Math.abs(amount))} · ${toLocaleDigits(`${sign}${Math.abs(percent).toFixed(1)}%`, fmt)}`.trim(), tone: amount > 0 ? "income" : amount < 0 ? "expense" : "neutral" };
  };

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

  const updated = asset ? lastValued(asset) : null;

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={580}
      title={title ?? t("Sell asset")}
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
            {t("Record sale")}
          </Button>
        </>
      }
    >
      {tabs}
      {choices && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sell-asset" className={LABEL}>
            {t("Asset sold")}
          </label>
          <NativeSelect id="sell-asset" value={asset?.id ?? ""} onChange={(event) => setPickedId(event.target.value)} frameClassName="h-11 rounded-[10px]" className={cn("text-[14px]", !asset && "text-ink-faint")}>
            <option value="" disabled>
              {t("Select one of your active assets")}
            </option>
            {choices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {`${choice.name} · ${t(choice.category)}`}
              </option>
            ))}
          </NativeSelect>
          {choices.length === 0 && <span className="text-[12.5px] text-ink-muted">{t("You have no active asset to sell.")}</span>}
        </div>
      )}

      {asset && (
        <div className="grid grid-cols-2 gap-3 rounded-[12px] border border-line bg-strip px-4 py-3.5 tabular-nums">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[12px] text-ink-muted">{t("What you paid")}</span>
            <span className="text-[17px] font-bold text-ink">{money(Number(asset.purchasePrice))}</span>
            <span className="text-[12px] text-ink-muted">{t("Bought on {date}", { date: formatDate(asset.purchaseDate, "d MMM yyyy", fmt) })}</span>
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[12px] text-ink-muted">{t("Current value")}</span>
            <span className="text-[17px] font-bold text-ink">{money(Number(asset.currentValue))}</span>
            <span className="text-[12px] text-ink-muted">{updated ? t("Updated {date}", { date: formatDate(updated, "d MMM yyyy", fmt) }) : t("No updates yet")}</span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="sell-date" className={LABEL}>
            {t("Sale date")}
          </label>
          <DayInput id="sell-date" size="md" value={date} onChange={setDate} min={bought || undefined} max={lastDay} />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="sell-price" className={LABEL}>
            {t("Sale price")}
          </label>
          <AmountInput id="sell-price" size="sm" value={price} onChange={setPrice} currency={currency} />
        </div>
      </div>

      {asset && value > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "vs what you paid", ...diff(Number(asset.purchasePrice)) },
            { label: "vs current value", ...diff(Number(asset.currentValue)) },
          ].map((box) => (
            <span key={box.label} className={cn("flex flex-col gap-0.5 rounded-[10px] px-3 py-2.5", BOX[box.tone])}>
              <span className="text-[12px]">{t(box.label)}</span>
              <span className="text-[13.5px] font-bold tabular-nums">{box.text}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sell-wallet" className={LABEL}>
          {t("Paid into")}
        </label>
        <NativeSelect id="sell-wallet" value={wallet?.id ?? ""} onChange={(event) => setPickedWalletId(event.target.value)} disabled={loading || all.length === 0} frameClassName="h-11 rounded-[10px]" className="text-[14px]">
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
        {walletsError && (
          <p role="alert" className="text-[12.5px] text-expense">
            {t(walletsError)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sell-note" className={LABEL}>
          {t("Note")} <span className="font-normal text-ink-muted">({t("optional")})</span>
        </label>
        <Textarea id="sell-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={NOTE_MAX} rows={3} placeholder={t("e.g. Sold to a colleague, papers handed over")} className="rounded-[10px]" />
        <span aria-hidden="true" className="self-end text-[12px] text-ink-muted tabular-nums">{`${formatCount(note.length, fmt)}/${formatCount(NOTE_MAX, fmt)}`}</span>
      </div>

      {asset && value > 0 && wallet && (
        <div className="flex gap-3 rounded-[12px] border border-info-line bg-info-50 px-4 py-3 text-[13px] leading-relaxed text-info-ink">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {fillNodes(t("The full {amount} is recorded as income in {wallet}, and {asset} moves to Sold."), {
              amount: <b className="font-semibold">{money(value)}</b>,
              wallet: accountDisplayName(wallet, lang),
              asset: asset.name,
            })}
          </span>
        </div>
      )}
    </PopupDialog>
  );
}
