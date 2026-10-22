"use client";

import { Info, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
}

// Sell an asset: the sale price against what was paid and today's value,
// the wallet it lands in, and the note that the whole price counts as
// income and the asset moves to Sold.
export function SellAssetDrawer({ open, onClose, businessId, asset, categories, currency }: SellAssetDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [price, setPrice] = useState("");
  // A wallet picked by hand; until then the first one.
  const [pickedWalletId, setPickedWalletId] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const { wallets, savingsWallets, loading, error: walletsError } = useDrawerWallets(open, businessId);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open && asset ? asset.id : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open && asset) {
      setPrice(String(Number(asset.currentValue)));
      setDate(getAppToday());
      setNote("");
    }
  }

  if (!asset) return null;
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
    return { amount, text: `${sign} ${formatCurrency(Math.abs(amount), currency, locale)} · ${toLocaleDigits(`${sign}${Math.abs(percent).toFixed(1)}%`, locale)}`.trim(), tone: amount > 0 ? "income" : amount < 0 ? "expense" : "neutral" };
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
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-drawer data-[side=right]:sm:max-w-115" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}
      >
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{t("Sell asset")}</SheetTitle>
          {/* The asset is named in the box below; a screen reader hears it with the title. */}
          <SheetDescription className="sr-only">
            {asset.name} · {t(asset.category)}
          </SheetDescription>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <div className="flex flex-col gap-4 rounded-lg border border-line bg-strip p-4">
              <div className="flex items-center gap-3">
                <AssetTypeTile visual={visual} size="lg" />
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="truncate text-title text-ink">{asset.name}</span>
                  <span className="text-caption font-normal text-ink-muted">
                    {t(asset.category)} · {t("Bought on {date}", { date: formatDate(asset.purchaseDate, "d MMM yyyy", locale) })}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <span className="flex flex-col gap-0.5 *:leading-[normal]">
                  <span className="text-caption font-normal text-ink-muted">{t("You paid")}</span>
                  <span className="text-title text-ink">{formatCurrency(paid, currency, locale)}</span>
                </span>
                <span className="flex flex-col gap-0.5 *:leading-[normal]">
                  <span className="text-caption font-normal text-ink-muted">{t("Value today")}</span>
                  <span className="text-title text-ink">{formatCurrency(today, currency, locale)}</span>
                </span>
              </div>
            </div>

            <Field htmlFor="sell-price" label={label(t("Sale price"))}>
              <AmountInput id="sell-price" value={price} onChange={setPrice} currency={currency} autoFocus />
              {value > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <span className={cn("flex flex-col gap-0.5 rounded-md p-3", BOX[vsPaid.tone])}>
                    <span className="text-caption font-normal">{t("vs what you paid")}</span>
                    <span className="text-body font-bold tabular-nums">{vsPaid.text}</span>
                  </span>
                  <span className={cn("flex flex-col gap-0.5 rounded-md p-3", BOX[vsToday.tone])}>
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
              <div className="flex gap-3 rounded-md border border-info/25 bg-info-soft px-4 py-3 text-small leading-relaxed text-info">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {fillNodes(t("The full {amount} is recorded as income in {wallet}, and {asset} moves to Sold."), {
                    amount: <b className="font-semibold">{formatCurrency(value, currency, locale)}</b>,
                    wallet: accountDisplayName(wallet, displayLanguage(locale)),
                    asset: asset.name,
                  })}
                </span>
              </div>
            )}
          </div>

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 pt-3 pb-6")}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {value > 0 ? t("Sell for {amount}", { amount: formatCurrency(value, currency, locale) }) : t("Sell asset")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
