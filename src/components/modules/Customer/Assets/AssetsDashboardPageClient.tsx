"use client";

import { ArrowUpDown, Check, Package, Plus } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListHead, ListHeadCell, ListRow, ListRowButton } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { type AssetSort, assetGain, assetSeries, assetsSummary, categoryVisual, gainChip, portfolioSeries, sortAssets, type ValuePoint } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetDrawer } from "./AssetDrawer";
import { AssetTypeTile } from "./AssetTypeTile";
import { AssetValueChart } from "./AssetValueChart";
import { ReadOnlyNote } from "./ReadOnlyNote";
import { UpdateValueDrawer } from "./UpdateValueDrawer";

interface AssetsDashboardPageClientProps {
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
  today: string;
}

// The board's table: Asset, Bought, Paid, Value today, Change, Status.
// Phones keep the name and type on the left, the value and its change on
// the right.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_120px_140px_140px_110px_90px]";

const SORTS: { value: AssetSort; label: string }[] = [
  { value: "gain", label: "Highest gain first" },
  { value: "loss", label: "Biggest loss first" },
  { value: "valueHigh", label: "Value: high to low" },
  { value: "valueLow", label: "Value: low to high" },
  { value: "newest", label: "Newest bought" },
  { value: "oldest", label: "Oldest bought" },
];

// Assets overview: what the owned assets are worth today against what was
// paid, how that total (or one asset's value) moved over time, and every
// owned asset in the order picked.
export function AssetsDashboardPageClient({ businessId, assets, categories, currency, canManage, today }: AssetsDashboardPageClientProps) {
  const { t, fmt } = useLocale();
  const [addOpen, setAddOpen] = useState(false);
  const [valuing, setValuing] = useState<Asset | null>(null);
  const [sort, setSort] = useState<AssetSort>("gain");
  // The chart's asset, or "" for all of them together.
  const [chartFor, setChartFor] = useState("");

  const summary = assetsSummary(assets);
  const { owned } = summary;
  const gain = gainChip(summary.gain.percent);
  const loss = summary.gain.amount < 0;
  const picked = owned.find((asset) => asset.id === chartFor) ?? null;
  const points = picked ? assetSeries(picked) : portfolioSeries(owned, today);
  const first = points[0];
  const last = points[points.length - 1];
  const rows = sortAssets(owned, sort);
  const money = (value: number) => formatCurrency(value, currency, fmt);
  const percent = (value: number) => toLocaleDigits(`${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}%`, fmt);
  const sortLabel = t(SORTS.find((option) => option.value === sort)?.label ?? "");
  const pointLabel = (point: ValuePoint) => (point.today && !picked ? t("Today") : formatDate(`${point.date}T00:00:00.000Z`, "MMM yyyy", fmt));

  let chartSub = t("Active assets only, value at the end of each year. It steps up when an asset is added and moves with every value update.");
  if (picked && first && last) {
    const updates = points.length - 1;
    const origin = t(picked.purchaseAccountId ? "Purchased" : "Listed");
    chartSub = [
      t("{origin} at {amount} on {date}", { origin, amount: money(first.value), date: formatDate(`${first.date}T00:00:00.000Z`, "d MMM yyyy", fmt) }),
      updates === 0
        ? t("no updates yet")
        : t("now {amount} ({change}) after {updates}", {
            amount: money(last.value),
            change: percent(first.value > 0 ? ((last.value - first.value) / first.value) * 100 : 0),
            updates: plural(t, updates, "{count} update", "{count} updates", undefined, fmt),
          }),
    ].join(" · ");
  }

  return (
    <PageFrame>
      <PageHeader title={t("Assets overview")} />
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add, sell or update assets in this workspace.")}</ReadOnlyNote>}

      {owned.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title={t("No asset yet")}
          description={t("A plot of land, a car, gold, a laptop… add what you own and watch what it's worth.")}
          action={
            canManage && (
              <Button onClick={() => setAddOpen(true)}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("Add asset")}
              </Button>
            )
          }
          className="min-h-80"
        />
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3 md:gap-4">
            <Card className="flex min-w-0 flex-col gap-1.5">
              <span className="text-small text-ink-muted">{t("Current asset value")}</span>
              <span className="text-[28px] leading-tight font-bold tracking-[-0.02em] text-ink tabular-nums wrap-anywhere">{money(summary.totalValue)}</span>
              <span className="text-caption text-ink-muted">{t(owned.length === 1 ? "What your {count} active asset is worth today" : "What your {count} active assets are worth today", { count: formatCount(owned.length, fmt) })}</span>
            </Card>
            <Card className="flex min-w-0 flex-col gap-1.5">
              <span className="text-small text-ink-muted">{t("You paid")}</span>
              <span className="text-[28px] leading-tight font-bold tracking-[-0.02em] text-ink tabular-nums wrap-anywhere">{money(summary.totalPaid)}</span>
              <span className="text-caption text-ink-muted">{t("Total purchase or listing price")}</span>
            </Card>
            <Card className="flex min-w-0 flex-col gap-1.5">
              <span className="text-small text-ink-muted">{t(loss ? "Loss" : "Gain")}</span>
              <span className={cn("flex flex-wrap items-center gap-2 text-[28px] leading-tight font-bold tracking-[-0.02em] tabular-nums", loss ? "text-expense" : "text-income")}>
                <span className="wrap-anywhere">{`${loss ? "−" : "+"} ${money(Math.abs(summary.gain.amount))}`}</span>
                <Chip tone={gain.tone} size="sm" className="font-semibold">
                  {toLocaleDigits(gain.label, fmt)}
                </Chip>
              </span>
              <span className="text-caption text-ink-muted">{t("compared with what you paid")}</span>
            </Card>
          </section>

          <Card padding="none" className="flex flex-col gap-4 p-5 md:p-6" role="region" aria-labelledby="asset-chart-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 id="asset-chart-title" className="text-title font-semibold text-ink">
                  {picked ? picked.name : t("How your total asset value grew")}
                </h2>
                <span className="text-small text-ink-muted">{chartSub}</span>
                <span className="mt-1 flex flex-wrap gap-4 text-caption text-ink-2">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-0.75 w-4.5 rounded-full bg-emerald" />
                    {t("Value")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-0 w-4.5 border-t-2 border-dashed border-(--chart-other)" />
                    {t(picked ? "Starting price" : "What you paid")}
                  </span>
                </span>
              </span>
              <NativeSelect aria-label={t("Show value history for")} value={chartFor} onChange={(event) => setChartFor(event.target.value)} frameClassName="w-60 max-sm:w-full">
                <option value="">{t("All assets together")}</option>
                {owned.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <AssetValueChart
              points={points}
              currency={currency}
              paidLabel={t(picked ? "Starting price" : "What you paid")}
              label={pointLabel}
              ariaLabel={first && last ? t("Line chart of value from {from} to {to}", { from: pointLabel(first), to: pointLabel(last) }) : t("Value")}
            />
          </Card>

          <ListCard
            label={t("Your assets")}
            title={t("Your assets")}
            description={t("Sorted by {order} · active assets only", { order: sortLabel.toLowerCase() })}
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="h-11 gap-1.5 px-3.5">
                    <ArrowUpDown className="size-4" aria-hidden="true" />
                    {t("Sort")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-58">
                  {SORTS.map((option) => (
                    <DropdownMenuItem key={option.value} onSelect={() => setSort(option.value)} className={cn("justify-between", option.value === sort && "font-semibold")}>
                      {t(option.label)}
                      {option.value === sort && <Check className="size-4 text-emerald" aria-hidden="true" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            }
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
              {rows.map((asset) => {
                const chip = gainChip(assetGain(asset).percent);
                const changeChip = (
                  <Chip tone={chip.tone} size="sm" className="font-semibold">
                    {toLocaleDigits(chip.label, fmt)}
                  </Chip>
                );
                return (
                  <ListRow key={asset.id} columns={COLUMNS}>
                    <ListCell className="flex min-w-0 items-center gap-3">
                      <AssetTypeTile visual={categoryVisual(categories, asset.category)} />
                      <span className="flex min-w-0 flex-col gap-px">
                        {canManage ? (
                          <ListRowButton onClick={() => setValuing(asset)} aria-label={t("Update value of {name}", { name: asset.name })} className="truncate font-medium text-ink">
                            {asset.name}
                          </ListRowButton>
                        ) : (
                          <span className="truncate font-medium text-ink">{asset.name}</span>
                        )}
                        <span className="truncate text-caption font-normal text-ink-muted">{t(asset.category)}</span>
                      </span>
                    </ListCell>
                    <ListCell className="hidden text-small text-ink-2 md:block">{formatDate(asset.purchaseDate, "d MMM yyyy", fmt)}</ListCell>
                    <ListCell align="end" className="hidden text-ink-2 tabular-nums md:block">
                      {money(Number(asset.purchasePrice))}
                    </ListCell>
                    <ListCell align="end" className="flex flex-col items-end gap-px">
                      <span className="font-semibold text-ink tabular-nums">{money(Number(asset.currentValue))}</span>
                      <span className="md:hidden">{changeChip}</span>
                    </ListCell>
                    <ListCell align="end" className="hidden md:flex md:justify-end">
                      {changeChip}
                    </ListCell>
                    <ListCell align="end" className="hidden md:block">
                      <Chip tone="income" size="sm" className="font-semibold">
                        {t("Owned")}
                      </Chip>
                    </ListCell>
                  </ListRow>
                );
              })}
            </div>
          </ListCard>
        </>
      )}

      <AssetDrawer open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} categories={categories} totalValue={summary.totalValue} currency={currency} variant="add" />
      <UpdateValueDrawer open={valuing !== null} onClose={() => setValuing(null)} businessId={businessId} asset={valuing} categories={categories} currency={currency} />
    </PageFrame>
  );
}
