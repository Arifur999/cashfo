"use client";

import { Package, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListRowButton } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { assetGain, assetsSummary, assetWorth, biggestChanges, categoryVisual, gainChip, type GainChip, valueByCategory } from "@/lib/customer/assetDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetDrawer } from "./AssetDrawer";
import { AssetTypeTile } from "./AssetTypeTile";
import { ReadOnlyNote } from "./ReadOnlyNote";
import { SoldAssetDrawer } from "./SoldAssetDrawer";
import { UpdateValueDrawer } from "./UpdateValueDrawer";

interface AssetsDashboardPageClientProps {
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
}

type Status = "all" | "owned" | "sold";

// Asset, bought, paid, value today, change, status. Phones restack each row
// as the other asset lists do: the name and type on the left, the value and
// its change on the right (a sold row's subtitle already says "Sold").
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_120px_140px_140px_110px_90px]";

// The four figures: two to a row up to xl (a lakh or crore total needs the
// room), four across from there. 18px on phones, 28px from md.
const TILE = "flex min-w-0 flex-col gap-2 md:p-5";
const TILE_LABEL = "text-small font-medium text-ink-muted";
const FIGURE = "text-h3 wrap-anywhere max-md:font-bold md:text-h1 md:leading-[normal]";

// Assets: what everything owned is worth today against what was paid, the
// spread by type, the biggest moves, and every asset owned or sold.
export function AssetsDashboardPageClient({ businessId, assets, categories, currency, canManage }: AssetsDashboardPageClientProps) {
  const { t, fmt } = useLocale();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>(searchParams.get("status") === "sold" ? "sold" : "all");
  const [addOpen, setAddOpen] = useState(false);
  const [valuing, setValuing] = useState<Asset | null>(null);
  const [viewing, setViewing] = useState<Asset | null>(null);

  const summary = assetsSummary(assets);
  const gain = gainChip(summary.gain.percent);
  const soldGain = gainChip(summary.soldGain.percent);
  const shown = status === "owned" ? summary.owned : status === "sold" ? summary.sold : [...summary.owned, ...summary.sold];
  const lastSold = summary.sold[0];
  const slices = valueByCategory(summary.owned);
  const moved = biggestChanges(summary.owned);
  const owned = formatCount(summary.owned.length, fmt);
  const chipOf = (tone: GainChip["tone"], label: string) => (
    <Chip tone={tone} size="sm" className="font-semibold">
      {toLocaleDigits(label, fmt)}
    </Chip>
  );
  // "All 7", the count in the reader's digits; one span, so the segment's
  // flex gap doesn't widen the space.
  const segment = (word: string, count: number) => (
    <span>
      {t(word)} <span className="tabular-nums">{formatCount(count, fmt)}</span>
    </span>
  );

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
                    <TrendingUp className="text-ink-soft" />
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
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add, sell or update assets in this workspace.")}</ReadOnlyNote>}

      {assets.length === 0 ? (
        <EmptyState icon={<Package />} title={t("No asset yet")} description={t("A plot of land, a car, gold, a laptop… add what you own and watch what it's worth.")} action={canManage && <Button onClick={() => setAddOpen(true)}>{t("Add asset")}</Button>} className="min-h-80" />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <Card padding="sm" className={TILE}>
              <span className={TILE_LABEL}>{t("Total value today")}</span>
              <AmountText value={summary.totalValue} currency={currency} size="h2" className={FIGURE} />
              <span className="text-caption font-normal text-ink-muted">{t(summary.owned.length === 1 ? "{count} asset you own" : "{count} assets you own", { count: owned })}</span>
            </Card>
            <Card padding="sm" className={TILE}>
              <span className={TILE_LABEL}>{t("You paid")}</span>
              <AmountText value={summary.totalPaid} currency={currency} size="h2" className={FIGURE} />
              <span className="text-caption font-normal text-ink-muted">{t("Purchase price of the same {count}", { count: owned })}</span>
            </Card>
            <Card padding="sm" className={TILE}>
              <span className={TILE_LABEL}>{summary.gain.amount < 0 ? t("Loss so far") : t("Gain so far")}</span>
              <AmountText value={summary.gain.amount} currency={currency} size="h2" tone="auto" signed className={FIGURE} />
              {/* What has been sold counts on the Sold tile, not here. */}
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption font-normal text-ink-muted">{fillNodes(t("{change} on what you paid"), { change: chipOf(gain.tone, gain.label) })}</span>
            </Card>
            <Card padding="sm" className={TILE}>
              <span className={TILE_LABEL}>{t("Sold")}</span>
              <span className={cn(FIGURE, "text-ink tabular-nums")}>{formatCount(summary.sold.length, fmt)}</span>
              <span className="truncate text-caption font-normal text-ink-muted">{lastSold ? t("{name}, for {amount}", { name: lastSold.name, amount: formatCurrency(lastSold.soldPrice ?? 0, currency, fmt) }) : t("Nothing sold yet")}</span>
              {lastSold && <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption font-normal text-ink-muted">{fillNodes(t("{change} on sales"), { change: chipOf(soldGain.tone, formatSignedCurrency(summary.soldGain.amount, currency, fmt)) })}</span>}
            </Card>
          </section>

          {summary.owned.length > 0 && (
            <div className="grid gap-6 md:grid-cols-3">
              <Card padding="lg" className="flex flex-col gap-4.5 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-title text-ink">{t("Value by category")}</h2>
                  <span className="text-small text-ink-muted">{t("Today's value")}</span>
                </div>
                {/* The list under the bar carries every figure. */}
                <div aria-hidden="true" className="flex h-3.5 gap-0.75 overflow-hidden rounded-full bg-surface-sunken">
                  {slices.map((slice) => (
                    <span key={slice.name} className="h-full" style={{ width: `${slice.share}%`, background: categoryVisual(categories, slice.name).color }} />
                  ))}
                </div>
                {/* Two columns once there are two types to fill them; one
                    spans the card, its figure under "Today's value". */}
                <ul className={cn("grid gap-x-8 gap-y-3.5", slices.length > 1 && "md:grid-cols-2")}>
                  {slices.map((slice) => (
                    <li key={slice.name} className="flex items-center gap-3">
                      <AssetTypeTile visual={categoryVisual(categories, slice.name)} size="sm" />
                      <span className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="truncate text-body font-medium text-ink">{t(slice.name)}</span>
                        <span className="text-caption font-normal text-ink-muted">{t(slice.count === 1 ? "{count} asset" : "{count} assets", { count: formatCount(slice.count, fmt) })}</span>
                      </span>
                      <span className="flex flex-col items-end gap-px">
                        <span className="text-body font-semibold text-ink tabular-nums">{formatCurrency(slice.value, currency, fmt)}</span>
                        <span className="text-caption font-normal text-ink-muted tabular-nums">{toLocaleDigits(`${Math.round(slice.share)}%`, fmt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card padding="lg" className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-title text-ink">{t("Biggest changes")}</h2>
                  <span className="text-small text-ink-muted">{t("vs what you paid")}</span>
                </div>
                {moved.length === 0 ? (
                  <p className="text-body text-ink-muted">
                    {t("No value has moved yet.")}{" "}
                    {canManage && (
                      <Link href="/assets-management/update" className="font-semibold text-emerald hover:text-emerald-hover">
                        {t("Update a value")}
                      </Link>
                    )}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {moved.map((asset) => {
                      const chip = gainChip(assetGain(asset).percent);
                      return (
                        <li key={asset.id} className="flex items-center gap-3">
                          <AssetTypeTile visual={categoryVisual(categories, asset.category)} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{asset.name}</span>
                          {chipOf(chip.tone, chip.label)}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>
          )}

          <ListCard
            label={t("All assets")}
            title={t("All assets")}
            actions={<SegmentedControl options={[{ value: "all", label: segment("All", assets.length) }, { value: "owned", label: segment("Owned", summary.owned.length) }, { value: "sold", label: segment("Sold", summary.sold.length) }]} value={status} onChange={setStatus} label={t("Status")} />}
          >
            <div role="rowgroup">
              <ListHead columns={COLUMNS}>
                <ListHeadCell>{t("Asset")}</ListHeadCell>
                <ListHeadCell>{t("Bought")}</ListHeadCell>
                <ListHeadCell align="end">{t("Paid@@price")}</ListHeadCell>
                <ListHeadCell align="end">{t("Value today")}</ListHeadCell>
                <ListHeadCell align="end">{t("Change@@value")}</ListHeadCell>
                <ListHeadCell align="end">{t("Status")}</ListHeadCell>
              </ListHead>
              {shown.map((asset) => {
                const chip = gainChip(assetGain(asset).percent);
                const sold = asset.status === "SOLD";
                // A sold asset opens to look at (anyone may); an owned one
                // to update its value or details (only those who can).
                const opens = sold || canManage;
                return (
                  <ListRow key={asset.id} columns={COLUMNS}>
                    <ListCell className="flex min-w-0 items-center gap-3">
                      <AssetTypeTile visual={categoryVisual(categories, asset.category)} />
                      <span className="flex min-w-0 flex-col gap-px">
                        {opens ? (
                          <ListRowButton onClick={() => (sold ? setViewing(asset) : setValuing(asset))} aria-label={sold ? t("Open {name}", { name: asset.name }) : t("Update value of {name}", { name: asset.name })} className={cn("truncate font-medium", sold ? "text-ink-2" : "text-ink")}>
                            {asset.name}
                          </ListRowButton>
                        ) : (
                          <span className="truncate font-medium text-ink">{asset.name}</span>
                        )}
                        <span className="truncate text-caption font-normal text-ink-muted">{sold && asset.soldAt ? `${t(asset.category)} · ${t("Sold {date}", { date: formatDate(asset.soldAt, "d MMM yyyy", fmt) })}` : t(asset.category)}</span>
                      </span>
                    </ListCell>
                    <ListCell className="hidden text-small text-ink-2 md:block">{formatDate(asset.purchaseDate, "d MMM yyyy", fmt)}</ListCell>
                    <ListCell align="end" className="hidden text-ink-2 tabular-nums md:block">
                      {formatCurrency(asset.purchasePrice, currency, fmt)}
                    </ListCell>
                    {/* Once sold, the figure is the sale price, and says so. A
                        phone shows the change under it, in place of its column. */}
                    <ListCell align="end" className="flex flex-col items-end gap-px">
                      {sold && <span className="text-caption font-normal text-ink-muted">{t("Sale price")}</span>}
                      <span className={cn("font-semibold tabular-nums", sold ? "text-ink-2" : "text-ink")}>{formatCurrency(assetWorth(asset), currency, fmt)}</span>
                      <span className="md:hidden">{chipOf(chip.tone, chip.label)}</span>
                    </ListCell>
                    <ListCell align="end" className="hidden md:flex md:justify-end">
                      {chipOf(chip.tone, chip.label)}
                    </ListCell>
                    <ListCell align="end" className="hidden md:block">
                      <Chip tone={sold ? "neutral" : "income"} size="sm" className="font-semibold">
                        {sold ? t("Sold") : t("Owned")}
                      </Chip>
                    </ListCell>
                  </ListRow>
                );
              })}
            </div>
            {shown.length === 0 && <ListEmpty title={t("Nothing here.")} />}
          </ListCard>
        </>
      )}

      {/* "Add asset" means something already owned on every page; buying is on Buy & sell. */}
      <AssetDrawer open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} categories={categories} totalValue={summary.totalValue} currency={currency} initialMode="own" />
      <UpdateValueDrawer open={valuing !== null} onClose={() => setValuing(null)} businessId={businessId} asset={valuing} categories={categories} currency={currency} />
      <SoldAssetDrawer open={viewing !== null} onClose={() => setViewing(null)} businessId={businessId} asset={viewing} categories={categories} currency={currency} canManage={canManage} />
    </PageFrame>
  );
}
