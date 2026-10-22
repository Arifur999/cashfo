"use client";

import { ArrowDownLeft, ArrowUpRight, Package, Plus } from "lucide-react";
import Link from "next/link";
import { createElement, useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import { usePageParam } from "@/hooks/usePageParam";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { assetGain, assetsSummary, categoryVisual, gainChip } from "@/lib/customer/assetDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { paginate } from "@/lib/table/paginate";
import { cn } from "@/lib/utils";
import { AssetDrawer } from "./AssetDrawer";
import { AssetTypeTile } from "./AssetTypeTile";
import { ReadOnlyNote } from "./ReadOnlyNote";
import { SellAssetDrawer } from "./SellAssetDrawer";
import { SoldAssetDrawer } from "./SoldAssetDrawer";

interface BuySellPageClientProps {
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
}

// Asset, paid, value today, the Sell button. Phones keep the asset and its
// value on one line and the button under them.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_130px_130px_92px]";
const PAGE_SIZE = 25;
const LIST_ID = "assets-to-sell";

const RESULT_BOX = { income: "bg-mint-50 text-income", expense: "bg-expense-soft text-expense", neutral: "bg-strip text-ink-2" } as const;

// Buy & sell: the two moves that touch a wallet -- buying something (the
// price leaves a wallet) and selling something owned (the price lands in
// one) -- with the last sale beside them.
export function BuySellPageClient({ businessId, assets, categories, currency, canManage }: BuySellPageClientProps) {
  const { t, locale } = useLocale();
  // Which way Add asset opens: buying now, or something already owned.
  const [adding, setAdding] = useState<"buy" | "own" | null>(null);
  const [selling, setSelling] = useState<Asset | null>(null);
  const [viewing, setViewing] = useState<Asset | null>(null);
  const { page, setPage } = usePageParam();
  const summary = assetsSummary(assets);
  const list = paginate(summary.owned, page, PAGE_SIZE);
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
            <Button onClick={() => setAdding("buy")}>
              <Plus strokeWidth={2.5} className="size-4" />
              {t("Buy asset")}
            </Button>
          )
        }
      />
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add, sell or update assets in this workspace.")}</ReadOnlyNote>}

      <div className="grid items-start gap-6 md:grid-cols-3">
        <ListCard
          id={LIST_ID}
          label={t("Sell an asset")}
          className="md:col-span-2"
          header={
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 md:px-6 md:py-5">
              <h2 className="text-title text-ink">{t("Sell an asset")}</h2>
              <span className="text-small text-ink-muted">{t("{count} you own", { count: formatCount(summary.owned.length, locale) })}</span>
            </div>
          }
          footer={
            list.totalPages > 1 && (
              <ListFooter>
                <Pagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={setPage} focusTargetId={LIST_ID} />
              </ListFooter>
            )
          }
        >
          {summary.owned.length === 0 ? (
            <ListEmpty icon={<Package />} title={t("Nothing to sell yet")} description={t("Buy or add an asset first, and it shows up here.")} action={canManage && <Button onClick={() => setAdding("buy")}>{t("Buy asset")}</Button>} />
          ) : (
            <>
              <ListHead columns={COLUMNS}>
                <ListHeadCell>{t("Asset")}</ListHeadCell>
                <ListHeadCell align="end">{t("Paid@@price")}</ListHeadCell>
                <ListHeadCell align="end">{t("Value today")}</ListHeadCell>
                <ListHeadCell>
                  <span className="sr-only">{t("Actions")}</span>
                </ListHeadCell>
              </ListHead>
              {list.rows.map((asset) => (
                <ListRow key={asset.id} columns={COLUMNS}>
                  <ListCell className="flex min-w-0 items-center gap-3">
                    <AssetTypeTile visual={categoryVisual(categories, asset.category)} />
                    <span className="flex min-w-0 flex-col gap-px">
                      <span className="truncate font-medium text-ink">{asset.name}</span>
                      <span className="truncate text-caption font-normal text-ink-muted">
                        {t(asset.category)} · {t("Bought {month}", { month: formatDate(asset.purchaseDate, "MMM yyyy", locale) })}
                      </span>
                    </span>
                  </ListCell>
                  <ListCell align="end" className="hidden text-ink-2 tabular-nums md:block">
                    {formatCurrency(asset.purchasePrice, currency)}
                  </ListCell>
                  <ListCell align="end" className="font-semibold text-ink tabular-nums">
                    {formatCurrency(asset.currentValue, currency)}
                  </ListCell>
                  {canManage ? (
                    <ListRowActions className="col-span-2 md:col-span-1">
                      <Button variant="secondary" size="sm" onClick={() => setSelling(asset)} aria-label={t("Sell {name}", { name: asset.name })} className="px-4 pointer-coarse:h-11">
                        {t("Sell")}
                      </Button>
                    </ListRowActions>
                  ) : (
                    <ListCell className="hidden md:block" />
                  )}
                </ListRow>
              ))}
            </>
          )}
        </ListCard>

        <div className="flex flex-col gap-6">
          {lastSold && lastGain && lastChip && (
            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-title text-ink">{t("Recently sold")}</h2>
                <Link href="/assets-management/dashboard?status=sold" className="text-small font-semibold text-emerald hover:text-emerald-hover">
                  {t("All sold")}
                </Link>
              </div>
              <div className="relative flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">{createElement(categoryVisual(categories, lastSold.category).icon, { className: "size-4.5", "aria-hidden": true })}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  {/* The whole line opens the sale. */}
                  <button type="button" onClick={() => setViewing(lastSold)} aria-label={t("Open {name}", { name: lastSold.name })} className="truncate text-left text-body font-medium text-ink after:absolute after:inset-0 after:rounded-md hover:underline">
                    {lastSold.name}
                  </button>
                  <span className="text-caption font-normal text-ink-muted">{lastSold.soldAt ? t("Sold {date}", { date: formatDate(lastSold.soldAt, "d MMM yyyy", locale) }) : t("Sold")}</span>
                </span>
                <span className="text-body font-semibold text-ink tabular-nums">{formatCurrency(lastSold.soldPrice ?? 0, currency)}</span>
              </div>
              <div className={cn("flex items-center justify-between gap-3 rounded-md p-3 text-caption", RESULT_BOX[lastChip.tone])}>
                <span className="font-normal">{t("Paid {amount} in {month}", { amount: formatCurrency(lastSold.purchasePrice, currency), month: formatDate(lastSold.purchaseDate, "MMM yyyy", locale) })}</span>
                <span className="font-semibold whitespace-nowrap tabular-nums">
                  {formatSignedCurrency(lastGain.amount, currency)} ({lastChip.label})
                </span>
              </div>
            </Card>
          )}

          <Card className="flex flex-col gap-4">
            <h2 className="text-title text-ink">{t("Where the money goes")}</h2>
            <Explainer icon={<ArrowUpRight />} tone="bg-expense-soft text-expense" title={t("Buy")} text={t("The price leaves the wallet you pick, and the asset joins your list.")} />
            <Explainer icon={<ArrowDownLeft />} tone="bg-mint-50 text-emerald" title={t("Sell")} text={t("The full sale price is recorded as income in the wallet you pick.")} />
            <Explainer
              icon={<Package />}
              tone="bg-surface-sunken text-ink-2"
              title={t("Already own it?")}
              text={fillNodes(t("Add it from {myAssets}. No money moves."), {
                myAssets: (
                  <Link href="/assets-management/current" className="font-semibold text-emerald hover:text-emerald-hover">
                    {t("My assets")}
                  </Link>
                ),
              })}
              action={
                canManage && (
                  <button type="button" onClick={() => setAdding("own")} className="mt-1 self-start text-small font-semibold text-emerald hover:text-emerald-hover hover:underline pointer-coarse:min-h-11">
                    {t("Add what you own")}
                  </button>
                )
              }
            />
          </Card>
        </div>
      </div>

      <AssetDrawer open={adding !== null} onClose={() => setAdding(null)} businessId={businessId} categories={categories} totalValue={summary.totalValue} currency={currency} initialMode={adding ?? "buy"} />
      <SellAssetDrawer open={selling !== null} onClose={() => setSelling(null)} businessId={businessId} asset={selling} categories={categories} currency={currency} />
      <SoldAssetDrawer open={viewing !== null} onClose={() => setViewing(null)} businessId={businessId} asset={viewing} categories={categories} currency={currency} canManage={canManage} />
    </PageFrame>
  );
}

function Explainer({ icon, tone, title, text, action }: { icon: React.ReactNode; tone: string; title: string; text: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", tone)}>{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className="text-body font-semibold text-ink">{title}</span>
        <span className="text-small leading-relaxed text-ink-muted">{text}</span>
        {action}
      </span>
    </div>
  );
}
