"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useStoredChoice } from "@/components/modules/Customer/Balance/useStoredChoice";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import Loader from "@/components/shared/Loader";
import IconAction from "@/components/smartly/IconAction";
import PageFrame from "@/components/smartly/PageFrame";
import type { Account, Asset, AssetCategoryOption } from "@/lib/customer/api";
import { deleteAssetAction, restoreAssetAction } from "@/lib/customer/assetActions";
import { assetGain, assetWorth, isActiveCategory, updateCount } from "@/lib/customer/assetDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AddAssetDialog } from "./AddAssetDialog";
import { assetLook, AssetTile, assetTone, changePercent } from "./assetLook";
import { doneToast } from "./assetUi";
import { EditAssetDialog } from "./EditAssetDialog";
import { walletName } from "./walletOptions";

interface MyAssetsPageClientProps {
  businessId: string;
  // Every asset, owned and sold.
  assets: Asset[];
  categories: AssetCategoryOption[];
  wallets: Account[];
  currency: string;
  canManage: boolean;
}

type Status = "All" | "Active" | "Sold";
type View = "cards" | "table";
const VIEWS = ["cards", "table"] as const;

// The board's table: Asset, You paid, Value today, Gain or loss, Value
// updates, Status, Actions.
const COLUMNS = "grid-cols-[minmax(0,1.6fr)_130px_150px_minmax(150px,1fr)_110px_90px_80px]";
const SELECT = "h-11 shrink-0 cursor-pointer rounded-[10px] border border-input bg-surface px-3 text-[14px] font-semibold text-ink max-md:w-full";
const VIEW_ICONS: Record<View, string> = { cards: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z", table: "M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18" };

// All assets: everything owned or sold as cards or a table, newest purchase
// first, with a search (name, category or note) and the category and status
// filters. Edit sets an asset right; Delete removes one added by mistake,
// with Undo for a few minutes.
export function MyAssetsPageClient({ businessId, assets, categories, wallets, currency, canManage }: MyAssetsPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(searchParams.get("category") ?? "All");
  const [status, setStatus] = useState<Status>("All");
  const [search, setSearch] = useState("");
  const [view, setView] = useStoredChoice<View>("smartly-asset-view", VIEWS, "cards");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState<Asset | null>(null);
  // The asset just added, picked out until the next change.
  const [highlight, setHighlight] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const counts = new Map<string, number>();
  for (const asset of assets) counts.set(asset.category, (counts.get(asset.category) ?? 0) + 1);
  // A category is offered while it is on or still has assets.
  const filterCategories = categories.filter((option) => counts.has(option.name) || isActiveCategory(option));
  const active = category !== "All" && filterCategories.some((option) => option.name === category) ? category : "All";
  const q = search.trim().toLowerCase();
  const sold = (asset: Asset) => asset.status === "SOLD";
  const shown = assets
    .filter((asset) => (active === "All" || asset.category === active) && (status === "All" || (status === "Sold") === sold(asset)))
    .filter((asset) => !q || [asset.name, asset.category, t(asset.category), asset.notes ?? "", asset.soldNote ?? ""].some((text) => text.toLowerCase().includes(q)))
    .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  const totals = shown.filter((asset) => (status === "Sold" ? sold(asset) : !sold(asset)));
  const totalCost = totals.reduce((sum, asset) => sum + Number(asset.purchasePrice), 0);
  const totalValue = totals.reduce((sum, asset) => sum + assetWorth(asset), 0);
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const signed = (value: number) => (value ? formatSignedCurrency(value, currency, fmt) : money(0));
  const updatesLabel = (count: number) => (count === 0 ? t("None yet") : t(count === 1 ? "{count} update" : "{count} updates", { count: formatCount(count, fmt) }));
  const month = (date: string) => formatDate(date, "MMM yyyy", fmt);
  const refresh = () => router.refresh();

  function remove() {
    const asset = deleting;
    if (!asset) return;
    startDelete(async () => {
      try {
        const result = await deleteAssetAction(businessId, asset.id);
        if (!result.success) {
          toast.error(t(result.message ?? "Failed to delete the asset"));
          return;
        }
        setDeleting(null);
        refresh();
        doneToast(t("{name} deleted", { name: asset.name }), {
          label: t("Undo"),
          run: async () => {
            const back = await restoreAssetAction(businessId, asset.id);
            if (back.success) refresh();
            else toast.error(t(back.message ?? "Failed to undo the delete"));
          },
        });
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  // What each asset shows, card or row.
  const facts = (asset: Asset) => {
    const isSold = sold(asset);
    const worth = assetWorth(asset);
    const diff = assetGain(asset).amount;
    const tone = assetTone(diff);
    const gainInk = diff > 0 ? "text-emerald" : diff < 0 ? "text-loss-ink" : "text-ink-muted";
    const gain = diff ? `${signed(diff)}${t(isSold ? " vs what you paid" : " since you bought it")}` : t(isSold ? "Sold for what you paid" : "Same as you paid");
    const into = walletName(wallets, asset.soldAccountId);
    const note = isSold && asset.soldAt ? [t("Sold on {date}", { date: formatDate(asset.soldAt, "d MMM yyyy", fmt) }), into ? t("money into {wallet}", { wallet: into }) : ""].filter(Boolean).join(" · ") : (asset.notes ?? "");
    return { isSold, worth, diff, tone, gainInk, gain, note, look: assetLook(categories, asset.category), sub: `${t(asset.category)} · ${t("since")} ${month(asset.purchaseDate)}` };
  };

  const statusChip = (isSold: boolean) => <span className={cn("shrink-0 rounded-full px-2.5 py-0.75 text-[12px] font-bold", isSold ? "bg-surface-sunken text-ink-soft" : "bg-tint-green text-tint-green-ink")}>{t(isSold ? "Sold" : "Active")}</span>;

  const actions = (asset: Asset) =>
    canManage && (
      <>
        <IconAction onClick={() => setEditing(asset)} aria-label={t("Edit {name}", { name: asset.name })} title={t("Edit")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z" />
            <path d="m15 5 3 3" />
          </svg>
        </IconAction>
        <IconAction tone="danger" onClick={() => setDeleting(asset)} aria-label={t("Delete {name}", { name: asset.name })} title={t("Delete")}>
          <Trash2 aria-hidden="true" />
        </IconAction>
      </>
    );

  const deleteLines = (asset: Asset) => {
    const updates = updateCount(asset);
    const isSold = sold(asset);
    const lines = [t("Use this for an asset added by mistake. It is removed from every Assets page.")];
    if (updates && isSold) lines.push(t(updates === 1 ? "Its {count} value update and sale record will be deleted too." : "Its {count} value updates and sale record will be deleted too.", { count: formatCount(updates, fmt) }));
    else if (updates) lines.push(t(updates === 1 ? "Its {count} value update will be deleted too." : "Its {count} value updates will be deleted too.", { count: formatCount(updates, fmt) }));
    else if (isSold) lines.push(t("Its sale record will be deleted too."));
    const from = walletName(wallets, asset.purchaseAccountId);
    if (asset.purchaseAccountId) lines.push(t("The {amount} payment from {wallet} leaves the Balance ledger, so that balance goes back up.", { amount: money(asset.purchasePrice), wallet: from || t("its wallet") }));
    return lines;
  };

  return (
    <PageFrame className="leading-[normal] md:h-full md:gap-5">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <h1 className="text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("All assets")}</h1>
        {canManage && (
          <button type="button" onClick={() => setAddOpen(true)} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-emerald px-4 text-[14px] font-semibold whitespace-nowrap text-white shadow-[0_1px_2px_rgba(18,32,29,0.10)] hover:bg-emerald-hover">
            <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
            {t("Add asset")}
          </button>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5 md:flex-nowrap">
        <div className="relative min-w-0 flex-1 max-md:basis-full">
          <Search className="absolute top-3.5 left-3 size-4 text-ink-muted" aria-hidden="true" />
          <input
            type="search"
            aria-label={t("Search assets")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Escape" && setSearch("")}
            placeholder={t("Search assets by name, category or note…")}
            className="h-11 w-full rounded-[10px] border border-input bg-surface pr-3 pl-9 text-[14px] text-ink outline-none focus:border-emerald focus:shadow-[0_0_0_3px_rgba(28,117,103,0.15)]"
          />
        </div>
        <select aria-label={t("Category")} value={active} onChange={(event) => setCategory(event.target.value)} className={cn(SELECT, "md:w-50")}>
          <option value="All">{`${t("All categories")} (${formatCount(assets.length, fmt)})`}</option>
          {filterCategories.map((option) => (
            <option key={option.id} value={option.name}>{`${t(option.name)} (${formatCount(counts.get(option.name) ?? 0, fmt)})`}</option>
          ))}
        </select>
        <select aria-label={t("Status")} value={status} onChange={(event) => setStatus(event.target.value as Status)} className={cn(SELECT, "md:w-45")}>
          <option value="All">{t("All status")}</option>
          <option value="Active">{t("Active")}</option>
          <option value="Sold">{t("Sold")}</option>
        </select>
        <div role="group" aria-label={t("View")} className="flex shrink-0 gap-0.5 rounded-full bg-toggle-track p-0.75">
          {VIEWS.map((option) => {
            const on = view === option;
            const label = t(option === "cards" ? "Card view" : "Table view");
            return (
              <button key={option} type="button" aria-pressed={on} aria-label={label} title={label} onClick={() => setView(option)} className={cn("flex h-9 w-9.5 items-center justify-center rounded-full", on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.12)]" : "text-ink-faint hover:text-ink")}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={VIEW_ICONS[option]} />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="shrink-0 rounded-[18px] border border-line-card bg-surface p-10 text-center text-[14px] text-ink-muted">{t(assets.length ? "No assets match your search or filters." : "No assets yet. Add the first one.")}</div>
      ) : view === "cards" ? (
        <div className="grid content-start gap-4 sm:grid-cols-2 md:min-h-0 md:flex-1 md:overflow-y-auto xl:grid-cols-3">
          {shown.map((asset) => {
            const fact = facts(asset);
            const picked = highlight === asset.id;
            return (
              <div
                key={asset.id}
                className={cn(
                  "flex flex-col gap-4 rounded-[18px] border p-4.5 text-ink shadow-card transition-shadow hover:shadow-[0_2px_4px_rgba(18,32,29,0.06),0_14px_32px_rgba(18,32,29,0.10)]",
                  picked ? "border-emerald bg-pick-wash" : cn("border-line-card", fact.isSold ? "bg-sold-card" : "bg-surface"),
                )}
              >
                <div className="flex items-start gap-3">
                  <AssetTile look={fact.look} glossy className="size-12 rounded-[16px]" glyph={28} stroke={1.5} fill={0.26} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.75 pt-0.5">
                    <span className="truncate text-[15px] font-semibold">{asset.name}</span>
                    <span className="text-[12.5px] text-ink-muted">{fact.sub}</span>
                  </span>
                  {statusChip(fact.isSold)}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-ink-muted">{t(fact.isSold ? "Sold for" : "Value today")}</span>
                  <span className={cn("text-[26px] font-bold tracking-[-0.02em] tabular-nums", fact.isSold ? "text-ink-muted" : "text-ink")}>{money(fact.worth)}</span>
                  <span className={cn("text-[12.5px] font-semibold tabular-nums", fact.gainInk)}>{fact.gain}</span>
                </div>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-line-card">
                  <span className="flex flex-col gap-0.5 bg-strip px-3 py-2.5">
                    <span className="text-[11.5px] text-ink-muted">{t("You paid")}</span>
                    <span className="text-[13.5px] font-semibold text-ink-2 tabular-nums">{money(asset.purchasePrice)}</span>
                  </span>
                  <span className="flex flex-col gap-0.5 bg-strip px-3 py-2.5">
                    <span className="text-[11.5px] text-ink-muted">{t("Value updates")}</span>
                    <span className="text-[13.5px] font-semibold text-ink-2">{updatesLabel(updateCount(asset))}</span>
                  </span>
                </div>
                <div className="mt-auto flex items-center gap-2.5 border-t border-card-rule pt-3">
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-[12.5px] whitespace-nowrap text-ink-soft">
                    {fact.note && (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-ink-faint">
                          <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
                          <path d="M15 3v6h6" />
                        </svg>
                        <span className="truncate">{fact.note}</span>
                      </>
                    )}
                  </span>
                  {actions(asset)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <section aria-label={t("Assets table")} className="flex flex-col overflow-hidden rounded-[18px] border border-line-card bg-surface shadow-card md:min-h-0 md:flex-1">
          <div className="overflow-x-auto md:flex md:min-h-0 md:flex-1 md:flex-col">
            <div className={cn("grid min-w-235 shrink-0 items-center gap-x-4 border-b border-line bg-strip px-5 py-3 text-[12px] font-medium text-ink-muted", COLUMNS)}>
              <span>{t("Asset")}</span>
              <span className="text-right">{t("You paid")}</span>
              <span className="text-right">{t("Value today")}</span>
              <span className="text-right">{t("Gain or loss")}</span>
              <span className="text-right">{t("Value updates")}</span>
              <span>{t("Status")}</span>
              <span className="text-right">{t("Actions")}</span>
            </div>
            <div className="min-w-235 md:min-h-0 md:flex-1 md:overflow-y-auto">
              {shown.map((asset) => {
                const fact = facts(asset);
                return (
                  <div key={asset.id} className={cn("grid min-h-16.5 items-center gap-x-4 border-b border-card-rule px-5 py-2.5 text-ink tabular-nums hover:bg-hover", COLUMNS, highlight === asset.id ? "bg-pick-wash" : fact.isSold ? "bg-sold-card" : "bg-surface")}>
                    <span className="flex min-w-0 items-center gap-3">
                      <AssetTile look={fact.look} glossy className="size-9.5 rounded-[12px]" glyph={21} stroke={1.6} fill={0.26} />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[14.5px] font-semibold">{asset.name}</span>
                        <span className="truncate text-[12px] text-ink-muted">{fact.sub}</span>
                      </span>
                    </span>
                    <span className="text-right text-[14px] text-ink-soft">{money(asset.purchasePrice)}</span>
                    <span className="flex flex-col items-end gap-px">
                      <span className={cn("text-[15px] font-bold", fact.isSold ? "text-ink-muted" : "text-ink")}>{money(fact.worth)}</span>
                      {fact.isSold && <span className="text-[11.5px] text-ink-muted">{t("Sold for")}</span>}
                    </span>
                    <span className="flex min-w-0 items-center justify-end gap-2">
                      <span className={cn("text-[13.5px] font-semibold whitespace-nowrap", fact.gainInk)}>{signed(fact.diff)}</span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-bold", fact.tone.chip, fact.tone.ink)}>{toLocaleDigits(changePercent(fact.diff, Number(asset.purchasePrice)), fmt)}</span>
                    </span>
                    <span className="text-right text-[13px] text-ink-soft">{updatesLabel(updateCount(asset))}</span>
                    <span>{statusChip(fact.isSold)}</span>
                    <span className="flex justify-end gap-1.5">{actions(asset)}</span>
                  </div>
                );
              })}
            </div>
            <div className={cn("grid min-w-235 shrink-0 items-center gap-x-4 border-t border-line bg-strip px-5 py-3 text-[13px] font-bold text-ink tabular-nums", COLUMNS)}>
              <span>{`${t(status === "Sold" ? "Sold total" : "Active total")} · ${t(totals.length === 1 ? "{count} asset" : "{count} assets", { count: formatCount(totals.length, fmt) })}`}</span>
              <span className="text-right">{money(totalCost)}</span>
              <span className="text-right">{money(totalValue)}</span>
              <span className={cn("text-right", totalValue - totalCost > 0 ? "text-emerald" : totalValue - totalCost < 0 ? "text-loss-ink" : "text-ink-muted")}>{signed(totalValue - totalCost)}</span>
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>
      )}

      <AddAssetDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(id) => {
          setHighlight(id);
          refresh();
        }}
        businessId={businessId}
        assets={assets}
        categories={categories}
        wallets={wallets}
        currency={currency}
      />
      <EditAssetDialog asset={editing} onClose={() => setEditing(null)} onSaved={refresh} businessId={businessId} assets={assets} categories={categories} wallets={wallets} currency={currency} />
      <Dialog open={deleting !== null} onOpenChange={(next) => !next && !isDeleting && setDeleting(null)}>
        <DialogContent showCloseButton={false} className="flex w-110 max-w-[calc(100vw-32px)] flex-col gap-3.5 rounded-[20px] border-0 bg-surface p-6 leading-[normal] text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
          <span aria-hidden="true" className="flex size-11.5 items-center justify-center rounded-[14px] bg-expense-soft text-expense-fill">
            <Trash2 className="size-5.5" />
          </span>
          {deleting && (
            <>
              <DialogTitle className="text-[18px] font-bold text-ink">{t("Delete {name}?", { name: deleting.name })}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-col gap-3.5">
                  {deleteLines(deleting).map((line) => (
                    <p key={line} className="text-[13.5px] leading-[1.55] text-ink-soft">
                      {line}
                    </p>
                  ))}
                </div>
              </DialogDescription>
            </>
          )}
          <div className="mt-1 flex justify-end gap-2.5">
            <button type="button" disabled={isDeleting} onClick={() => setDeleting(null)} className="h-11 rounded-full border border-input bg-surface px-4.5 text-[14px] font-semibold text-ink hover:bg-surface-sunken">
              {t("Cancel")}
            </button>
            <button type="button" disabled={isDeleting} onClick={remove} className="flex h-11 items-center gap-2 rounded-full bg-expense-fill px-5 text-[14px] font-semibold text-white hover:opacity-90">
              {isDeleting && <Loader size={16} onDark label={t("Deleting...")} />}
              {t("Delete asset")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </PageFrame>
  );
}
