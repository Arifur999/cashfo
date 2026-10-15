"use client";

import { CalendarDays, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Account, AssetCategoryOption } from "@/lib/customer/api";
import { purchaseAssetAction } from "@/lib/customer/assetActions";
import { categoryVisual } from "@/lib/customer/assetDisplay";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { getActiveSavingsWalletsAction } from "@/lib/customer/savingsGoalActions";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

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
}

type Mode = "buy" | "own";

// Add an asset: something bought now (the price leaves a wallet) or
// something already owned (nothing moves). Name, category, price, the
// wallet for a purchase, the date and a note.
export function AssetDrawer({ open, onClose, businessId, categories, totalValue, currency, initialMode = "buy" }: AssetDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [walletId, setWalletId] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const [wallets, setWallets] = useState<Account[]>([]);
  const [savingsWallets, setSavingsWallets] = useState<Account[]>([]);
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMode(initialMode);
      setName("");
      setCategory(categories.find((option) => option.name === "Other")?.name ?? categories[0]?.name ?? "");
      setPrice("");
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

  const value = Number(price) || 0;
  const buying = mode === "buy";
  const wallet = [...wallets, ...savingsWallets].find((w) => w.id === walletId);
  const valid = name.trim().length > 0 && category.length > 0 && value > 0 && (!buying || walletId.length > 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const result = await purchaseAssetAction(businessId, { name: name.trim(), category, purchaseDate: date, purchasePrice: value, purchaseAccountId: buying ? walletId : undefined, notes: note.trim() || undefined });
      if (result.success) {
        toast.success(buying ? t("Asset bought") : t("Asset added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to add the asset"));
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
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-h3 text-ink">{t("Add an asset")}</SheetTitle>
            <p className="text-small text-ink-muted">{t("Something you're buying now, or something you already own.")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
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

            <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
              <legend className="mb-2 text-body font-medium text-ink">{t("Category")}</legend>
              {categories.length === 0 ? (
                <p className="text-caption text-ink-muted">{t("No category yet -- add one under Categories first.")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((option) => {
                    const on = option.name === category;
                    const visual = categoryVisual(categories, option.name);
                    return (
                      <button key={option.id} type="button" aria-pressed={on} onClick={() => setCategory(option.name)} className={cn("flex h-8.5 items-center gap-2 rounded-full border py-0 pr-3 pl-2 text-small transition-colors", on ? "border-[1.5px] border-emerald bg-mint-50 font-semibold text-emerald" : "border-line bg-surface font-medium text-ink-2 hover:border-line-strong")}>
                        <span className={cn("flex size-5.5 items-center justify-center rounded-full [&_svg]:size-3", visual.tone.bg, visual.tone.fg)}>{createElement(visual.icon, { "aria-hidden": true })}</span>
                        {option.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>

            <Field htmlFor="asset-price" label={label(buying ? t("Price") : t("Value today"))}>
              <Input
                id="asset-price"
                type="text"
                inputMode="decimal"
                size="xl"
                value={price}
                onChange={(event) => setPrice(normalizeMoneyInput(event.target.value))}
                placeholder="0"
                leading={<span className="flex h-13 w-12 items-center justify-center border-r border-line bg-cream text-h3 font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                frameClassName="gap-0 overflow-hidden pl-0"
                className="pl-4 text-h2 tabular-nums"
              />
            </Field>

            {buying && <WalletPicker label={t("Pay from")} wallets={wallets} savingsWallets={savingsWallets} value={walletId} onChange={setWalletId} after={wallet && value > 0 ? Number(wallet.currentBalance) - value : null} minBalance={value} currency={currency} loading={loading} error={walletsError} onClose={onClose} />}

            <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
              <Field htmlFor="asset-date" label={label(buying ? t("Date") : t("Bought on"))}>
                <Input id="asset-date" type="date" size="md" value={date} onChange={(event) => setDate(event.target.value)} max={getAppToday()} leading={<CalendarDays />} className="px-0" frameClassName="px-3" />
              </Field>
              <Field htmlFor="asset-note" label={label(t("Note"), true)}>
                <Input id="asset-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("e.g. 4 ana, from Baitul Mukarram")} className="px-0" frameClassName="px-3" />
              </Field>
            </div>

            {value > 0 && (
              <div className="flex flex-col gap-2 rounded-md border border-line bg-cream p-4 text-small tabular-nums">
                {buying && wallet && (
                  <div className="flex justify-between gap-3">
                    <span className="truncate text-ink-2">{wallet.name}</span>
                    <span>
                      <span className="text-ink-muted">{formatCurrency(wallet.currentBalance, currency)} → </span>
                      <span className={cn("font-semibold", Number(wallet.currentBalance) < value ? "text-warning" : "text-ink")}>{formatCurrency(Number(wallet.currentBalance) - value, currency)}</span>
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-ink-2">{t("Your assets")}</span>
                  <span>
                    <span className="text-ink-muted">{formatCurrency(totalValue, currency)} → </span>
                    <span className="font-semibold text-ink">{formatCurrency(totalValue + value, currency)}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 pt-3 pb-6")}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {buying ? (value > 0 ? `${t("Buy for")} ${formatCurrency(value, currency)}` : t("Buy asset")) : t("Add asset")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
