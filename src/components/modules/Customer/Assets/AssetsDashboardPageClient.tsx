"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PageFrame from "@/components/smartly/PageFrame";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import {
  type AssetSort,
  assetGain,
  assetSeries,
  assetsSummary,
  lastUpdateMovers,
  portfolioSeries,
  recentValueChanges,
  sortAssets,
  updateCount,
  type ValueChange,
  type ValuePoint,
  valueByCategory,
} from "@/lib/customer/assetDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { assetLook, assetShort, AssetTile, assetTone, changePercent } from "./assetLook";
import { AssetValueChart, type PointNote } from "./AssetValueChart";

interface AssetsDashboardPageClientProps {
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  today: string;
}

const SORTS: { value: AssetSort; label: string }[] = [
  { value: "gain", label: "Highest gain first" },
  { value: "loss", label: "Biggest loss first" },
  { value: "valueHigh", label: "Value: high to low" },
  { value: "valueLow", label: "Value: low to high" },
  { value: "newest", label: "Newest bought" },
  { value: "oldest", label: "Oldest bought" },
];

const PANEL = "flex min-w-0 flex-col rounded-[18px] border border-line-card bg-surface shadow-[0_1px_2px_rgba(18,32,29,0.04)]";
const TH = "px-4 py-3 text-[12px] font-medium whitespace-nowrap text-ink-muted";

// A name's first word, for the notes under the chart's dates.
const firstWord = (name: string) => {
  const word = name.trim().split(/\s+/)[0].replace(/[,.;:]+$/, "");
  return word.length > 12 ? `${word.slice(0, 11)}…` : word;
};

const newestBought = (a: Asset, b: Asset) => b.purchaseDate.localeCompare(a.purchaseDate);

// Assets overview: what the active assets are worth against what was paid,
// what the sales made, how the total (or one asset) moved year by year, the
// split by category, the latest value changes, and every active asset in the
// order picked; each one opens its value history on the Update page.
export function AssetsDashboardPageClient({ assets, categories, currency, today }: AssetsDashboardPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [sort, setSort] = useState<AssetSort>("gain");
  // The chart's asset, or "" for all of them together.
  const [chartFor, setChartFor] = useState("");

  const summary = assetsSummary(assets);
  const { owned, sold } = summary;
  const picked = assets.find((asset) => asset.id === chartFor) ?? null;
  const points = picked ? assetSeries(picked) : portfolioSeries(assets, today);
  const first = points[0];
  const last = points[points.length - 1];
  const money = (value: number) => formatCurrency(value, currency, fmt);
  const signed = (value: number) => formatSignedCurrency(value, currency, fmt);
  const short = (value: number) => assetShort(value, currency, fmt);
  const pct = (change: number, base: number) => toLocaleDigits(changePercent(change, base), fmt);
  const assetCount = (count: number) => t(count === 1 ? "{count} asset" : "{count} assets", { count: formatCount(count, fmt) });
  const sortLabel = t(SORTS.find((option) => option.value === sort)?.label ?? "");
  const pointLabel = (point: ValuePoint) => (point.today && !picked ? t("Today") : formatDate(`${point.date}T00:00:00.000Z`, "MMM yyyy", fmt));
  const openHistory = (asset: Asset) => router.push(`/assets-management/update?history=${asset.id}`);

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
    const updates = updateCount(picked);
    chartTitle = picked.name;
    chartSub = [
      t(picked.purchaseAccountId ? "Bought at {amount} on {date}" : "Added at {amount} on {date}", { amount: short(first.value), date: formatDate(picked.purchaseDate, "d MMM yyyy", fmt) }),
      `${t(picked.status === "SOLD" ? "sold for {amount}" : "now {amount}", { amount: short(last.value) })} (${pct(last.value - first.value, first.value)})`,
      updates === 0 ? t("no updates yet") : t(updates === 1 ? "{count} update" : "{count} updates", { count: formatCount(updates, fmt) }),
    ].join(" · ");
  }

  const gain = summary.gain.amount;
  const realized = summary.soldGain.amount;
  const soldPaid = sold.reduce((sum, asset) => sum + Number(asset.purchasePrice), 0);
  const kpis = [
    {
      label: t("Current asset value"),
      value: money(summary.totalValue),
      ink: "text-ink",
      lead: "",
      sub: owned.length ? t(owned.length === 1 ? "What your {count} active asset is worth today" : "What your {count} active assets are worth today", { count: formatCount(owned.length, fmt) }) : t("No active assets yet"),
    },
    { label: t("You paid"), value: money(summary.totalPaid), ink: "text-ink", lead: "", sub: t("Total price of your active assets") },
    { label: t(gain < 0 ? "Unrealized loss" : "Unrealized gain"), value: signed(gain), ink: assetTone(gain).ink, lead: pct(gain, summary.totalPaid), sub: ` ${t("compared with what you paid, not sold yet")}` },
    sold.length
      ? {
          label: t(realized < 0 ? "Sold assets · realized loss" : "Sold assets · realized gain"),
          value: signed(realized),
          ink: assetTone(realized).ink,
          lead: "",
          sub: t("{count} sold · got {got} for {paid} paid", { count: formatCount(sold.length, fmt), got: money(soldPaid + realized), paid: money(soldPaid) }),
        }
      : { label: t("Sold assets"), value: money(0), ink: "text-ink-soft", lead: "", sub: t("Nothing sold yet") },
  ];

  const byCategory = valueByCategory(owned).map((entry) => ({
    ...entry,
    paid: owned.filter((asset) => asset.category === entry.name).reduce((sum, asset) => sum + Number(asset.purchasePrice), 0),
    look: assetLook(categories, entry.name),
  }));
  const changes = recentValueChanges(assets);
  const { rise, drop } = lastUpdateMovers(owned);
  const movers: { change: ValueChange; label: string; wash: string; ink: string }[] = [];
  if (rise) movers.push({ change: rise, label: "Biggest rise at last update", wash: "bg-gain-wash", ink: "text-tint-green-ink" });
  if (drop) movers.push({ change: drop, label: "Biggest drop at last update", wash: "bg-loss-wash", ink: "text-loss-ink" });
  const rows = sortAssets(owned, sort);
  // The chart's picker: active assets newest bought first, then the sold ones.
  const pickable = [...[...owned].sort(newestBought), ...[...sold].sort(newestBought)];
  const rowKey = (open: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  };

  return (
    <PageFrame className="gap-5 leading-[normal] md:pt-6 md:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Assets overview")}</h1>
          <span className="text-[13px] text-ink-muted">
            {owned.length
              ? [t(owned.length === 1 ? "{count} active asset" : "{count} active assets", { count: formatCount(owned.length, fmt) }), sold.length ? t("{count} sold", { count: formatCount(sold.length, fmt) }) : null].filter(Boolean).join(" · ")
              : t("No active assets yet")}
          </span>
        </div>
        <Link href="/assets-management/update" className="flex h-11 items-center gap-2 rounded-full border border-input bg-surface px-4 text-[14px] font-semibold whitespace-nowrap text-ink hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-2">
            <path d="M16 7h6v6" />
            <path d="m22 7-8.5 8.5-5-5L2 17" />
          </svg>
          {t("Update values")}
        </Link>
      </div>

      <section aria-label={t("Totals")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="flex min-w-0 flex-col gap-1.5 rounded-[16px] border border-line-card bg-surface px-5.5 py-5 shadow-[0_1px_2px_rgba(18,32,29,0.04)]">
            <span className="text-[13px] font-medium text-ink-soft">{kpi.label}</span>
            <span className={cn("truncate text-[26px] font-bold tracking-[-0.02em] tabular-nums", kpi.ink)}>{kpi.value}</span>
            <span className="text-[12.5px] leading-[1.45] text-ink-muted">
              {kpi.lead && <span className={cn("font-semibold", kpi.ink)}>{kpi.lead}</span>}
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
                <span aria-hidden="true" className="h-0.75 w-4.5 rounded-[2px] bg-emerald" />
                {t("Value")}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-0 w-4.5 border-t-2 border-dashed border-chart-cost" />
                {t(picked ? "Price paid" : "What you paid")}
              </span>
            </span>
            <select
              aria-label={t("Show value history for")}
              value={chartFor}
              onChange={(event) => setChartFor(event.target.value)}
              className="h-10 max-w-57.5 cursor-pointer rounded-[10px] border border-input bg-surface px-2.5 text-[13px] font-semibold text-ink max-sm:w-full max-sm:max-w-none"
            >
              <option value="">{t("All assets together")}</option>
              {pickable.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.status === "SOLD" ? `${asset.name} ${t("(sold)")}` : asset.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {points.length > 0 && first && last ? (
          <AssetValueChart
            points={points}
            short={short}
            label={pointLabel}
            note={pointNote}
            markAll={!!picked}
            ariaLabel={t("Line chart of value from {from} to {to}", { from: pointLabel(first), to: pointLabel(last) })}
          />
        ) : (
          <div className="flex h-55 flex-col items-center justify-center gap-2 text-center">
            <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-[14px] bg-quiet-chip text-ink-muted">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </span>
            <span className="text-[15px] font-semibold text-ink">{t("No assets yet")}</span>
            <span className="max-w-105 text-[13px] text-ink-muted">{t("Add an asset in Purchase & Sell to see how its value changes over time.")}</span>
            <Link href="/assets-management/purchase-sell" className="mt-1 flex h-10 items-center rounded-full bg-emerald px-4 text-[13px] font-semibold text-white hover:bg-emerald-hover">
              {t("Go to Purchase & Sell")}
            </Link>
          </div>
        )}
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
              <div aria-hidden="true" className="flex h-2.5 overflow-hidden rounded-full bg-quiet-chip">
                {byCategory.map((entry) => (
                  <span key={entry.name} className="border-r-2 border-surface" style={{ width: `${entry.share.toFixed(2)}%`, background: entry.look.ink }} />
                ))}
              </div>
              <ul className="flex flex-col">
                {byCategory.map((entry) => {
                  const change = entry.value - entry.paid;
                  return (
                    <li key={entry.name} className="flex items-center gap-3 border-t border-quiet-chip py-2.25">
                      <AssetTile look={entry.look} className="size-8.5 rounded-[10px]" glyph={17} />
                      <span className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="truncate text-[14px] font-semibold text-ink">{t(entry.name)}</span>
                        <span className="text-[12px] text-ink-muted">{assetCount(entry.count)}</span>
                      </span>
                      <span className="flex flex-col items-end gap-px tabular-nums">
                        <span className="text-[14px] font-bold whitespace-nowrap text-ink">{money(entry.value)}</span>
                        <span className={cn("text-[12px] whitespace-nowrap", assetTone(change).ink)}>{t("{change} vs paid", { change: pct(change, entry.paid) })}</span>
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
          {movers.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {movers.map((mover) => (
                <div key={mover.label} className={cn("flex min-w-0 flex-col gap-0.5 rounded-[12px] px-3 py-2.5", mover.wash)}>
                  <span className={cn("text-[11.5px] font-semibold", mover.ink)}>{t(mover.label)}</span>
                  <span className="truncate text-[13.5px] font-semibold text-ink">{mover.change.asset.name}</span>
                  <span className="truncate text-[12px] text-ink-soft tabular-nums">{`${pct(mover.change.to - mover.change.from, mover.change.from)} · ${short(mover.change.from)} → ${short(mover.change.to)}`}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col">
            {changes.map((change) => {
              const moved = change.to - change.from;
              const open = () => openHistory(change.asset);
              return (
                <div
                  key={change.key}
                  role="button"
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={rowKey(open)}
                  aria-label={t("Open value history of {name}", { name: change.asset.name })}
                  className="-mx-1.5 flex cursor-pointer items-center gap-3 rounded-[8px] border-t border-quiet-chip px-1.5 py-2 hover:bg-hover focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
                >
                  <span className="flex w-11 shrink-0 flex-col items-center rounded-[10px] bg-surface-sunken py-1">
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
                  <span className={cn("flex flex-col items-end gap-px tabular-nums", assetTone(moved).ink)}>
                    <span className="text-[13.5px] font-bold whitespace-nowrap">{signed(moved)}</span>
                    <span className="text-[11.5px]">{pct(moved, change.from)}</span>
                  </span>
                </div>
              );
            })}
          </div>
          {changes.length === 0 && <span className="py-6 text-center text-[13px] text-ink-muted">{t("No value updates yet. Update a value to see it here.")}</span>}
        </section>
      </div>

      <section aria-labelledby="asset-table-title" className={PANEL}>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="asset-table-title" className="text-[17px] font-semibold text-ink">
              {t("Your assets")}
            </h2>
            <span className="text-[12.5px] text-ink-muted">{t("Sorted by {order} · active assets only · open one to see its history", { order: sortLabel.toLowerCase() })}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-11 shrink-0 items-center gap-2 rounded-[10px] border border-input bg-surface px-3.5 text-[14px] font-semibold text-ink hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-(--focus-ring)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-2">
                <path d="M3 6h18" />
                <path d="M7 12h10" />
                <path d="M10 18h4" />
              </svg>
              {t("Sort")}
              <ChevronDown className="size-3.5 text-ink-muted" strokeWidth={2.25} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-60 rounded-[12px] border border-line-card p-1.5 shadow-[0_12px_32px_rgba(18,32,29,0.14)]">
              {SORTS.map((option) => {
                const on = option.value === sort;
                return (
                  <DropdownMenuItem key={option.value} onSelect={() => setSort(option.value)} className={cn("min-h-10 justify-between rounded-[8px] px-2.5 text-[13.5px] text-ink", on ? "bg-pick-wash font-semibold" : "font-medium")}>
                    {t(option.label)}
                    {on && <span className="font-bold text-emerald">✓</span>}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-170 table-fixed border-collapse">
            <thead>
              <tr className="border-y border-head-rule bg-head-wash">
                <th className={cn(TH, "pl-5 text-left")}>{t("Asset")}</th>
                <th className={cn(TH, "w-43 text-left")}>{t("Bought")}</th>
                <th className={cn(TH, "w-40.5 text-right")}>{t("Paid@@price")}</th>
                <th className={cn(TH, "w-43 text-right")}>{t("Value today")}</th>
                <th className={cn(TH, "w-35.5 text-right")}>{t("Change@@value")}</th>
                <th className="w-9 py-3 pr-5">
                  <span className="sr-only">{t("Open history")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((asset) => {
                const look = assetLook(categories, asset.category);
                const change = assetGain(asset).amount;
                const open = () => openHistory(asset);
                return (
                  <tr key={asset.id} tabIndex={0} onClick={open} onKeyDown={rowKey(open)} aria-label={t("Open value history of {name}", { name: asset.name })} className="cursor-pointer border-b border-quiet-chip hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)">
                    <td className="py-3 pr-4 pl-5">
                      <span className="flex min-w-0 items-center gap-3">
                        <AssetTile look={look} className="size-9 rounded-[10px]" glyph={18} />
                        <span className="flex min-w-0 flex-col gap-px">
                          <span title={asset.name} className="truncate text-[14px] font-semibold text-ink">
                            {asset.name}
                          </span>
                          <span className="truncate text-[12px] text-ink-muted">{t(asset.category)}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13.5px] whitespace-nowrap text-ink-2">{formatDate(asset.purchaseDate, "d MMM yyyy", fmt)}</td>
                    <td className="px-4 py-3 text-right text-[13.5px] whitespace-nowrap text-ink-soft tabular-nums">{money(Number(asset.purchasePrice))}</td>
                    <td className="px-4 py-3 text-right text-[14px] font-bold whitespace-nowrap text-ink tabular-nums">{money(Number(asset.currentValue))}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("inline-block rounded-[6px] px-2 py-0.75 text-[12.5px] font-semibold tabular-nums", change === 0 ? "bg-quiet-chip" : assetTone(change).chip, assetTone(change).ink)}>{pct(change, Number(asset.purchasePrice))}</span>
                    </td>
                    <td className="py-3 pr-5 text-right">
                      <ChevronRight className="inline size-4 align-middle text-ink-faint" aria-hidden="true" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="px-5 py-7 text-center text-[13px] text-ink-muted">{t("No active assets yet.")}</div>}
      </section>
    </PageFrame>
  );
}
