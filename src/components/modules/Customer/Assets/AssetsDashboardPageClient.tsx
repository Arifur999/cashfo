"use client";

import { ArrowUpDown, Check, ChevronDown, ChevronRight, Package, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import EmptyState from "@/components/smartly/EmptyState";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListHead, ListHeadCell, ListRow, ListRowButton } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import {
  type AssetSort,
  assetGain,
  assetSeries,
  assetsSummary,
  categoryVisual,
  gainChip,
  lastUpdateMovers,
  portfolioSeries,
  recentValueChanges,
  sortAssets,
  type ValueChange,
  type ValuePoint,
  valueByCategory,
} from "@/lib/customer/assetDisplay";
import { categoryColorVar } from "@/lib/customer/categoryTone";
import { currencySymbol, formatCompactAmount, formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetDrawer } from "./AssetDrawer";
import { AssetStatementDialog } from "./AssetStatementDialog";
import { AssetTypeTile } from "./AssetTypeTile";
import { AssetValueChart, type PointNote } from "./AssetValueChart";
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

// The board's table: Asset, Bought, Paid, Value today, Change, and the
// chevron that opens the asset's history. Phones keep the name and type on
// the left, the value and its change on the right.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_140px_130px_140px_110px_16px]";

const SORTS: { value: AssetSort; label: string }[] = [
  { value: "gain", label: "Highest gain first" },
  { value: "loss", label: "Biggest loss first" },
  { value: "valueHigh", label: "Value: high to low" },
  { value: "valueLow", label: "Value: low to high" },
  { value: "newest", label: "Newest bought" },
  { value: "oldest", label: "Oldest bought" },
];

const TONE_TEXT = { income: "text-income", expense: "text-expense", neutral: "text-ink-soft" } as const;
const TONE_CHIP = { income: "bg-income-soft text-income", expense: "bg-expense-soft text-expense", neutral: "bg-surface-sunken text-ink-soft" } as const;
const PANEL = "flex min-w-0 flex-col rounded-[18px] border border-line-card bg-surface shadow-[0_1px_2px_rgba(18,32,29,0.04)]";

// A name's first word, for the notes under the chart's dates.
const firstWord = (name: string) => {
  const word = name.trim().split(/\s+/)[0].replace(/[,.;:]+$/, "");
  return word.length > 12 ? `${word.slice(0, 11)}…` : word;
};

// Assets overview: what the active assets are worth against what was paid,
// what the sales made, how the total (or one asset) moved year by year,
// the split by category, the latest value changes, and every active asset
// in the order picked; each one opens its value history.
export function AssetsDashboardPageClient({ businessId, assets, categories, currency, canManage, today }: AssetsDashboardPageClientProps) {
  const { t, fmt } = useLocale();
  const [addOpen, setAddOpen] = useState(false);
  const [reading, setReading] = useState<Asset | null>(null);
  const [valuing, setValuing] = useState<Asset | null>(null);
  const [sort, setSort] = useState<AssetSort>("gain");
  // The chart's asset, or "" for all of them together.
  const [chartFor, setChartFor] = useState("");

  const summary = assetsSummary(assets);
  const { owned, sold } = summary;
  const picked = assets.find((asset) => asset.id === chartFor) ?? null;
  const points = picked ? assetSeries(picked) : portfolioSeries(assets, today);
  const first = points[0];
  const last = points[points.length - 1];
  const rows = sortAssets(owned, sort);
  const money = (value: number) => formatCurrency(value, currency, fmt);
  const signed = (value: number) => `${value > 0 ? "+ " : value < 0 ? "− " : ""}${money(Math.abs(value))}`;
  const short = (value: number) => `${currencySymbol(currency, fmt)} ${formatCompactAmount(value, fmt)}`;
  const pct = (change: number, base: number) => toLocaleDigits(gainChip(base ? (change / base) * 100 : 0).label, fmt);
  const tone = (value: number) => (value > 0 ? "income" : value < 0 ? "expense" : "neutral");
  const assetCount = (count: number) => t(count === 1 ? "{count} asset" : "{count} assets", { count: formatCount(count, fmt) });
  const sortLabel = t(SORTS.find((option) => option.value === sort)?.label ?? "");
  const pointLabel = (point: ValuePoint) => (point.today && !picked ? t("Today") : formatDate(`${point.date}T00:00:00.000Z`, "MMM yyyy", fmt));

  // Under each date: what was added and sold there (all together), or where
  // one asset started and was sold.
  const pointNote = (point: ValuePoint, index: number): PointNote | null => {
    if (picked) {
      if (point.sold.length) return { text: t("Sold"), down: true };
      return index === 0 ? { text: t(picked.purchaseAccountId ? "Bought" : "Added"), down: false } : null;
    }
    const parts: string[] = [];
    if (point.added.length) parts.push(`+ ${point.added.length <= 2 ? point.added.map(firstWord).join(", ") : assetCount(point.added.length)}`);
    if (point.sold.length) parts.push(`− ${point.sold.length === 1 ? firstWord(point.sold[0]) : t("{count} sold", { count: formatCount(point.sold.length, fmt) })}`);
    let text = parts.join(" · ");
    if (text.length > 22) text = [point.added.length ? `+${point.added.length}` : "", point.sold.length ? `−${point.sold.length}` : ""].filter(Boolean).join(" · ");
    return text ? { text: toLocaleDigits(text, fmt), down: point.sold.length > 0 && point.added.length === 0 } : null;
  };

  let chartTitle = t("How your total asset value changed");
  let chartSub = t("Value at the end of each year. Sold assets count until the day they were sold. It steps up when you add an asset and moves with every value update.");
  if (picked && first && last) {
    const updates = Math.max(0, points.length - 1 - (picked.status === "SOLD" ? 1 : 0));
    chartTitle = picked.name;
    chartSub = [
      t(picked.purchaseAccountId ? "Bought at {amount} on {date}" : "Added at {amount} on {date}", { amount: short(first.value), date: formatDate(picked.purchaseDate, "d MMM yyyy", fmt) }),
      `${t(picked.status === "SOLD" ? "sold for {amount}" : "now {amount}", { amount: short(last.value) })} (${pct(last.value - first.value, first.value)})`,
      updates === 0 ? t("no updates yet") : plural(t, updates, "{count} update", "{count} updates", undefined, fmt),
    ].join(" · ");
  }

  const gain = summary.gain.amount;
  const realized = summary.soldGain.amount;
  const soldPaid = sold.reduce((sum, asset) => sum + Number(asset.purchasePrice), 0);
  const soldGot = soldPaid + realized;
  const kpis = [
    {
      label: t("Current asset value"),
      value: money(summary.totalValue),
      ink: "text-ink",
      lead: "",
      sub: owned.length ? t(owned.length === 1 ? "What your {count} active asset is worth today" : "What your {count} active assets are worth today", { count: formatCount(owned.length, fmt) }) : t("No active assets yet"),
    },
    { label: t("You paid"), value: money(summary.totalPaid), ink: "text-ink", lead: "", sub: t("Total price of your active assets") },
    { label: t(gain < 0 ? "Unrealized loss" : "Unrealized gain"), value: signed(gain), ink: TONE_TEXT[tone(gain)], lead: pct(gain, summary.totalPaid), sub: t("compared with what you paid, not sold yet") },
    sold.length
      ? {
          label: t(realized < 0 ? "Sold assets · realized loss" : "Sold assets · realized gain"),
          value: signed(realized),
          ink: TONE_TEXT[tone(realized)],
          lead: "",
          sub: t("{count} sold · got {got} for {paid} paid", { count: formatCount(sold.length, fmt), got: money(soldGot), paid: money(soldPaid) }),
        }
      : { label: t("Sold assets"), value: money(0), ink: "text-ink-soft", lead: "", sub: t("Nothing sold yet") },
  ];

  const byCategory = valueByCategory(owned).map((entry) => {
    const paid = owned.filter((asset) => asset.category === entry.name).reduce((sum, asset) => sum + Number(asset.purchasePrice), 0);
    const match = categories.find((category) => category.name === entry.name);
    return { ...entry, paid, color: categoryColorVar(match?.color) };
  });
  const changes = recentValueChanges(assets);
  // The open statement, as the page last read it (an update made from it shows at once).
  const statement = reading && (assets.find((asset) => asset.id === reading.id) ?? reading);
  const { rise, drop } = lastUpdateMovers(owned);
  const movers: { change: ValueChange; label: string; box: string; ink: string }[] = [];
  if (rise) movers.push({ change: rise, label: "Biggest rise at last update", box: "bg-income-soft/60", ink: "text-income" });
  if (drop) movers.push({ change: drop, label: "Biggest drop at last update", box: "bg-expense-soft/60", ink: "text-expense" });
  const moverLine = (change: ValueChange) => `${pct(change.to - change.from, change.from)} · ${short(change.from)} → ${short(change.to)}`;

  return (
    <PageFrame className="gap-5 leading-[normal]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-page-title text-ink">{t("Assets overview")}</h1>
          <span className="text-[13px] text-ink-muted">
            {owned.length
              ? [t(owned.length === 1 ? "{count} active asset" : "{count} active assets", { count: formatCount(owned.length, fmt) }), sold.length ? t("{count} sold", { count: formatCount(sold.length, fmt) }) : null].filter(Boolean).join(" · ")
              : t("No active assets yet")}
          </span>
        </div>
        {owned.length > 0 && (
          <Button asChild variant="secondary" className="h-11 gap-2 rounded-full px-4">
            <Link href="/assets-management/update">
              <TrendingUp className="size-4" aria-hidden="true" />
              {t("Update values")}
            </Link>
          </Button>
        )}
      </div>
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add, sell or update assets in this workspace.")}</ReadOnlyNote>}

      {assets.length === 0 ? (
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
          <section aria-label={t("Totals")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="flex min-w-0 flex-col gap-1.5 rounded-[16px] border border-line-card bg-surface px-5.5 py-5 shadow-[0_1px_2px_rgba(18,32,29,0.04)]">
                <span className="text-[13px] font-medium text-ink-soft">{kpi.label}</span>
                <span className={cn("truncate text-[26px] font-bold tracking-[-0.02em] tabular-nums", kpi.ink)}>{kpi.value}</span>
                <span className="text-[12.5px] leading-[1.45] text-ink-muted">
                  {kpi.lead && <span className={cn("font-semibold", kpi.ink)}>{kpi.lead} </span>}
                  {kpi.sub}
                </span>
              </div>
            ))}
          </section>

          <section aria-labelledby="asset-chart-title" className={cn(PANEL, "gap-1.5 px-6 pt-5 pb-4")}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 id="asset-chart-title" className="truncate text-[17px] font-semibold text-ink">
                  {chartTitle}
                </h2>
                <span className="text-[13px] text-ink-muted">{chartSub}</span>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2.5 max-sm:w-full">
                <span className="mr-2 flex gap-3.5 text-[12px] text-ink-soft">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-0.75 w-4.5 rounded-full bg-emerald" />
                    {t("Value")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-0 w-4.5 border-t-2 border-dashed border-(--chart-other)" />
                    {t(picked ? "Price paid" : "What you paid")}
                  </span>
                </span>
                <NativeSelect aria-label={t("Show value history for")} value={chartFor} onChange={(event) => setChartFor(event.target.value)} frameClassName="h-10 w-57.5 max-sm:w-full" className="text-[13px] font-semibold">
                  <option value="">{t("All assets together")}</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.status === "SOLD" ? `${asset.name} (${t("Sold")})` : asset.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <AssetValueChart
              points={points}
              currency={currency}
              paidLabel={t(picked ? "Price paid" : "What you paid")}
              label={pointLabel}
              note={pointNote}
              markAll={!!picked}
              ariaLabel={first && last ? t("Line chart of value from {from} to {to}", { from: pointLabel(first), to: pointLabel(last) }) : t("Value")}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section aria-labelledby="asset-cat-title" className={cn(PANEL, "gap-3.5 px-5.5 py-5")}>
              <div className="flex flex-col gap-0.5">
                <h2 id="asset-cat-title" className="text-[17px] font-semibold text-ink">
                  {t("By category")}
                </h2>
                <span className="text-[12.5px] text-ink-muted">{t("Share of today’s value, active assets only")}</span>
              </div>
              {byCategory.length === 0 ? (
                <span className="py-6 text-center text-[13px] text-ink-muted">{t("No active assets yet.")}</span>
              ) : (
                <>
                  <div aria-hidden="true" className="flex h-2.5 overflow-hidden rounded-full bg-surface-sunken">
                    {byCategory.map((entry) => (
                      <span key={entry.name} className="border-r-2 border-surface" style={{ width: `${entry.share.toFixed(2)}%`, background: entry.color }} />
                    ))}
                  </div>
                  <ul className="flex flex-col">
                    {byCategory.map((entry) => {
                      const change = entry.value - entry.paid;
                      return (
                        <li key={entry.name} className="flex items-center gap-3 border-t border-divider py-2.25">
                          <AssetTypeTile visual={categoryVisual(categories, entry.name)} className="size-8.5 rounded-[10px]" />
                          <span className="flex min-w-0 flex-1 flex-col gap-px">
                            <span className="truncate text-[14px] font-semibold text-ink">{t(entry.name)}</span>
                            <span className="text-[12px] text-ink-muted">{assetCount(entry.count)}</span>
                          </span>
                          <span className="flex flex-col items-end gap-px tabular-nums">
                            <span className="text-[14px] font-bold whitespace-nowrap text-ink">{money(entry.value)}</span>
                            <span className={cn("text-[12px] whitespace-nowrap", TONE_TEXT[tone(change)])}>{t("{change} vs paid", { change: pct(change, entry.paid) })}</span>
                          </span>
                          <span className="w-11 text-right text-[13px] font-semibold text-ink-soft tabular-nums">{toLocaleDigits(`${Math.round(entry.share)}%`, fmt)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>

            <section aria-labelledby="asset-recent-title" className={cn(PANEL, "gap-3 px-5.5 py-5")}>
              <div className="flex flex-col gap-0.5">
                <h2 id="asset-recent-title" className="text-[17px] font-semibold text-ink">
                  {t("Recent value changes")}
                </h2>
                <span className="text-[12.5px] text-ink-muted">{t("Latest updates and sales. Open one to see its full history.")}</span>
              </div>
              {(rise || drop) && (
                <div className="grid grid-cols-2 gap-2.5">
                  {movers.map((mover) => (
                    <div key={mover.label} className={cn("flex min-w-0 flex-col gap-0.5 rounded-[12px] px-3 py-2.5", mover.box)}>
                      <span className={cn("text-[11.5px] font-semibold", mover.ink)}>{t(mover.label)}</span>
                      <span className="truncate text-[13.5px] font-semibold text-ink">{mover.change.asset.name}</span>
                      <span className="truncate text-[12px] text-ink-soft tabular-nums">{moverLine(mover.change)}</span>
                    </div>
                  ))}
                </div>
              )}
              {changes.length === 0 ? (
                <span className="py-6 text-center text-[13px] text-ink-muted">{t("No value updates yet. Update a value to see it here.")}</span>
              ) : (
                <ul className="flex flex-col">
                  {changes.map((change) => {
                    const moved = change.to - change.from;
                    return (
                      <li key={change.key} className="border-t border-divider">
                        <button
                          type="button"
                          onClick={() => setReading(change.asset)}
                          aria-label={t("Open value history of {name}", { name: change.asset.name })}
                          className="-mx-1.5 flex w-[calc(100%+12px)] items-center gap-3 rounded-[8px] px-1.5 py-2 text-left hover:bg-surface-sunken/60 focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
                        >
                          <span className="flex w-11 shrink-0 flex-col items-center rounded-[10px] bg-surface-sunken py-1 tabular-nums">
                            <span className="text-[15px] leading-[1.1] font-bold text-ink">{formatDate(`${change.date}T00:00:00.000Z`, "d", fmt)}</span>
                            <span className="text-[10.5px] whitespace-nowrap text-ink-muted">{formatDate(`${change.date}T00:00:00.000Z`, "MMM yy", fmt)}</span>
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-px">
                            <span className="truncate text-[14px] font-semibold text-ink">{change.asset.name}</span>
                            <span className="flex min-w-0 gap-1 text-[12px] text-ink-muted">
                              <span className="shrink-0">{t(change.kind === "sale" ? "Sold" : "Value updated")}</span>
                              {change.note && <span className="truncate">· {change.note}</span>}
                            </span>
                          </span>
                          <span className={cn("flex flex-col items-end gap-px tabular-nums", TONE_TEXT[tone(moved)])}>
                            <span className="text-[13.5px] font-bold whitespace-nowrap">{signed(moved)}</span>
                            <span className="text-[11.5px]">{pct(moved, change.from)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <ListCard
            label={t("Your assets")}
            title={t("Your assets")}
            description={t("Sorted by {order} · active assets only · open one to see its history", { order: sortLabel.toLowerCase() })}
            className="rounded-[18px]"
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="h-11 gap-2 rounded-[10px] px-3.5">
                    <ArrowUpDown className="size-4" aria-hidden="true" />
                    {t("Sort")}
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
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
            {rows.length === 0 ? (
              <p className="px-5 py-7 text-center text-[13px] text-ink-muted">{t("No active assets yet.")}</p>
            ) : (
              <div role="rowgroup">
                <ListHead columns={COLUMNS}>
                  <ListHeadCell>{t("Asset")}</ListHeadCell>
                  <ListHeadCell>{t("Bought")}</ListHeadCell>
                  <ListHeadCell align="end">{t("Paid@@price")}</ListHeadCell>
                  <ListHeadCell align="end">{t("Value today")}</ListHeadCell>
                  <ListHeadCell align="end">{t("Change@@value")}</ListHeadCell>
                  <ListHeadCell>
                    <span className="sr-only">{t("Open history")}</span>
                  </ListHeadCell>
                </ListHead>
                {rows.map((asset) => {
                  const chip = gainChip(assetGain(asset).percent);
                  const changeChip = <span className={cn("inline-block rounded-[6px] px-2 py-0.75 text-[12.5px] font-semibold tabular-nums", TONE_CHIP[chip.tone])}>{toLocaleDigits(chip.label, fmt)}</span>;
                  return (
                    <ListRow key={asset.id} columns={COLUMNS} className="hover:bg-surface-sunken/50">
                      <ListCell className="flex min-w-0 items-center gap-3">
                        <AssetTypeTile visual={categoryVisual(categories, asset.category)} className="size-9 rounded-[10px]" />
                        <span className="flex min-w-0 flex-col gap-px">
                          <ListRowButton onClick={() => setReading(asset)} aria-label={t("Open value history of {name}", { name: asset.name })} className="truncate text-[14px] font-semibold text-ink">
                            {asset.name}
                          </ListRowButton>
                          <span className="truncate text-[12px] font-normal text-ink-muted">{t(asset.category)}</span>
                        </span>
                      </ListCell>
                      <ListCell className="hidden text-[13.5px] whitespace-nowrap text-ink-2 md:block">{formatDate(asset.purchaseDate, "d MMM yyyy", fmt)}</ListCell>
                      <ListCell align="end" className="hidden text-[13.5px] whitespace-nowrap text-ink-soft tabular-nums md:block">
                        {money(Number(asset.purchasePrice))}
                      </ListCell>
                      <ListCell align="end" className="flex flex-col items-end gap-px">
                        <span className="text-[14px] font-bold whitespace-nowrap text-ink tabular-nums">{money(Number(asset.currentValue))}</span>
                        <span className="md:hidden">{changeChip}</span>
                      </ListCell>
                      <ListCell align="end" className="hidden md:flex md:justify-end">
                        {changeChip}
                      </ListCell>
                      <ListCell className="hidden text-ink-faint md:block">
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </ListCell>
                    </ListRow>
                  );
                })}
              </div>
            )}
          </ListCard>
        </>
      )}

      <AssetDrawer open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} categories={categories} currency={currency} variant="add" />
      <AssetStatementDialog
        open={reading !== null}
        onClose={() => setReading(null)}
        asset={statement}
        categories={categories}
        currency={currency}
        businessId={businessId}
        canManage={canManage}
        onUpdate={() => {
          setValuing(statement);
          setReading(null);
        }}
      />
      <UpdateValueDrawer open={valuing !== null} onClose={() => setValuing(null)} businessId={businessId} asset={valuing} categories={categories} currency={currency} />
    </PageFrame>
  );
}
