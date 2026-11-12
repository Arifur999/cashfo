"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import Loader from "@/components/shared/Loader";
import IconAction from "@/components/smartly/IconAction";
import PageFrame from "@/components/smartly/PageFrame";
import type { Account, Asset, AssetCategoryOption } from "@/lib/customer/api";
import { deleteAssetAction, editAssetSaleAction, purchaseAssetAction, restoreAssetAction, sellAssetAction, type SellAssetInput, undoAssetSaleAction, updateAssetAction } from "@/lib/customer/assetActions";
import { assetsSummary, type TradeRow, tradeRows } from "@/lib/customer/assetDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { assetLook, AssetTile, assetTone } from "./assetLook";
import { doneToast } from "./assetUi";
import { purchaseOf } from "./EditAssetDialog";
import { TradeDialog, type TradeKind, type TradeSubmit } from "./TradeDialog";
import { walletName } from "./walletOptions";

interface BuySellPageClientProps {
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  wallets: Account[];
  currency: string;
  canManage: boolean;
}

type Filter = "All" | "PURCHASE" | "SALE";
type Confirm = { kind: "sell"; asset: Asset; input: SellAssetInput } | { kind: "del"; asset: Asset } | { kind: "unsell"; asset: Asset };
type Result = { success: boolean; message?: string; data?: { id: string } | void };

// The board's table: #, Date, Type, Asset, Category, Account, Amount, Actions.
const COLUMNS = "grid-cols-[40px_110px_100px_minmax(0,1fr)_130px_120px_140px_80px]";

// Purchase & Sell: every purchase paid from a wallet and every sale, newest
// first, with the totals bought and sold and what the sales made or lost.
// Each row is set right from its pencil; a purchase's bin deletes the asset
// and a sale's undoes the sale. Every change has Undo on its toast.
export function BuySellPageClient({ businessId, assets, categories, wallets, currency, canManage }: BuySellPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ kind: TradeKind; editing: Asset | null } | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  // The row just saved, washed for a moment.
  const [flash, setFlash] = useState<string | null>(null);
  const [isBusy, startBusy] = useTransition();

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(timer);
  }, [flash]);

  const all = tradeRows(assets);
  const q = search.trim().toLowerCase();
  const rows = all.filter((row) => (filter === "All" || row.kind === filter) && (!q || [row.asset.name, row.asset.category, t(row.asset.category), walletName(wallets, row.accountId), (row.kind === "SALE" ? row.asset.soldNote : row.asset.notes) ?? ""].some((text) => text.toLowerCase().includes(q))));
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const day = (date: string) => formatDate(`${date.slice(0, 10)}T00:00:00.000Z`, "d MMM yyyy", fmt);
  const refresh = () => router.refresh();

  const buys = all.filter((row) => row.kind === "PURCHASE");
  const sells = all.filter((row) => row.kind === "SALE");
  const { soldGain, sold } = assetsSummary(assets);
  const realized = soldGain.amount;
  const soldPaid = sold.reduce((sum, asset) => sum + Number(asset.purchasePrice), 0);
  const tone = assetTone(realized);
  const summary = [
    { label: t("Bought"), value: money(buys.reduce((sum, row) => sum + row.amount, 0)), ink: "text-ink", sub: t(buys.length === 1 ? "{count} purchase paid from accounts" : "{count} purchases paid from accounts", { count: formatCount(buys.length, fmt) }), icon: "M12 5v14 M19 12l-7 7-7-7", box: "bg-expense-soft text-loss-ink" },
    { label: t("Sold"), value: money(sells.reduce((sum, row) => sum + row.amount, 0)), ink: "text-ink", sub: t(sells.length === 1 ? "{count} sale received into accounts" : "{count} sales received into accounts", { count: formatCount(sells.length, fmt) }), icon: "M12 19V5 M5 12l7-7 7 7", box: "bg-tint-green text-tint-green-ink" },
    {
      label: t(realized < 0 ? "Realized loss" : "Realized gain"),
      value: formatSignedCurrency(realized, currency, fmt),
      ink: tone.ink,
      sub: sold.length ? t(sold.length === 1 ? "On {count} sold asset, paid {amount}" : "On {count} sold assets, paid {amount}", { count: formatCount(sold.length, fmt), amount: money(soldPaid) }) : t("Nothing sold yet"),
      icon: realized < 0 ? "M22 17l-8.5-8.5-5 5L2 7 M16 17h6v-6" : "M22 7l-8.5 8.5-5-5L2 17 M16 7h6v6",
      box: cn(tone.chip, tone.ink),
    },
  ];

  // Runs a change and, when it went through, reloads the page, says so and
  // offers its undo.
  function run(action: () => Promise<Result>, failed: string, done: (result: Result) => void) {
    startBusy(async () => {
      try {
        const result = await action();
        if (!result.success) {
          toast.error(t(result.message ?? failed));
          return;
        }
        setDialog(null);
        setConfirm(null);
        refresh();
        done(result);
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  // An undo: its own failure is said, its success reloads.
  const undo = (action: () => Promise<Result>, failed: string) => ({
    label: t("Undo"),
    run: async () => {
      const back = await action();
      if (back.success) refresh();
      else toast.error(t(back.message ?? failed));
    },
  });

  function submit(submitted: TradeSubmit) {
    if (submitted.kind === "sale") return setConfirm({ kind: "sell", asset: submitted.asset, input: submitted.input });
    if (submitted.kind === "purchase") {
      const { input, owned } = submitted;
      return run(() => purchaseAssetAction(businessId, input), "Failed to add the asset", (result) => {
        const id = result.data?.id;
        if (id && !owned) setFlash(`${id}:buy`);
        doneToast(t(owned ? "{name} added to All Assets" : "{name} added", { name: input.name }), id ? undo(() => deleteAssetAction(businessId, id), "Failed to delete the asset") : undefined);
      });
    }
    if (submitted.kind === "editPurchase") {
      const { asset, input } = submitted;
      const before = purchaseOf(asset);
      return run(() => updateAssetAction(businessId, asset.id, input), "Failed to save the changes", () => {
        if (input.purchaseAccountId) setFlash(`${asset.id}:buy`);
        doneToast(t("Changes to {name} saved", { name: input.name ?? asset.name }), undo(() => updateAssetAction(businessId, asset.id, before), "Failed to save the changes"));
      });
    }
    const { asset, input } = submitted;
    const before = saleOf(asset);
    run(() => editAssetSaleAction(businessId, asset.id, input), "Failed to save the sale", () => {
      setFlash(`${asset.id}:sell`);
      doneToast(t("Sale of {name} updated", { name: asset.name }), before ? undo(() => editAssetSaleAction(businessId, asset.id, before), "Failed to save the sale") : undefined);
    });
  }

  function confirmed() {
    if (!confirm) return;
    const { asset } = confirm;
    if (confirm.kind === "sell") {
      const { input } = confirm;
      return run(() => sellAssetAction(businessId, asset.id, input), "Failed to record the sale", () => {
        setFlash(`${asset.id}:sell`);
        doneToast(t("{name} sold", { name: asset.name }), undo(() => undoAssetSaleAction(businessId, asset.id), "Failed to undo the sale"));
      });
    }
    if (confirm.kind === "del") {
      return run(() => deleteAssetAction(businessId, asset.id), "Failed to delete the asset", () => doneToast(t("{name} deleted", { name: asset.name }), undo(() => restoreAssetAction(businessId, asset.id), "Failed to undo the delete")));
    }
    const before = saleOf(asset);
    run(() => undoAssetSaleAction(businessId, asset.id), "Failed to undo the sale", () => {
      setFlash(`${asset.id}:buy`);
      doneToast(t("Sale of {name} undone", { name: asset.name }), before ? undo(() => sellAssetAction(businessId, asset.id, before), "Failed to record the sale") : undefined);
    });
  }

  const typeChip = (sale: boolean) => <span className={cn("rounded-full px-2.5 py-0.75 text-[12px] font-semibold whitespace-nowrap", sale ? "bg-tint-green text-tint-green-ink" : "bg-expense-soft text-loss-ink")}>{t(sale ? "Sale" : "Purchase")}</span>;

  const details = (row: TradeRow) => {
    const note = (row.kind === "SALE" ? row.asset.soldNote : row.asset.notes) ?? "";
    if (note) return note;
    return row.kind === "SALE" ? t("Paid {amount} on {date}", { amount: money(row.asset.purchasePrice), date: day(row.asset.purchaseDate) }) : t("No note");
  };

  // The confirm popup's words.
  const confirmText = (() => {
    if (!confirm) return null;
    const { asset } = confirm;
    const look = assetLook(categories, asset.category);
    const bought = `${t(asset.category)} · ${t("Bought {date}", { date: day(asset.purchaseDate) })}`;
    if (confirm.kind === "sell") {
      const change = confirm.input.soldPrice - Number(asset.purchasePrice);
      const signed = formatSignedCurrency(change, currency, fmt);
      return {
        look,
        title: t("Sell {name} for {amount} into {wallet}?", { name: asset.name, amount: money(confirm.input.soldPrice), wallet: walletName(wallets, confirm.input.soldAccountId) }),
        body: t("It leaves your active assets on {date}. You paid {amount}.", { date: day(confirm.input.date), amount: money(asset.purchasePrice) }),
        sub: bought,
        amount: `+ ${money(confirm.input.soldPrice)}`,
        ink: "text-tint-green-ink",
        line: { text: change > 0 ? t("Gain {amount} vs what you paid", { amount: signed }) : change < 0 ? t("Loss {amount} vs what you paid", { amount: signed }) : t("Same as what you paid"), tone: assetTone(change) },
        button: t("Sell"),
        danger: false,
      };
    }
    if (confirm.kind === "del") {
      return { look, title: t("Delete {name}?", { name: asset.name }), body: t("This removes the asset, its value history and its sale if any."), sub: bought, amount: `− ${money(asset.purchasePrice)}`, ink: "text-expense-fill", line: null, button: t("Delete"), danger: true };
    }
    return {
      look,
      title: t("Undo the sale of {name}?", { name: asset.name }),
      body: t("It becomes active again."),
      sub: `${t(asset.category)} · ${t("Sold {date}", { date: day(asset.soldAt ?? asset.purchaseDate) })}`,
      amount: `+ ${money(asset.soldPrice ?? 0)}`,
      ink: "text-tint-green-ink",
      line: null,
      button: t("Undo sale"),
      danger: true,
    };
  })();

  return (
    <PageFrame className="leading-[normal] md:h-full md:pt-7">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <h1 className="text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Asset purchases & sales")}</h1>
        {canManage && (
          <button type="button" onClick={() => setDialog({ kind: "purchase", editing: null })} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-emerald px-4.5 text-[14px] font-semibold whitespace-nowrap text-white shadow-[0_1px_2px_rgba(18,32,29,0.10)] hover:bg-emerald-hover">
            <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
            {t("Record purchase or sale")}
          </button>
        )}
      </div>

      <div role="group" aria-label={t("Purchase and sale totals")} className="grid shrink-0 gap-3.5 md:grid-cols-3">
        {summary.map((card) => (
          <div key={card.label} className="flex min-w-0 items-center gap-3.5 rounded-[16px] border border-line-card bg-surface px-4.5 py-3.5 shadow-[0_1px_2px_rgba(18,32,29,0.04)]">
            <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-[12px]", card.box)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d={card.icon} />
              </svg>
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[12.5px] font-medium text-ink-muted">{card.label}</span>
              <span className={cn("text-[20px] font-bold whitespace-nowrap tabular-nums", card.ink)}>{card.value}</span>
              <span className="truncate text-[12px] text-ink-muted">{card.sub}</span>
            </span>
          </div>
        ))}
      </div>

      <section aria-label={t("Asset purchases and sales")} className="flex min-h-65 flex-col overflow-hidden rounded-[18px] border border-line-card bg-surface shadow-card md:flex-1">
        <div className="flex flex-wrap items-center gap-2.5 px-6 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-3.5 left-3 size-4 text-ink-muted" aria-hidden="true" />
            <input
              type="search"
              aria-label={t("Search asset purchases and sales")}
              placeholder={t("Search asset, category, account or note…")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-[10px] border border-input bg-surface pr-3 pl-9 text-[14px] text-ink outline-none focus:border-emerald focus:shadow-[0_0_0_3px_rgba(28,117,103,0.15)]"
            />
          </div>
          <div role="group" aria-label={t("Type")} className="flex gap-0.5 rounded-full bg-surface-sunken p-0.75">
            {(["All", "PURCHASE", "SALE"] as const).map((value) => {
              const on = filter === value;
              return (
                <button key={value} type="button" aria-pressed={on} onClick={() => setFilter(value)} className={cn("flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] whitespace-nowrap", on ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(18,32,29,0.10)]" : "font-medium text-ink-soft hover:text-ink")}>
                  {value !== "All" && <span aria-hidden="true" className={cn("size-2 rounded-full", value === "SALE" ? "bg-success" : "bg-expense-fill")} />}
                  {t(value === "All" ? "All" : value === "SALE" ? "Sale" : "Purchase")}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
          <div className={cn("grid min-w-245 items-center gap-x-3.5 border-y border-line bg-strip px-6 py-2.5 text-[12px] font-semibold text-ink-muted", COLUMNS)}>
            <span>#</span>
            <span>{t("Date")}</span>
            <span>{t("Type")}</span>
            <span>{t("Asset")}</span>
            <span>{t("Category")}</span>
            <span>{t("Account")}</span>
            <span className="text-right">{t("Amount")}</span>
            <span className="text-right">{t("Actions")}</span>
          </div>
          <div className="min-h-0 min-w-245 flex-1 overflow-y-auto">
            {rows.map((row) => {
              const sale = row.kind === "SALE";
              const look = assetLook(categories, row.asset.category);
              const name = row.asset.name;
              const number = all.indexOf(row) + 1;
              return (
                <div key={row.key} className={cn("grid h-15.5 items-center gap-x-3.5 border-b border-quiet-chip px-6 text-[14px] tabular-nums transition-[background-color] duration-600", COLUMNS, flash === row.key ? "bg-emerald-soft" : "bg-surface")}>
                  <span className="text-[13px] text-ink-muted">{formatCount(number, fmt)}</span>
                  <span className="text-[13px] whitespace-nowrap text-ink-soft">{day(row.date)}</span>
                  <span>{typeChip(sale)}</span>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <AssetTile look={look} className="size-8.5 rounded-[10px]" glyph={17} />
                    <span className="flex min-w-0 flex-col gap-px">
                      <span title={name} className="truncate font-medium text-ink">
                        {name}
                      </span>
                      <span title={details(row)} className="truncate text-[12px] text-ink-muted">
                        {details(row)}
                      </span>
                    </span>
                  </span>
                  <span className="truncate text-[13px] text-ink-2">{t(row.asset.category)}</span>
                  <span className="truncate text-[13px] text-ink-soft">{walletName(wallets, row.accountId) || t("No account")}</span>
                  <span className={cn("text-right font-semibold whitespace-nowrap", sale ? "text-tint-green-ink" : "text-expense-fill")}>{`${sale ? "+" : "−"} ${money(row.amount)}`}</span>
                  <span className="flex justify-end gap-1">
                    {canManage && (
                      <>
                        <IconAction onClick={() => setDialog({ kind: sale ? "sale" : "purchase", editing: row.asset })} aria-label={t(sale ? "Edit sale of {name}" : "Edit purchase of {name}", { name })} title={t("Edit")}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 20h9" />
                            <path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z" />
                            <path d="m15 5 3 3" />
                          </svg>
                        </IconAction>
                        <IconAction tone="danger" onClick={() => setConfirm(sale ? { kind: "unsell", asset: row.asset } : { kind: "del", asset: row.asset })} aria-label={t(sale ? "Undo sale of {name}" : "Delete {name}", { name })} title={t(sale ? "Undo sale" : "Delete")}>
                          <Trash2 aria-hidden="true" />
                        </IconAction>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[16px] bg-surface-sunken text-ink-muted">
                  <Search className="size-5.5" />
                </span>
                <span className="text-[16px] font-semibold text-ink">{t(all.length ? "Nothing matches" : "No purchases or sales yet")}</span>
                <span className="text-[13.5px] text-ink-muted">{t(all.length ? "Try another word or show all types." : "Record your first asset purchase to see it here.")}</span>
                {(all.length > 0 || canManage) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (all.length) {
                        setSearch("");
                        setFilter("All");
                      } else setDialog({ kind: "purchase", editing: null });
                    }}
                    className="mt-1.5 h-10 rounded-full border border-input bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-surface-sunken"
                  >
                    {t(all.length ? "Clear search" : "Record purchase or sale")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-quiet-chip px-6 py-3 text-[13px] text-ink-muted">
          {t(all.length === 1 ? "Showing {shown} of {count} transaction · newest first" : "Showing {shown} of {count} transactions · newest first", { shown: formatCount(rows.length, fmt), count: formatCount(all.length, fmt) })}
        </div>
      </section>

      <TradeDialog open={dialog} onClose={() => setDialog(null)} onSubmit={submit} busy={isBusy} assets={assets} categories={categories} wallets={wallets} currency={currency} />

      <Dialog open={confirm !== null} onOpenChange={(next) => !next && !isBusy && setConfirm(null)}>
        <DialogContent showCloseButton={false} className="z-60 flex w-110 max-w-[calc(100vw-32px)] flex-col gap-2.5 rounded-[18px] border-0 bg-surface p-6 leading-[normal] text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
          {confirmText && (
            <>
              <DialogTitle className="text-[18px] leading-[1.35] font-semibold text-ink">{confirmText.title}</DialogTitle>
              <DialogDescription className="text-[14px] leading-normal text-ink-soft">{confirmText.body}</DialogDescription>
              <div className="mt-1 flex items-center gap-3 rounded-[14px] border border-line px-3.5 py-3">
                <AssetTile look={confirmText.look} className="size-8.5 rounded-[10px]" glyph={17} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14px] font-semibold">{confirm?.asset.name}</span>
                  <span className="truncate text-[12px] text-ink-muted">{confirmText.sub}</span>
                </span>
                <span className={cn("text-[15px] font-bold whitespace-nowrap tabular-nums", confirmText.ink)}>{confirmText.amount}</span>
              </div>
              {confirmText.line && <span className={cn("self-start rounded-full px-3 py-1.5 text-[13px] font-semibold tabular-nums", confirmText.line.tone.chip, confirmText.line.tone.ink)}>{confirmText.line.text}</span>}
              <div className="mt-2 flex justify-end gap-2.5">
                <button type="button" disabled={isBusy} onClick={() => setConfirm(null)} className="h-11 rounded-full border border-input bg-surface px-4.5 text-[14px] font-semibold text-ink hover:bg-surface-sunken">
                  {t("Cancel")}
                </button>
                <button type="button" disabled={isBusy} onClick={confirmed} className={cn("flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white", confirmText.danger ? "bg-expense-fill hover:opacity-90" : "bg-emerald hover:bg-emerald-hover")}>
                  {isBusy && <Loader size={16} onDark label={t("Saving...")} />}
                  {confirmText.button}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageFrame>
  );
}

// A sale as the API takes it back (for Undo), or null when it isn't sold.
function saleOf(asset: Asset): SellAssetInput | null {
  if (asset.status !== "SOLD" || !asset.soldAt || !asset.soldAccountId || asset.soldPrice === null) return null;
  return { soldPrice: Number(asset.soldPrice), soldAccountId: asset.soldAccountId, date: asset.soldAt.slice(0, 10), ...(asset.soldNote && { notes: asset.soldNote }) };
}
