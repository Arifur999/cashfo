"use client";

import { Clock, Eye, Package, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import IconAction from "@/components/smartly/IconAction";
import PageFrame from "@/components/smartly/PageFrame";
import Pagination from "@/components/smartly/Pagination";
import { usePageParam } from "@/hooks/usePageParam";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { assetGain, assetWorth, categoryVisual, gainChip, isStale, lastValued } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { paginate } from "@/lib/table/paginate";
import { cn } from "@/lib/utils";
import { AssetDrawer } from "./AssetDrawer";
import { AssetStatementDialog } from "./AssetStatementDialog";
import { AssetTypeTile } from "./AssetTypeTile";
import { ReadOnlyNote } from "./ReadOnlyNote";
import { UpdateValueDrawer } from "./UpdateValueDrawer";

interface UpdateValuePageClientProps {
  businessId: string;
  // Owned and sold, newest bought first.
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
  today: string;
}

type Tab = "active" | "sold";

// The board's table: #, Asset, Paid, Current value, Last updated, vs paid,
// Action.
const COLUMNS = "md:grid-cols-[36px_minmax(0,1fr)_120px_130px_150px_120px_180px]";
const PAGE_SIZE = 25;
const LIST_ID = "assets-to-update";

// Update asset values: every owned asset with what was paid, its value now,
// when it was last checked and how far it is from the price, to record a new
// value or read its value history; the Sold tab keeps the sold ones' history
// in reach. One not checked for six months says "Update due".
export function UpdateValuePageClient({ businessId, assets, categories, currency, canManage, today }: UpdateValuePageClientProps) {
  const { t, fmt } = useLocale();
  const [tab, setTab] = useState<Tab>("active");
  const [onlyStale, setOnlyStale] = useState(false);
  const [search, setSearch] = useState("");
  const [valuing, setValuing] = useState<Asset | null>(null);
  const [reading, setReading] = useState<Asset | null>(null);
  const [adding, setAdding] = useState(false);
  const { page, setPage } = usePageParam();
  const owned = assets.filter((asset) => asset.status === "ACTIVE");
  const sold = assets.filter((asset) => asset.status === "SOLD").sort((a, b) => (b.soldAt ?? "").localeCompare(a.soldAt ?? ""));
  const stale = owned.filter((asset) => isStale(asset, today));
  // The filter holds only while something is out of date: once the last one
  // is updated, the banner (and its toggle) go and the whole list is back.
  const filtering = tab === "active" && onlyStale && stale.length > 0;
  const q = search.trim().toLowerCase();
  const base = tab === "sold" ? sold : filtering ? stale : owned;
  const matching = base.filter((asset) => !q || [asset.name, asset.category, t(asset.category), asset.notes ?? ""].some((text) => text.toLowerCase().includes(q)));
  const list = paginate(matching, page, PAGE_SIZE);
  const total = owned.reduce((sum, asset) => sum + Number(asset.currentValue), 0);
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const day = (value: string) => formatDate(value, "d MMM yyyy", fmt);

  function pickTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  function toggleStale() {
    setOnlyStale(!filtering);
    setTab("active");
    setPage(1);
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: "active", label: `${t("Active")} · ${formatCount(owned.length, fmt)}` },
    { value: "sold", label: `${t("Sold")} · ${formatCount(sold.length, fmt)}` },
  ];

  return (
    <PageFrame className="leading-[normal]">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="text-page-title text-ink">{t("Update asset values")}</h1>
        {owned.length > 0 && (
          <span className="text-[14px] text-ink-muted">
            {t("Total value today")} <span className="font-bold text-ink tabular-nums">{money(total)}</span>
          </span>
        )}
      </div>
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add, sell or update assets in this workspace.")}</ReadOnlyNote>}

      {stale.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-warning-line bg-warning-50 px-4 py-3.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-warning-soft text-warning">
            <Clock className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-body text-warning-ink">
            <b className="font-semibold">{t(stale.length === 1 ? "{count} asset hasn't been checked in over 6 months." : "{count} assets haven't been checked in over 6 months.", { count: formatCount(stale.length, fmt) })}</b>{" "}
            {t(stale.length === 1 ? "Its value may be out of date." : "Their values may be out of date.")}
          </span>
          {/* Everyone can list which ones; only the rows' Update buttons
              stay with those who can change them. */}
          <Button variant="secondary" size="sm" onClick={toggleStale} className="h-8.5 border-warning-fill/60 px-3 text-small text-warning-ink hover:bg-warning-soft max-md:basis-full pointer-coarse:h-11">
            {filtering ? t("Show all") : t(stale.length === 1 ? "Show it" : "Show them")}
          </Button>
        </div>
      )}

      <Card id={LIST_ID} padding="none" className="scroll-mt-4 overflow-hidden rounded-[18px]" role="region" aria-label={t("Your assets")}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <Input
            size="sm"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            leading={<Search />}
            placeholder={t("Search by name, category or note")}
            aria-label={t("Search by name, category or note")}
            frameClassName="h-11 min-w-0 flex-1 basis-60 rounded-[10px]"
          />
          <div role="tablist" aria-label={t("Show active or sold assets")} className="flex shrink-0 gap-1 rounded-[12px] bg-surface-sunken p-1">
            {tabs.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={tab === option.value}
                aria-controls={`${LIST_ID}-rows`}
                onClick={() => pickTab(option.value)}
                className={cn("h-9 rounded-[9px] px-3.5 text-[13px] font-semibold whitespace-nowrap tabular-nums", tab === option.value ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.10)] dark:bg-surface-raised" : "text-ink-muted hover:text-ink")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className={cn("hidden items-center gap-x-3.5 border-y border-line bg-table-head px-6 py-2.5 text-caption font-semibold text-ink-muted md:grid", COLUMNS)}>
          <span>#</span>
          <span>{t("Asset")}</span>
          <span className="text-right">{t("Paid@@price")}</span>
          <span className="text-right">{t(tab === "sold" ? "Sold for" : "Current value")}</span>
          <span>{t(tab === "sold" ? "Sold on" : "Last updated")}</span>
          <span className="text-right">{t("vs paid")}</span>
          <span className="text-right">{t("Action")}</span>
        </div>
        <div id={`${LIST_ID}-rows`}>
          {list.rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-11 text-center">
              <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-[14px] bg-surface-sunken text-ink-muted">
                {q ? <Search className="size-5.5" /> : <Package className="size-5.5" />}
              </span>
              <span className="text-[15px] font-semibold wrap-anywhere text-ink">{q ? t("No assets match “{q}”", { q: search.trim() }) : t(tab === "sold" ? "No sold assets" : "No active assets yet")}</span>
              <span className="max-w-105 text-[13px] text-ink-muted">
                {q ? t("Try another name, category or note.") : t(tab === "sold" ? "Assets you sell from Purchase & Sell show up here with their full value history." : "Add what you own first, then keep its value up to date here.")}
              </span>
              {q ? (
                <Button variant="secondary" onClick={() => setSearch("")} className="mt-1 h-10 rounded-full px-4 text-[13px]">
                  {t("Clear search")}
                </Button>
              ) : (
                tab === "active" &&
                canManage && (
                  <Button onClick={() => setAdding(true)} className="mt-1 h-10 rounded-full px-4 text-[13px]">
                    {t("Add asset")}
                  </Button>
                )
              )}
            </div>
          ) : (
            <ul>
              {list.rows.map((asset, index) => {
                const isSold = asset.status === "SOLD";
                const gain = assetGain(asset);
                const tone = gainChip(gain.percent).tone;
                const toneText = tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-ink-soft";
                const last = lastValued(asset);
                const due = isStale(asset, today);
                return (
                  <li key={asset.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 border-b border-divider px-4 py-3 text-[14px] tabular-nums last:border-b-0 md:min-h-17 md:px-6", COLUMNS)}>
                    <span className="text-[13px] text-ink-muted max-md:hidden">{formatCount((list.page - 1) * PAGE_SIZE + index + 1, fmt)}</span>
                    <span className="flex min-w-0 items-center gap-3">
                      <AssetTypeTile visual={categoryVisual(categories, asset.category)} className="size-9.5 rounded-[10px]" />
                      <span className="flex min-w-0 flex-col gap-px">
                        <span title={asset.name} className="truncate font-medium text-ink">
                          {asset.name}
                        </span>
                        <span className="truncate text-[12px] text-ink-muted">{t(asset.category)}</span>
                      </span>
                    </span>
                    <span className="text-right whitespace-nowrap text-ink-soft max-md:hidden">{money(asset.purchasePrice)}</span>
                    <span className="text-right font-bold whitespace-nowrap text-ink">{money(assetWorth(asset))}</span>
                    {/* Out of date says so in words, not colour alone. */}
                    <span className="flex min-w-0 flex-col items-start gap-0.75 max-md:col-start-1">
                      <span className={cn("text-[13px] whitespace-nowrap", isSold || last ? "text-ink-2" : "text-ink-muted")}>
                        {isSold && asset.soldAt ? day(asset.soldAt) : last ? t("Updated {date}", { date: day(last) }) : t("No updates yet")}
                      </span>
                      {due && (
                        <span title={t("Last value is more than 6 months old")} className="rounded-full bg-warning-soft px-2 py-px text-[11px] font-semibold whitespace-nowrap text-warning-ink">
                          {t("Update due")}
                        </span>
                      )}
                    </span>
                    <span className={cn("flex flex-col items-end gap-px max-md:hidden", toneText)}>
                      <span className="text-[13px] font-semibold whitespace-nowrap">{`${gain.amount > 0 ? "+ " : gain.amount < 0 ? "− " : ""}${money(Math.abs(gain.amount))}`}</span>
                      <span className="text-[12px]">{toLocaleDigits(gainChip(gain.percent).label, fmt)}</span>
                    </span>
                    <span className="flex items-center justify-end gap-1.5 max-md:col-start-2 max-md:row-start-2">
                      {isSold ? (
                        <span className="rounded-full bg-surface-sunken px-2.5 py-0.75 text-[12px] font-semibold whitespace-nowrap text-ink-soft">{t("Sold")}</span>
                      ) : (
                        canManage && (
                          <Button variant="secondary" onClick={() => setValuing(asset)} aria-label={t("Update value of {name}", { name: asset.name })} className="h-11 gap-1.5 rounded-full px-3.5 text-[13px] font-semibold">
                            <TrendingUp className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
                            {t("Update value@@action")}
                          </Button>
                        )
                      )}
                      <IconAction onClick={() => setReading(asset)} aria-label={t("Value history of {name}", { name: asset.name })} title={t("Value history")}>
                        <Eye aria-hidden="true" />
                      </IconAction>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {list.totalPages > 1 && (
          <div className="border-t border-divider px-5 py-3">
            <Pagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={setPage} focusTargetId={LIST_ID} />
          </div>
        )}
      </Card>

      <UpdateValueDrawer open={valuing !== null} onClose={() => setValuing(null)} businessId={businessId} asset={valuing} categories={categories} currency={currency} />
      <AssetStatementDialog open={reading !== null} onClose={() => setReading(null)} asset={reading && (assets.find((asset) => asset.id === reading.id) ?? reading)} categories={categories} currency={currency} businessId={businessId} canManage={canManage} />
      <AssetDrawer open={adding} onClose={() => setAdding(false)} businessId={businessId} categories={categories} currency={currency} variant="add" />
    </PageFrame>
  );
}
