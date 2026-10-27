"use client";

import { Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import Button from "@/components/smartly/Button";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { undoAssetSaleAction } from "@/lib/customer/assetActions";
import { assetGain, categoryVisual, gainChip, valueTimeline } from "@/lib/customer/assetDisplay";
import type { ActionResult } from "@/lib/customer/authActions";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getAppToday } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetTypeTile } from "./AssetTypeTile";
import { AssetValueHistory } from "./AssetValueHistory";
import { useDrawerWallets } from "./useDrawerWallets";

const BOX = { income: "bg-mint-50 text-income", expense: "bg-expense-soft text-expense", neutral: "bg-strip text-ink-2" } as const;

interface SoldAssetDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  asset: Asset | null;
  categories: AssetCategoryOption[];
  currency: string;
  // The owner or an accountant, who may undo the sale.
  canManage: boolean;
}

// A sold asset, to look back on: what it cost against what it sold for, the
// dates, the wallets the money left and reached, its note and its value
// history. Those who can manage assets may undo a sale recorded by mistake.
export function SoldAssetDrawer({ open, onClose, businessId, asset, categories, currency, canManage }: SoldAssetDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  // Only for the wallets' names.
  const { wallets, savingsWallets } = useDrawerWallets(open, businessId);
  // The undo question is open.
  const [undoing, setUndoing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!asset) return null;
  const all = [...wallets, ...savingsWallets];
  const walletName = (id: string | null) => {
    const wallet = id ? all.find((candidate) => candidate.id === id) : undefined;
    return wallet ? accountDisplayName(wallet, displayLanguage(locale)) : undefined;
  };
  const gain = assetGain(asset);
  const chip = gainChip(gain.percent);
  const visual = categoryVisual(categories, asset.category);
  const soldOn = asset.soldAt ? formatDate(asset.soldAt, "d MMM yyyy", locale) : null;
  // A purchase from a wallet, where the sale went, and the note; each only
  // when there is one (an asset added as already owned left no wallet).
  const details = [
    { label: t("Paid from@@wallet"), value: walletName(asset.purchaseAccountId) },
    { label: t("Received into"), value: walletName(asset.soldAccountId) },
    { label: t("Note"), value: asset.notes ?? undefined },
  ].filter((detail): detail is { label: string; value: string } => !!detail.value);
  // Names the wallet once the wallets have loaded (and while it is still one).
  const soldInto = walletName(asset.soldAccountId);
  const soldFor = formatCurrency(asset.soldPrice ?? 0, currency, locale);

  // The sale's income leaves the wallet it reached and the asset is owned
  // again. The question closes either way; on success the drawer does too.
  // A request that never reached the server (offline, a new deploy) is a
  // failure like any other.
  function undoSale() {
    if (isPending || !asset) return;
    startTransition(async () => {
      const result = await undoAssetSaleAction(businessId, asset.id).catch((): ActionResult<unknown> => ({ success: false }));
      setUndoing(false);
      if (result.success) {
        toast.success(t("Sale undone"));
        onClose();
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to undo the sale"));
      }
    });
  }

  return (
    // Nothing to fill in: the frame's form only stops a stray Enter.
    <Drawer
      open={open}
      width={460}
      icon={<AssetTypeTile visual={visual} size="lg" className="rounded-field" />}
      title={asset.name}
      description={`${t(asset.category)} · ${soldOn ? t("Sold {date}", { date: soldOn }) : t("Sold")}`}
      busy={isPending}
      onClose={onClose}
      onSubmit={(event) => event.preventDefault()}
      footer={
        <div className="flex w-full items-center gap-2.5">
          {canManage && (
            <Button type="button" variant="ghost" onClick={() => setUndoing(true)} disabled={isPending}>
              <Undo2 />
              {t("Undo sale")}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="ml-auto">
            {t("Close")}
          </Button>
        </div>
      }
    >
      <div className="-my-1 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 rounded-[14px] border border-line bg-strip p-4 tabular-nums">
          <span className="flex flex-col gap-0.5 *:leading-[normal]">
            <span className="text-caption font-normal text-ink-muted">{t("You paid")}</span>
            <span className="text-title text-ink">{formatCurrency(asset.purchasePrice, currency, locale)}</span>
            <span className="text-caption font-normal text-ink-muted">{t("Bought on {date}", { date: formatDate(asset.purchaseDate, "d MMM yyyy", locale) })}</span>
          </span>
          <span className="flex flex-col gap-0.5 *:leading-[normal]">
            <span className="text-caption font-normal text-ink-muted">{t("Sale price")}</span>
            <span className="text-title text-ink">{soldFor}</span>
            {soldOn && <span className="text-caption font-normal text-ink-muted">{t("Sold {date}", { date: soldOn })}</span>}
          </span>
        </div>

        <div className={cn("flex items-center justify-between gap-3 rounded-md p-3 text-small", BOX[chip.tone])}>
          <span className="font-medium">{gain.amount > 0 ? t("Gain on the sale") : gain.amount < 0 ? t("Loss on the sale") : t("Sold for what you paid")}</span>
          <span className="font-semibold tabular-nums">
            {formatSignedCurrency(gain.amount, currency, locale)} ({toLocaleDigits(chip.label, locale)})
          </span>
        </div>

        {details.length > 0 && (
          <dl className="flex flex-col rounded-lg border border-line">
            {details.map((detail, index) => (
              <div key={detail.label} className={cn("flex justify-between gap-3 px-4 py-3 text-small", index > 0 && "border-t border-divider")}>
                <dt className="shrink-0 text-ink-muted">{detail.label}</dt>
                <dd className="min-w-0 text-right font-medium wrap-anywhere text-ink">{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <AssetValueHistory entries={valueTimeline(asset)} currency={currency} today={getAppToday()} />
      </div>
      <ConfirmDialog
        open={undoing}
        onClose={() => setUndoing(false)}
        onConfirm={undoSale}
        isPending={isPending}
        // Not red: a sale undone can be recorded again.
        danger={false}
        icon={<Undo2 />}
        title={t("Undo the sale of {name}?", { name: asset.name })}
        description={
          soldInto
            ? t("The {amount} from the sale is taken back out of {wallet}, and the asset is owned again.", { amount: soldFor, wallet: soldInto })
            : t("The {amount} from the sale is taken back out of the wallet it went into, and the asset is owned again.", { amount: soldFor })
        }
        confirmLabel={t("Undo sale")}
      />
    </Drawer>
  );
}
