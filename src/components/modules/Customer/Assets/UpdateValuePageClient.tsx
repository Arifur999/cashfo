"use client";

import { Clock, FileText, Package, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import { usePageParam } from "@/hooks/usePageParam";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { assetGain, categoryVisual, gainChip, isStale, lastValued } from "@/lib/customer/assetDisplay";
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
  // Owned assets only.
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
  today: string;
}

// The board's table: #, Asset, Paid, Current value, Last updated, vs paid,
// Action.
const COLUMNS = "md:grid-cols-[40px_minmax(0,1fr)_130px_140px_160px_150px_196px]";
const PAGE_SIZE = 25;
const LIST_ID = "assets-to-update";

// Update asset values: every owned asset with what was paid, its value now,
// when it was last checked and how far it is from the price, to record a new
// value or read its value statement. The ones unchecked for months stand out.
export function UpdateValuePageClient({ businessId, assets, categories, currency, canManage, today }: UpdateValuePageClientProps) {
  const { t, fmt } = useLocale();
  const [onlyStale, setOnlyStale] = useState(false);
  const [search, setSearch] = useState("");
  const [valuing, setValuing] = useState<Asset | null>(null);
  const [reading, setReading] = useState<Asset | null>(null);
  const [adding, setAdding] = useState(false);
  const { page, setPage } = usePageParam();
  const stale = assets.filter((asset) => isStale(asset, today));
  // The filter holds only while something is out of date: once the last one
  // is updated, the banner (and its toggle) go and the whole list is back.
  const filtering = onlyStale && stale.length > 0;
  // The ones that need a check come first, the rest in their own order.
  const ordered = [...stale, ...assets.filter((asset) => !stale.includes(asset))];
  const q = search.trim().toLowerCase();
  const matching = (filtering ? stale : ordered).filter((asset) => !q || [asset.name, asset.category, t(asset.category), asset.notes ?? ""].some((text) => text.toLowerCase().includes(q)));
  const list = paginate(matching, page, PAGE_SIZE);
  const total = assets.reduce((sum, asset) => sum + Number(asset.currentValue), 0);

  function toggleStale() {
    setOnlyStale(!filtering);
    setPage(1);
  }

  return (
    <PageFrame>
      <PageHeader
        title={t("Update asset values")}
        actions={
          assets.length > 0 && (
            <span className="flex flex-col items-end gap-0.5">
              <span className="text-caption text-ink-muted">{t("Total value today")}</span>
              <span className="text-[20px] leading-tight font-bold text-ink tabular-nums">{formatCurrency(total, currency, fmt)}</span>
            </span>
          )
        }
      />
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

      {assets.length === 0 ? (
        <EmptyState icon={<Package />} title={t("Nothing owned yet")} description={t("Add what you own first, then keep its value up to date here.")} action={canManage && <Button onClick={() => setAdding(true)}>{t("Add asset")}</Button>} className="min-h-80" />
      ) : (
        <Card id={LIST_ID} padding="none" className="scroll-mt-4 overflow-hidden" role="region" aria-label={t("Active assets")}>
          <div className="border-b border-divider p-3">
            <Input
              size="sm"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              leading={<Search />}
              placeholder={t("Search assets…")}
              aria-label={t("Search assets")}
              frameClassName="h-10"
            />
          </div>
          <div className={cn("hidden items-center gap-x-4 border-b border-divider bg-table-head px-5 py-2.5 text-caption font-semibold text-ink-muted md:grid", COLUMNS)}>
            <span>#</span>
            <span>{t("Asset")}</span>
            <span className="text-right">{t("Paid@@price")}</span>
            <span className="text-right">{t("Current value")}</span>
            <span>{t("Last updated")}</span>
            <span className="text-right">{t("vs paid")}</span>
            <span className="text-right">{t("Action")}</span>
          </div>
          {list.rows.length === 0 ? (
            <p className="px-6 py-10 text-center text-small text-ink-muted">{t("No asset matches")}</p>
          ) : (
            <ul>
              {list.rows.map((asset, index) => {
                const gain = assetGain(asset);
                const chip = gainChip(gain.percent);
                const last = lastValued(asset);
                const old = isStale(asset, today);
                return (
                  <li key={asset.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-divider px-5 py-3 last:border-b-0 md:min-h-17", COLUMNS)}>
                    <span className="text-small text-ink-muted tabular-nums max-md:hidden">{formatCount((list.page - 1) * PAGE_SIZE + index + 1, fmt)}</span>
                    <span className="flex min-w-0 items-center gap-3">
                      <AssetTypeTile visual={categoryVisual(categories, asset.category)} />
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className="truncate font-semibold text-ink">{asset.name}</span>
                        <span className="truncate text-caption font-normal text-ink-muted">{t(asset.category)}</span>
                      </span>
                    </span>
                    <span className="text-right text-small text-ink-soft tabular-nums max-md:hidden">{formatCurrency(asset.purchasePrice, currency, fmt)}</span>
                    <span className="text-right font-semibold text-ink tabular-nums">{formatCurrency(asset.currentValue, currency, fmt)}</span>
                    {/* Out of date says so in words, not colour alone. */}
                    <span className="flex flex-col gap-0.5 max-md:col-start-1">
                      {old ? (
                        <>
                          <span className="text-small font-semibold text-warning">{t("Needs a check")}</span>
                          <span className="text-caption font-normal text-ink-muted">{last ? t("Not updated since {month}", { month: formatDate(last, "MMM yyyy", fmt) }) : t("Not checked since bought")}</span>
                        </>
                      ) : last ? (
                        <span className="text-small text-ink-2">{t("Updated {date}", { date: formatDate(last, "d MMM yyyy", fmt) })}</span>
                      ) : (
                        <span className="text-small font-semibold text-warning">{t("Not updated yet")}</span>
                      )}
                    </span>
                    <span className={cn("text-right text-small font-semibold whitespace-nowrap tabular-nums max-md:hidden", chip.tone === "income" ? "text-income" : chip.tone === "expense" ? "text-expense" : "text-ink-2")}>
                      {gain.amount === 0 ? "—" : `${gain.amount > 0 ? "+" : "−"} ${formatCurrency(Math.abs(gain.amount), currency, fmt)} · ${toLocaleDigits(chip.label, fmt)}`}
                    </span>
                    <span className="flex items-center justify-end gap-1 max-md:col-start-2 max-md:row-start-2">
                      {canManage && (
                        // The one that needs a check gets the filled button.
                        <Button variant={old ? "primary" : "secondary"} size="sm" onClick={() => setValuing(asset)} aria-label={t("Update value of {name}", { name: asset.name })} className="h-9 gap-1.5 rounded-full px-3.5 text-small pointer-coarse:h-11">
                          <TrendingUp className="size-3.5" strokeWidth={2.25} />
                          {t("Update value@@action")}
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => setReading(asset)}
                        aria-label={t("Value history of {name}", { name: asset.name })}
                        title={t("Value history")}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-sunken"
                      >
                        <FileText className="size-4.25" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {list.totalPages > 1 && (
            <div className="border-t border-divider px-5 py-3">
              <Pagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={setPage} focusTargetId={LIST_ID} />
            </div>
          )}
        </Card>
      )}

      <UpdateValueDrawer open={valuing !== null} onClose={() => setValuing(null)} businessId={businessId} asset={valuing} categories={categories} currency={currency} />
      <AssetStatementDialog open={reading !== null} onClose={() => setReading(null)} asset={reading} categories={categories} currency={currency} />
      <AssetDrawer open={adding} onClose={() => setAdding(false)} businessId={businessId} categories={categories} totalValue={total} currency={currency} variant="add" />
    </PageFrame>
  );
}
