"use client";

import { Package, Pencil, TriangleAlert } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import { ListCard, ListCell, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import { usePageParam } from "@/hooks/usePageParam";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { assetGain, categoryVisual, gainChip, isStale, lastValued, updateCount } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { paginate } from "@/lib/table/paginate";
import { cn } from "@/lib/utils";
import { AssetDrawer } from "./AssetDrawer";
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

// Asset, paid, value today, last updated, vs paid, the button. Phones keep
// the asset and its value on one line, the check and the button under them.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_130px_140px_170px_100px_132px]";
const PAGE_SIZE = 25;
const LIST_ID = "assets-to-update";

// Update value: every owned asset with when it was last checked, so the
// ones that have gone unvalued for months stand out.
export function UpdateValuePageClient({ businessId, assets, categories, currency, canManage, today }: UpdateValuePageClientProps) {
  const { t, locale } = useLocale();
  const [onlyStale, setOnlyStale] = useState(false);
  const [valuing, setValuing] = useState<Asset | null>(null);
  const [adding, setAdding] = useState(false);
  const { page, setPage } = usePageParam();
  const stale = assets.filter((asset) => isStale(asset, today));
  // The filter holds only while something is out of date: once the last one
  // is updated, the banner (and its toggle) go and the whole list is back.
  const filtering = onlyStale && stale.length > 0;
  const list = paginate(filtering ? stale : assets, page, PAGE_SIZE);
  const total = assets.reduce((sum, asset) => sum + Number(asset.currentValue), 0);

  function toggleStale() {
    setOnlyStale(!filtering);
    setPage(1);
  }

  return (
    <PageFrame className="gap-5">
      <PageHeader eyebrow={`${t("Money")} · ${t("Assets")}`} title={t("Update value")} description={t("When the market price of something you own goes up or down, record the new value here.")} />
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add, sell or update assets in this workspace.")}</ReadOnlyNote>}

      {stale.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4 md:flex-row md:items-center">
          <span className="flex size-8 shrink-0 items-center justify-center text-warning">
            <TriangleAlert className="size-4.5" aria-hidden="true" />
          </span>
          <span className="flex-1 text-body text-warning">
            <b className="font-semibold">{t(stale.length === 1 ? "{count} asset hasn't been checked in over 6 months." : "{count} assets haven't been checked in over 6 months.", { count: formatCount(stale.length, locale) })}</b>{" "}
            {t(stale.length === 1 ? "Its value may be out of date." : "Their values may be out of date.")}
          </span>
          {/* Everyone can list which ones; only the rows' Update buttons
              stay with those who can change them. The label says what a
              press does, so it is a plain button, not a toggle. */}
          <Button variant="secondary" size="sm" onClick={toggleStale} className="border-warning/50 px-3 text-small text-warning hover:bg-warning-soft pointer-coarse:h-11">
            {filtering ? t("Show all") : t(stale.length === 1 ? "Show it" : "Show them")}
          </Button>
        </div>
      )}

      {assets.length === 0 ? (
        <EmptyState icon={<Package />} title={t("Nothing owned yet")} description={t("Add what you own first, then keep its value up to date here.")} action={canManage && <Button onClick={() => setAdding(true)}>{t("Add asset")}</Button>} className="min-h-80" />
      ) : (
        <ListCard
          id={LIST_ID}
          label={t("Update value")}
          footer={
            list.totalPages > 1 && (
              <ListFooter>
                <Pagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={setPage} focusTargetId={LIST_ID} />
              </ListFooter>
            )
          }
        >
          <ListHead columns={COLUMNS}>
            <ListHeadCell>{t("Asset")}</ListHeadCell>
            <ListHeadCell align="end">{t("Paid@@price")}</ListHeadCell>
            <ListHeadCell align="end">{t("Value today")}</ListHeadCell>
            <ListHeadCell>{t("Last updated")}</ListHeadCell>
            <ListHeadCell align="end">{t("vs paid")}</ListHeadCell>
            <ListHeadCell>
              <span className="sr-only">{t("Actions")}</span>
            </ListHeadCell>
          </ListHead>
          {list.rows.map((asset) => {
            const chip = gainChip(assetGain(asset).percent);
            const last = lastValued(asset);
            const updates = updateCount(asset);
            const old = isStale(asset, today);
            return (
              <ListRow key={asset.id} columns={COLUMNS} density="relaxed">
                <ListCell className="flex min-w-0 items-center gap-3">
                  <AssetTypeTile visual={categoryVisual(categories, asset.category)} />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate font-medium text-ink">{asset.name}</span>
                    <span className="truncate text-caption font-normal text-ink-muted">{t(asset.category)}</span>
                  </span>
                </ListCell>
                <ListCell align="end" className="hidden text-ink-2 tabular-nums md:block">
                  {formatCurrency(asset.purchasePrice, currency)}
                </ListCell>
                <ListCell align="end" className="font-semibold text-ink tabular-nums">
                  {formatCurrency(asset.currentValue, currency)}
                </ListCell>
                <ListCell className="col-span-2 flex flex-col gap-0.5 md:col-span-1">
                  {/* Out of date shows as an icon and words, not colour alone. */}
                  <span className={cn("flex items-center gap-1.5 text-small", old ? "font-semibold text-warning" : "text-ink-2")}>
                    {old && <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />}
                    {last ? formatDate(last, "d MMM yyyy", locale) : t("Not checked since bought")}
                    {old && <span className="sr-only">({t("Not checked in over 6 months")})</span>}
                  </span>
                  {last && <span className="text-caption font-normal text-ink-muted">{t(updates === 1 ? "{count} update" : "{count} updates", { count: formatCount(updates, locale) })}</span>}
                </ListCell>
                <ListCell align="end" className="hidden md:block">
                  <Chip tone={chip.tone} size="sm" className="font-semibold">
                    {chip.label}
                  </Chip>
                </ListCell>
                {canManage ? (
                  <ListRowActions className="col-span-2 md:col-span-1">
                    <Button variant="secondary" size="sm" onClick={() => setValuing(asset)} aria-label={t("Update value of {name}", { name: asset.name })} className={cn("px-3 text-small pointer-coarse:h-11", old && "border-warning/50 text-warning hover:bg-warning-soft")}>
                      <Pencil className="size-3.5" />
                      {t("Update value@@action")}
                    </Button>
                  </ListRowActions>
                ) : (
                  <ListCell className="hidden md:block" />
                )}
              </ListRow>
            );
          })}
        </ListCard>
      )}

      <UpdateValueDrawer open={valuing !== null} onClose={() => setValuing(null)} businessId={businessId} asset={valuing} categories={categories} currency={currency} />
      <AssetDrawer open={adding} onClose={() => setAdding(false)} businessId={businessId} categories={categories} totalValue={total} currency={currency} initialMode="own" />
    </PageFrame>
  );
}
