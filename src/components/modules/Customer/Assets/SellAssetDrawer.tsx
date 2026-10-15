"use client";

import { CalendarDays, Info, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Account, Asset, AssetCategoryOption } from "@/lib/customer/api";
import { sellAssetAction } from "@/lib/customer/assetActions";
import { categoryVisual } from "@/lib/customer/assetDisplay";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { getActiveSavingsWalletsAction } from "@/lib/customer/savingsGoalActions";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const BOX = { income: "bg-mint-50 text-income", expense: "bg-expense-soft text-expense", neutral: "bg-cream text-ink-2" } as const;

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
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [price, setPrice] = useState("");
  const [walletId, setWalletId] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const [wallets, setWallets] = useState<Account[]>([]);
  const [savingsWallets, setSavingsWallets] = useState<Account[]>([]);
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open && asset ? asset.id : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open && asset) {
      setPrice(String(Number(asset.currentValue)));
      setDate(getAppToday());
      setNote("");
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([listMoneyAccountsAction(businessId), getActiveSavingsWalletsAction(businessId)]).then(([money, savings]) => {
      const list = money.data ?? [];
      setWallets(list);
      setSavingsWallets(savings);
      setWalletsError(money.success ? null : (money.message ?? "Failed to load your wallets"));
      setWalletId((current) => current || list[0]?.id || savings[0]?.id || "");
      setLoading(false);
    });
  }, [open, businessId]);

  if (!asset) return null;
  const value = Number(price) || 0;
  const paid = Number(asset.purchasePrice);
  const today = Number(asset.currentValue);
  const wallet = [...wallets, ...savingsWallets].find((w) => w.id === walletId);
  const visual = categoryVisual(categories, asset.category);
  const valid = value > 0 && walletId.length > 0;

  // "− ৳ 2,50,000 · −15.2%" against a reference figure.
  const diff = (against: number): { amount: number; text: string; tone: keyof typeof BOX } => {
    const amount = value - against;
    const percent = against > 0 ? (amount / against) * 100 : 0;
    const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
    return { amount, text: `${sign} ${formatCurrency(Math.abs(amount), currency)} · ${sign}${Math.abs(percent).toFixed(1)}%`.trim(), tone: amount > 0 ? "income" : amount < 0 ? "expense" : "neutral" };
  };
  const vsPaid = diff(paid);
  const vsToday = diff(today);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || !asset) return;
    startTransition(async () => {
      const result = await sellAssetAction(businessId, asset.id, { soldPrice: value, soldAccountId: walletId, date, notes: note.trim() || undefined });
      if (result.success) {
        toast.success(t("Sold and recorded as income"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to record the sale"));
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
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-115" : "h-[92vh] rounded-t-xl")}
      >
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{t("Sell asset")}</SheetTitle>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <div className="flex flex-col gap-4 rounded-lg border border-line bg-cream p-4">
              <div className="flex items-center gap-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.5", visual.tone.bg, visual.tone.fg)}>{createElement(visual.icon, { "aria-hidden": true })}</span>
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="truncate text-title text-ink">{asset.name}</span>
                  <span className="text-caption font-normal text-ink-muted">
                    {asset.category} · {t("bought")} {formatDate(asset.purchaseDate)}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <span className="flex flex-col gap-0.5">
                  <span className="text-caption font-normal text-ink-muted">{t("You paid")}</span>
                  <span className="text-title text-ink">{formatCurrency(paid, currency)}</span>
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-caption font-normal text-ink-muted">{t("Value today")}</span>
                  <span className="text-title text-ink">{formatCurrency(today, currency)}</span>
                </span>
              </div>
            </div>

            <Field htmlFor="sell-price" label={label(t("Sale price"))}>
              <Input
                id="sell-price"
                type="text"
                inputMode="decimal"
                size="xl"
                value={price}
                onChange={(event) => setPrice(normalizeMoneyInput(event.target.value))}
                placeholder="0"
                autoFocus
                leading={<span className="flex h-14 w-13 items-center justify-center border-r border-line bg-cream text-h2 font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                frameClassName="h-14 gap-0 overflow-hidden pl-0"
                className="pl-4 text-h2 tabular-nums"
              />
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

            <WalletPicker label={t("Receive into")} wallets={wallets} savingsWallets={savingsWallets} value={walletId} onChange={setWalletId} after={wallet && value > 0 ? Number(wallet.currentBalance) + value : null} currency={currency} loading={loading} error={walletsError} onClose={onClose} />

            <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
              <Field htmlFor="sell-date" label={label(t("Date"))}>
                <Input id="sell-date" type="date" size="md" value={date} onChange={(event) => setDate(event.target.value)} max={getAppToday()} leading={<CalendarDays />} className="px-0" frameClassName="px-3" />
              </Field>
              <Field htmlFor="sell-note" label={label(t("Note"), true)}>
                <Input id="sell-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("Sold to a colleague")} className="px-0" frameClassName="px-3" />
              </Field>
            </div>

            {value > 0 && wallet && (
              <div className="flex gap-3 rounded-md border border-info/25 bg-info-soft px-4 py-3 text-small leading-relaxed text-info">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {t("The full")} <b className="font-semibold">{formatCurrency(value, currency)}</b> {t("is recorded as income in")} {wallet.name}, {t("and")} {asset.name} {t("moves to Sold.")}
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
              {t("Sell for")} {formatCurrency(value, currency)}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
