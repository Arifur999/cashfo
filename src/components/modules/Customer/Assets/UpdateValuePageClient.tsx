"use client";

import { Package, Pencil, TriangleAlert } from "lucide-react";
import { createElement, useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { assetGain, categoryVisual, gainChip, isStale, lastValued, updateCount } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { UpdateValueDrawer } from "./UpdateValueDrawer";

interface UpdateValuePageClientProps {
  businessId: string;
  // Owned assets only.
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
  today: string;
}

const GRID = "md:grid-cols-[minmax(0,1fr)_130px_140px_170px_100px_132px]";

// Update value: every owned asset with when it was last checked, so the
// ones that have gone unvalued for months stand out.
export function UpdateValuePageClient({ businessId, assets, categories, currency, canManage, today }: UpdateValuePageClientProps) {
  const { t } = useLocale();
  const [onlyStale, setOnlyStale] = useState(false);
  const [valuing, setValuing] = useState<Asset | null>(null);
  const stale = assets.filter((asset) => isStale(asset, today));
  const shown = onlyStale ? stale : assets;

  return (
    <PageFrame className="gap-5">
      <PageHeader eyebrow={`${t("Money")} · ${t("Assets")}`} title={t("Update value")} description={t("When the market price of something you own goes up or down, record the new value here.")} />

      {stale.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4 md:flex-row md:items-center">
          <span className="flex size-8 shrink-0 items-center justify-center text-warning">
            <TriangleAlert className="size-4.5" aria-hidden="true" />
          </span>
          <span className="flex-1 text-body text-warning">
            <b className="font-semibold">
              {stale.length} {t(stale.length === 1 ? "asset hasn't been checked in over 6 months." : "assets haven't been checked in over 6 months.")}
            </b>{" "}
            {t(stale.length === 1 ? "Its value may be out of date." : "Their values may be out of date.")}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setOnlyStale((on) => !on)} className="h-8.5 border-warning/50 px-3 text-small text-warning hover:bg-warning-soft">
            {onlyStale ? t("Show all") : t(stale.length === 1 ? "Show it" : "Show them")}
          </Button>
        </div>
      )}

      {assets.length === 0 ? (
        <EmptyState icon={<Package />} title={t("Nothing owned yet")} description={t("Add what you own first, then keep its value up to date here.")} className="min-h-80" />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className={cn("hidden items-center gap-x-4 border-b border-line bg-cream px-6 py-3 text-caption text-ink-muted md:grid", GRID)}>
            <span>{t("Asset")}</span>
            <span className="text-right">{t("Paid")}</span>
            <span className="text-right">{t("Value today")}</span>
            <span>{t("Last updated")}</span>
            <span className="text-right">{t("vs paid")}</span>
            <span />
          </div>
          {shown.map((asset) => {
            const visual = categoryVisual(categories, asset.category);
            const chip = gainChip(assetGain(asset).percent);
            const last = lastValued(asset);
            const updates = updateCount(asset);
            const old = isStale(asset, today);
            return (
              <div key={asset.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-surface-sunken px-4 py-3 text-body md:h-16 md:px-6 md:py-0", GRID)}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.5", visual.tone.bg, visual.tone.fg)}>{createElement(visual.icon, { "aria-hidden": true })}</span>
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate font-medium text-ink">{asset.name}</span>
                    <span className="text-caption font-normal text-ink-muted">{asset.category}</span>
                  </span>
                </span>
                <span className="hidden text-right text-ink-2 tabular-nums md:block">{formatCurrency(asset.purchasePrice, currency)}</span>
                <span className="text-right font-semibold text-ink tabular-nums">{formatCurrency(asset.currentValue, currency)}</span>
                <span className="col-span-2 flex flex-col gap-0.5 md:col-span-1">
                  <span className={cn("text-small", old ? "font-semibold text-warning" : "text-ink-2")}>{last ? formatDate(last) : t("Never checked")}</span>
                  <span className="text-caption font-normal text-ink-muted">{updates === 0 ? t("No updates yet") : `${updates} ${t(updates === 1 ? "update" : "updates")}`}</span>
                </span>
                <span className="hidden text-right md:block">
                  <Chip tone={chip.tone} size="sm" className="font-semibold">
                    {chip.label}
                  </Chip>
                </span>
                <span className="col-span-2 flex justify-end md:col-span-1">
                  {canManage && (
                    <Button variant="secondary" size="sm" onClick={() => setValuing(asset)} aria-label={`${t("Update value of")} ${asset.name}`} className={cn("h-8.5 px-3 text-small", old && "border-warning/50 text-warning hover:bg-warning-soft")}>
                      <Pencil className="size-3.5" />
                      {t("Update value")}
                    </Button>
                  )}
                </span>
              </div>
            );
          })}
        </Card>
      )}

      <UpdateValueDrawer open={valuing !== null} onClose={() => setValuing(null)} businessId={businessId} asset={valuing} categories={categories} currency={currency} />
    </PageFrame>
  );
}
