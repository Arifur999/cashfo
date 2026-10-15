"use client";

import { Package, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createElement, useState } from "react";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { assetGain, assetsSummary, assetWorth, biggestChanges, categoryVisual, gainChip, valueByCategory } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetDrawer } from "./AssetDrawer";
import { UpdateValueDrawer } from "./UpdateValueDrawer";

interface AssetsDashboardPageClientProps {
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
}

type Status = "all" | "owned" | "sold";
const GRID = "grid-cols-[minmax(0,1fr)_120px_140px_140px_110px_90px]";

// Assets: what everything owned is worth today against what was paid, the
// spread by category, the biggest moves, and every asset owned or sold.
export function AssetsDashboardPageClient({ businessId, assets, categories, currency, canManage }: AssetsDashboardPageClientProps) {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>(searchParams.get("status") === "sold" ? "sold" : "all");
  const [addOpen, setAddOpen] = useState(false);
  const [valuing, setValuing] = useState<Asset | null>(null);

  const summary = assetsSummary(assets);
  const gain = gainChip(summary.gain.percent);
  const shown = status === "owned" ? summary.owned : status === "sold" ? summary.sold : [...summary.owned, ...summary.sold];
  const lastSold = summary.sold[0];

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Assets")}`}
        title={t("Assets")}
        description={t("Everything you own outside your wallets, and what it's worth today.")}
        actions={
          canManage && (
            <>
              {summary.owned.length > 0 && (
                <Button variant="secondary" asChild>
                  <Link href="/assets-management/update">
                    <Pencil className="text-ink-2" />
                    {t("Update a value")}
                  </Link>
                </Button>
              )}
              <Button onClick={() => setAddOpen(true)}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("Add asset")}
              </Button>
            </>
          )
        }
      />

      {assets.length === 0 ? (
        <EmptyState icon={<Package />} title={t("No asset yet")} description={t("A plot of land, a car, gold, a laptop… add what you own and watch what it's worth.")} action={canManage && <Button onClick={() => setAddOpen(true)}>{t("Add asset")}</Button>} className="min-h-80" />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="flex flex-col gap-2">
              <span className="text-small font-medium text-ink-muted">{t("Total value today")}</span>
              <AmountText value={summary.totalValue} currency={currency} size="h2" className="text-h1" />
              <span className="text-caption font-normal text-ink-muted">
                {summary.owned.length} {t(summary.owned.length === 1 ? "asset you own" : "assets you own")}
              </span>
            </Card>
            <Card className="flex flex-col gap-2">
              <span className="text-small font-medium text-ink-muted">{t("You paid")}</span>
              <AmountText value={summary.totalPaid} currency={currency} size="h2" className="text-h1" />
              <span className="text-caption font-normal text-ink-muted">
                {t("Purchase price of the same")} {summary.owned.length}
              </span>
            </Card>
            <Card className="flex flex-col gap-2">
              <span className="text-small font-medium text-ink-muted">{summary.gain.amount < 0 ? t("Loss so far") : t("Gain so far")}</span>
              <AmountText value={summary.gain.amount} currency={currency} size="h2" tone="auto" signed className="text-h1" />
              <span className="flex items-center gap-2 text-caption font-normal text-ink-muted">
                <Chip tone={gain.tone} size="sm" className="font-semibold">
                  {gain.label}
                </Chip>
                {t("on what you paid")}
              </span>
            </Card>
            <Card className="flex flex-col gap-2">
              <span className="text-small font-medium text-ink-muted">{t("Sold")}</span>
              <span className="text-h1 text-ink tabular-nums">{summary.sold.length}</span>
              <span className="truncate text-caption font-normal text-ink-muted">{lastSold ? `${lastSold.name}, ${t("for")} ${formatCurrency(lastSold.soldPrice ?? 0, currency)}` : t("Nothing sold yet")}</span>
            </Card>
          </section>

          {summary.owned.length > 0 && (
            <div className="grid gap-6 md:grid-cols-3">
              <Card padding="lg" className="flex flex-col gap-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-title text-ink">{t("Value by category")}</h2>
                  <span className="text-small text-ink-muted">{t("Today's value")}</span>
                </div>
                <div role="img" aria-label={t("Value by category")} className="flex h-3.5 gap-0.75 overflow-hidden rounded-full bg-surface-sunken">
                  {valueByCategory(summary.owned).map((slice) => (
                    <span key={slice.name} className="h-full" style={{ width: `${slice.share}%`, background: categoryVisual(categories, slice.name).hex }} />
                  ))}
                </div>
                <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                  {valueByCategory(summary.owned).map((slice) => {
                    const visual = categoryVisual(categories, slice.name);
                    return (
                      <div key={slice.name} className="flex items-center gap-3">
                        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", visual.tone.bg, visual.tone.fg)}>{createElement(visual.icon, { "aria-hidden": true })}</span>
                        <span className="flex min-w-0 flex-1 flex-col gap-px">
                          <span className="truncate text-body font-medium text-ink">{slice.name}</span>
                          <span className="text-caption font-normal text-ink-muted">
                            {slice.count} {t(slice.count === 1 ? "asset" : "assets")}
                          </span>
                        </span>
                        <span className="flex flex-col items-end gap-px">
                          <span className="text-body font-semibold text-ink tabular-nums">{formatCurrency(slice.value, currency)}</span>
                          <span className="text-caption font-normal text-ink-muted tabular-nums">{Math.round(slice.share)}%</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card padding="lg" className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-title text-ink">{t("Biggest changes")}</h2>
                  <span className="text-small text-ink-muted">{t("vs what you paid")}</span>
                </div>
                {biggestChanges(summary.owned).map((asset) => {
                  const visual = categoryVisual(categories, asset.category);
                  const chip = gainChip(assetGain(asset).percent);
                  return (
                    <div key={asset.id} className="flex items-center gap-3">
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", visual.tone.bg, visual.tone.fg)}>{createElement(visual.icon, { "aria-hidden": true })}</span>
                      <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{asset.name}</span>
                      <Chip tone={chip.tone} size="sm" className="font-semibold">
                        {chip.label}
                      </Chip>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}

          <Card padding="none" className="overflow-hidden">
            <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <h2 className="text-title text-ink">{t("All assets")}</h2>
              <SegmentedControl
                options={[
                  { value: "all", label: `${t("All")} ${assets.length}` },
                  { value: "owned", label: `${t("Owned")} ${summary.owned.length}` },
                  { value: "sold", label: `${t("Sold")} ${summary.sold.length}` },
                ]}
                value={status}
                onChange={setStatus}
                label={t("Status")}
              />
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-220">
                <div className={cn("grid items-center gap-x-4 border-y border-line bg-cream px-6 py-3 text-caption text-ink-muted", GRID)}>
                  <span>{t("Asset")}</span>
                  <span>{t("Bought")}</span>
                  <span className="text-right">{t("Paid")}</span>
                  <span className="text-right">{t("Value today")}</span>
                  <span className="text-right">{t("Change")}</span>
                  <span className="text-right">{t("Status")}</span>
                </div>
                {shown.length === 0 && <p className="px-6 py-10 text-center text-body text-ink-muted">{t("Nothing here.")}</p>}
                {shown.map((asset) => {
                  const visual = categoryVisual(categories, asset.category);
                  const chip = gainChip(assetGain(asset).percent);
                  const sold = asset.status === "SOLD";
                  const row = (
                    <>
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.5", visual.tone.bg, visual.tone.fg)}>{createElement(visual.icon, { "aria-hidden": true })}</span>
                        <span className="flex min-w-0 flex-col gap-px">
                          <span className="truncate font-medium text-ink">{asset.name}</span>
                          <span className="text-caption font-normal text-ink-muted">{sold && asset.soldAt ? `${asset.category} · ${t("sold")} ${formatDate(asset.soldAt)}` : asset.category}</span>
                        </span>
                      </span>
                      <span className="text-small text-ink-2">{formatDate(asset.purchaseDate)}</span>
                      <span className="text-right text-ink-2 tabular-nums">{formatCurrency(asset.purchasePrice, currency)}</span>
                      <span className="text-right font-semibold text-ink tabular-nums">{formatCurrency(assetWorth(asset), currency)}</span>
                      <span className="text-right">
                        <Chip tone={chip.tone} size="sm" className="font-semibold">
                          {chip.label}
                        </Chip>
                      </span>
                      <span className="text-right">
                        <Chip tone={sold ? "neutral" : "income"} size="sm" className="font-semibold">
                          {sold ? t("Sold") : t("Owned")}
                        </Chip>
                      </span>
                    </>
                  );
                  const rowClass = cn("grid h-14.5 w-full items-center gap-x-4 border-b border-surface-sunken px-6 text-left text-body", GRID, sold && "opacity-70");
                  return sold || !canManage ? (
                    <div key={asset.id} className={rowClass}>
                      {row}
                    </div>
                  ) : (
                    <button key={asset.id} type="button" onClick={() => setValuing(asset)} className={cn(rowClass, "transition-colors hover:bg-cream")}>
                      {row}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      )}

      <AssetDrawer open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} categories={categories} totalValue={summary.totalValue} currency={currency} />
      <UpdateValueDrawer open={valuing !== null} onClose={() => setValuing(null)} businessId={businessId} asset={valuing} categories={categories} currency={currency} />
    </PageFrame>
  );
}
