"use client";

import { ArrowDownLeft, ArrowUpRight, Package, Plus } from "lucide-react";
import Link from "next/link";
import { createElement, useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { assetGain, assetsSummary, categoryVisual, gainChip } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetDrawer } from "./AssetDrawer";
import { SellAssetDrawer } from "./SellAssetDrawer";

interface BuySellPageClientProps {
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
}

const GRID = "md:grid-cols-[minmax(0,1fr)_130px_130px_92px]";

// Buy & sell: the two moves that touch a wallet -- buying something (the
// price leaves a wallet) and selling something owned (the price lands in
// one) -- with the last sale beside them.
export function BuySellPageClient({ businessId, assets, categories, currency, canManage }: BuySellPageClientProps) {
  const { t } = useLocale();
  const [buyOpen, setBuyOpen] = useState(false);
  const [selling, setSelling] = useState<Asset | null>(null);
  const summary = assetsSummary(assets);
  const lastSold = summary.sold[0];
  const lastGain = lastSold ? assetGain(lastSold) : null;
  const lastChip = lastGain ? gainChip(lastGain.percent) : null;

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Assets")}`}
        title={t("Buy & sell")}
        description={t("Buying takes money out of a wallet. Selling puts the sale price into one.")}
        actions={
          canManage && (
            <Button onClick={() => setBuyOpen(true)}>
              <Plus strokeWidth={2.5} className="size-4" />
              {t("Buy asset")}
            </Button>
          )
        }
      />

      <div className="grid items-start gap-6 md:grid-cols-3">
        <Card padding="none" className="overflow-hidden md:col-span-2">
          <div className="flex items-center justify-between px-6 py-5">
            <h2 className="text-title text-ink">{t("Sell an asset")}</h2>
            <span className="text-small text-ink-muted">
              {summary.owned.length} {t("you own")}
            </span>
          </div>
          {summary.owned.length === 0 ? (
            <EmptyState bordered={false} icon={<Package />} title={t("Nothing to sell yet")} description={t("Buy or add an asset first, and it shows up here.")} action={canManage && <Button onClick={() => setBuyOpen(true)}>{t("Buy asset")}</Button>} className="border-t border-line" />
          ) : (
            <>
              <div className={cn("hidden items-center gap-x-4 border-y border-line bg-cream px-6 py-3 text-caption text-ink-muted md:grid", GRID)}>
                <span>{t("Asset")}</span>
                <span className="text-right">{t("Paid")}</span>
                <span className="text-right">{t("Value today")}</span>
                <span />
              </div>
              {summary.owned.map((asset) => {
                const visual = categoryVisual(categories, asset.category);
                return (
                  <div key={asset.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-surface-sunken px-4 py-3 text-body md:h-15 md:px-6 md:py-0", GRID)}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.5", visual.tone.bg, visual.tone.fg)}>{createElement(visual.icon, { "aria-hidden": true })}</span>
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className="truncate font-medium text-ink">{asset.name}</span>
                        <span className="text-caption font-normal text-ink-muted">
                          {asset.category} · {t("bought")} {formatDate(asset.purchaseDate, "MMM yyyy")}
                        </span>
                      </span>
                    </span>
                    <span className="hidden text-right text-ink-2 tabular-nums md:block">{formatCurrency(asset.purchasePrice, currency)}</span>
                    <span className="text-right font-semibold text-ink tabular-nums">{formatCurrency(asset.currentValue, currency)}</span>
                    <span className="col-span-2 flex justify-end md:col-span-1">
                      {canManage && (
                        <Button variant="secondary" size="sm" onClick={() => setSelling(asset)} aria-label={`${t("Sell")} ${asset.name}`} className="h-8 px-4 text-small">
                          {t("Sell")}
                        </Button>
                      )}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          {lastSold && lastGain && lastChip && (
            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-title text-ink">{t("Recently sold")}</h2>
                <Link href="/assets-management/dashboard?status=sold" className="text-small font-semibold text-emerald hover:text-emerald-hover">
                  {t("All sold")}
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">{createElement(categoryVisual(categories, lastSold.category).icon, { className: "size-4.5", "aria-hidden": true })}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-body font-medium text-ink">{lastSold.name}</span>
                  <span className="text-caption font-normal text-ink-muted">
                    {t("Sold")} {lastSold.soldAt ? formatDate(lastSold.soldAt) : ""}
                  </span>
                </span>
                <span className="text-body font-semibold text-ink tabular-nums">{formatCurrency(lastSold.soldPrice ?? 0, currency)}</span>
              </div>
              <div className={cn("flex items-center justify-between rounded-md p-3 text-caption", lastChip.tone === "income" ? "bg-mint-50 text-income" : lastChip.tone === "expense" ? "bg-expense-soft text-expense" : "bg-cream text-ink-2")}>
                <span className="font-normal">
                  {t("Paid")} {formatCurrency(lastSold.purchasePrice, currency)} {t("in")} {formatDate(lastSold.purchaseDate, "MMM yyyy")}
                </span>
                <span className="font-semibold tabular-nums">
                  {lastGain.amount >= 0 ? "+" : "−"} {formatCurrency(Math.abs(lastGain.amount), currency)} ({lastChip.label})
                </span>
              </div>
            </Card>
          )}

          <Card className="flex flex-col gap-4">
            <h2 className="text-title text-ink">{t("Where the money goes")}</h2>
            <Explainer icon={<ArrowUpRight />} tone="bg-expense-soft text-expense" title={t("Buy")} text={t("The price leaves the wallet you pick, and the asset joins your list.")} />
            <Explainer icon={<ArrowDownLeft />} tone="bg-mint-50 text-emerald" title={t("Sell")} text={t("The full sale price is recorded as income in the wallet you pick.")} />
            <Explainer icon={<Package />} tone="bg-surface-sunken text-ink-2" title={t("Already own it?")} text={t("Add it from My assets. No money moves.")} />
          </Card>
        </div>
      </div>

      <AssetDrawer open={buyOpen} onClose={() => setBuyOpen(false)} businessId={businessId} categories={categories} totalValue={summary.totalValue} currency={currency} />
      <SellAssetDrawer open={selling !== null} onClose={() => setSelling(null)} businessId={businessId} asset={selling} categories={categories} currency={currency} />
    </PageFrame>
  );
}

function Explainer({ icon, tone, title, text }: { icon: React.ReactNode; tone: string; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", tone)}>{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className="text-body font-semibold text-ink">{title}</span>
        <span className="text-small leading-relaxed text-ink-muted">{text}</span>
      </span>
    </div>
  );
}
