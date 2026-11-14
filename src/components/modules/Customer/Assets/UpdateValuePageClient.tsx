"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import IconAction from "@/components/smartly/IconAction";
import PageFrame from "@/components/smartly/PageFrame";
import type { Account, Asset, AssetCategoryOption } from "@/lib/customer/api";
import { assetGain, assetWorth, isStale, updateCount } from "@/lib/customer/assetDisplay";
import { lastValueDay } from "@/lib/customer/assetForm";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetStatementDialog } from "./AssetStatementDialog";
import { assetLook, AssetTile, assetTone, changePercent } from "./assetLook";
import { UpdateValueDialog } from "./UpdateValueDialog";

interface UpdateValuePageClientProps {
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  wallets: Account[];
  currency: string;
  canManage: boolean;
  today: string;
}

type Tab = "active" | "sold";
const COLUMNS = "grid-cols-[36px_minmax(0,1fr)_120px_130px_150px_120px_180px]";

// Update asset values: every active asset (or every sold one) with what
// was paid, its value now, when it was last updated (and whether that is
// over six months ago), and the change against the price. Update value
// opens the update; the eye opens the value statement (also reached with
// ?history=<id> from the Dashboard).
export function UpdateValuePageClient({ businessId, assets, categories, wallets, currency, canManage, today }: UpdateValuePageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => (assets.find((asset) => asset.id === searchParams.get("history"))?.status === "SOLD" ? "sold" : "active"));
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(searchParams.get("history"));

  const owned = assets.filter((asset) => asset.status === "ACTIVE").sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  const sold = assets.filter((asset) => asset.status === "SOLD").sort((a, b) => (b.soldAt ?? "").localeCompare(a.soldAt ?? ""));
  const q = search.trim().toLowerCase();
  const rows = (tab === "sold" ? sold : owned).filter((asset) => !q || [asset.name, asset.notes ?? "", asset.category, t(asset.category)].some((text) => text.toLowerCase().includes(q)));
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const day = (iso: string) => formatDate(`${iso.slice(0, 10)}T00:00:00.000Z`, "d MMM yyyy", fmt);
  const total = owned.reduce((sum, asset) => sum + Number(asset.currentValue), 0);
  // The open popups read the asset as the page last loaded it.
  const updating = assets.find((asset) => asset.id === updatingId && asset.status === "ACTIVE") ?? null;
  const history = assets.find((asset) => asset.id === historyId) ?? null;
  const refresh = () => router.refresh();

  return (
    <PageFrame className="leading-[normal]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Update asset values")}</h1>
        <span className="text-[14px] text-ink-muted">
          {t("Total value today")} <span className="font-bold text-ink tabular-nums">{money(total)}</span>
        </span>
      </div>

      <section aria-label={t("Your assets")} className="overflow-hidden rounded-[18px] border border-line-card bg-surface shadow-card">
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 max-md:px-4">
          <div className="relative min-w-0 flex-1 max-md:basis-full">
            <Search className="absolute top-3.5 left-3 size-4 text-ink-muted" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={t("Search by name, category or note")}
              placeholder={t("Search by name, category or note")}
              className="h-11 w-full rounded-[10px] border border-input bg-surface pr-3 pl-9 text-[14px] text-ink outline-none focus:border-emerald focus:shadow-[0_0_0_3px_rgba(28,117,103,0.15)]"
            />
          </div>
          <div role="tablist" aria-label={t("Show active or sold assets")} className="flex shrink-0 gap-1 rounded-[12px] bg-quiet-chip p-1">
            {(["active", "sold"] as const).map((value) => {
              const on = tab === value;
              return (
                <button key={value} type="button" role="tab" aria-selected={on} onClick={() => setTab(value)} className={cn("h-9 rounded-[9px] px-3.5 text-[13px] font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-(--focus-ring)", on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.10)]" : "text-ink-muted hover:text-ink")}>
                  {`${t(value === "active" ? "Active" : "Sold")} · ${formatCount(value === "active" ? owned.length : sold.length, fmt)}`}
                </button>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className={cn("grid min-w-245 items-center gap-x-3.5 border-y border-line bg-strip px-6 py-2.5 text-[12px] font-semibold text-ink-muted", COLUMNS)}>
            <span>#</span>
            <span>{t("Asset")}</span>
            <span className="text-right">{t("Paid@@price")}</span>
            <span className="text-right">{t(tab === "sold" ? "Sold for" : "Current value")}</span>
            <span>{t(tab === "sold" ? "Sold on" : "Last updated")}</span>
            <span className="text-right">{t("vs paid")}</span>
            <span className="text-right">{t("Action")}</span>
          </div>
          {rows.map((asset, index) => {
            const isSold = asset.status === "SOLD";
            const look = assetLook(categories, asset.category);
            const gain = assetGain(asset).amount;
            const tone = assetTone(gain);
            const updates = updateCount(asset);
            return (
              <div key={asset.id} className={cn("grid min-h-17.25 min-w-245 items-center gap-x-3.5 border-b border-quiet-chip px-6 text-[14px] tabular-nums last:border-b-0 hover:bg-hover", COLUMNS)}>
                <span className="text-[13px] text-ink-muted">{formatCount(index + 1, fmt)}</span>
                <span className="flex min-w-0 items-center gap-3">
                  <AssetTile look={look} className="size-9.5 rounded-[10px]" glyph={18} />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span title={asset.name} className="truncate font-medium text-ink">
                      {asset.name}
                    </span>
                    <span className="truncate text-[12px] text-ink-muted">{t(asset.category)}</span>
                  </span>
                </span>
                <span className="text-right whitespace-nowrap text-ink-soft">{money(asset.purchasePrice)}</span>
                <span className="text-right font-bold whitespace-nowrap text-ink">{money(assetWorth(asset))}</span>
                <span className="flex min-w-0 flex-col items-start gap-0.75">
                  <span className={cn("text-[13px] whitespace-nowrap", isSold || updates ? "text-ink-2" : "text-ink-muted")}>{isSold ? day(asset.soldAt ?? asset.purchaseDate) : updates ? t("Updated {date}", { date: day(lastValueDay(asset)) }) : t("No updates yet")}</span>
                  {isStale(asset, today) && (
                    <span title={t("Last value is more than 6 months old")} className="rounded-full bg-warning-soft px-2 py-px text-[11px] font-semibold whitespace-nowrap text-due-ink">
                      {t("Update due")}
                    </span>
                  )}
                </span>
                <span className="flex flex-col items-end gap-px">
                  <span className={cn("text-[13px] font-semibold whitespace-nowrap", tone.ink)}>{formatSignedCurrency(gain, currency, fmt)}</span>
                  <span className={cn("text-[12px]", tone.ink)}>{toLocaleDigits(changePercent(gain, Number(asset.purchasePrice)), fmt)}</span>
                </span>
                <span className="flex items-center justify-end gap-1.5">
                  {!isSold && canManage && (
                    <button type="button" onClick={() => setUpdatingId(asset.id)} aria-label={t("Update value of {name}", { name: asset.name })} className="flex h-11 items-center gap-1.5 rounded-full border border-input bg-surface px-3.5 text-[13px] font-semibold whitespace-nowrap text-ink hover:border-mint-200 hover:bg-emerald-soft">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-2">
                        <path d="M16 7h6v6" />
                        <path d="m22 7-8.5 8.5-5-5L2 17" />
                      </svg>
                      {t("Update value")}
                    </button>
                  )}
                  {isSold && <span className="rounded-full bg-quiet-chip px-2.5 py-0.75 text-[12px] font-semibold whitespace-nowrap text-ink-soft">{t("Sold")}</span>}
                  <IconAction onClick={() => setHistoryId(asset.id)} aria-label={t("Value history of {name}", { name: asset.name })} title={t("Value history")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </IconAction>
                </span>
              </div>
            );
          })}
        </div>
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-11 text-center">
            <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-[14px] bg-quiet-chip text-ink-muted">
              <Search className="size-5.5" />
            </span>
            <span className="text-[15px] font-semibold text-ink">{q ? t("No assets match “{q}”", { q: search.trim() }) : t(tab === "sold" ? "No sold assets" : "No active assets yet")}</span>
            <span className="max-w-105 text-[13px] text-ink-muted">
              {q ? t("Try another name, category or note.") : t(tab === "sold" ? "Assets you sell from Purchase & Sell show up here with their full value history." : "Add an asset you bought or already own, then keep its value up to date here.")}
            </span>
            {q ? (
              <button type="button" onClick={() => setSearch("")} className="mt-1 h-10 rounded-full border border-input bg-surface px-4 text-[13px] font-semibold text-ink hover:bg-emerald-soft">
                {t("Clear search")}
              </button>
            ) : (
              tab === "active" && (
                <Link href="/assets-management/purchase-sell" className="mt-1 flex h-10 items-center rounded-full bg-emerald px-4 text-[13px] font-semibold text-white hover:bg-emerald-hover">
                  {t("Go to Purchase & Sell")}
                </Link>
              )
            )}
          </div>
        )}
      </section>

      <AssetStatementDialog
        asset={history}
        onClose={() => {
          setHistoryId(null);
          if (searchParams.get("history")) router.replace("/assets-management/update", { scroll: false });
        }}
        onUpdate={(asset) => setUpdatingId(asset.id)}
        onChanged={refresh}
        businessId={businessId}
        categories={categories}
        wallets={wallets}
        currency={currency}
        canManage={canManage}
      />
      <UpdateValueDialog asset={updating} onClose={() => setUpdatingId(null)} onSaved={refresh} businessId={businessId} categories={categories} currency={currency} />
    </PageFrame>
  );
}
