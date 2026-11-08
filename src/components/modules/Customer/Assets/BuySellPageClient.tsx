"use client";

import { ArrowDown, ArrowUp, ArrowLeftRight, Pencil, Plus, Search, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import IconAction from "@/components/smartly/IconAction";
import PageFrame from "@/components/smartly/PageFrame";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, Asset, AssetCategoryOption } from "@/lib/customer/api";
import { deleteAssetAction, undoAssetSaleAction } from "@/lib/customer/assetActions";
import { assetsSummary, categoryVisual, tradeRows, type TradeRow } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetDrawer } from "./AssetDrawer";
import { AssetTradeTabs } from "./AssetTradeTabs";
import { AssetTypeTile } from "./AssetTypeTile";
import { ReadOnlyNote } from "./ReadOnlyNote";
import { SellAssetDrawer } from "./SellAssetDrawer";
import { SoldAssetDrawer } from "./SoldAssetDrawer";
import { UpdateValueDrawer } from "./UpdateValueDrawer";

interface BuySellPageClientProps {
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  // Every wallet, savings ones too, to name where money left or landed.
  wallets: Account[];
  currency: string;
  canManage: boolean;
}

type Filter = "all" | TradeRow["kind"];
type Popup = "purchase" | "sale" | null;

// The board's table: #, Date, Type, Asset, Category, Account, Amount, Actions.
const COLUMNS = "md:grid-cols-[40px_110px_100px_minmax(0,1fr)_130px_120px_140px_80px]";

const FILTERS: { value: Filter; label: string; dot?: string }[] = [
  { value: "all", label: "All" },
  { value: "PURCHASE", label: "Purchase", dot: "bg-expense-fill" },
  { value: "SALE", label: "Sale", dot: "bg-income" },
];

const day = (date: string) => `${date.slice(0, 10)}T00:00:00.000Z`;

// Asset purchases & sales: what was bought, sold and gained or lost on the
// sales, then every purchase paid from a wallet and every sale, newest
// first, to search, filter by type, edit or delete. Record purchase or sale
// opens one popup with Purchase and Sale tabs.
export function BuySellPageClient({ businessId, assets, categories, wallets, currency, canManage }: BuySellPageClientProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [popup, setPopup] = useState<Popup>(null);
  // A row's Edit: an owned asset's details, or the sale.
  const [opened, setOpened] = useState<Asset | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [, startRow] = useTransition();

  const lang = displayLanguage(locale);
  const walletName = (id: string | null) => {
    const wallet = wallets.find((candidate) => candidate.id === id);
    return wallet ? accountDisplayName(wallet, lang) : t("No account");
  };
  const money = (value: number) => formatCurrency(value, currency, fmt);
  const { owned, sold, soldGain } = assetsSummary(assets);
  const all = tradeRows(assets);
  const q = search.trim().toLowerCase();
  const details = (row: TradeRow) =>
    row.asset.notes || (row.kind === "SALE" ? t("Paid {amount} on {date}", { amount: money(Number(row.asset.purchasePrice)), date: formatDate(row.asset.purchaseDate, "d MMM yyyy", fmt) }) : t("No note"));
  const rows = all
    .filter((row) => filter === "all" || row.kind === filter)
    .filter((row) => !q || [row.asset.name, row.asset.category, t(row.asset.category), walletName(row.accountId), row.asset.notes ?? ""].some((text) => text.toLowerCase().includes(q)));

  const buys = all.filter((row) => row.kind === "PURCHASE");
  const sales = all.filter((row) => row.kind === "SALE");
  const soldPaid = sold.reduce((sum, asset) => sum + Number(asset.purchasePrice), 0);
  const realized = soldGain.amount;
  const summary = [
    {
      label: t("Bought"),
      value: money(buys.reduce((sum, row) => sum + row.amount, 0)),
      sub: t(buys.length === 1 ? "{count} purchase paid from accounts" : "{count} purchases paid from accounts", { count: formatCount(buys.length, fmt) }),
      icon: <ArrowDown />,
      tile: "bg-expense-soft text-expense",
      ink: "text-ink",
    },
    {
      label: t("Sold"),
      value: money(sales.reduce((sum, row) => sum + row.amount, 0)),
      sub: t(sales.length === 1 ? "{count} sale received into accounts" : "{count} sales received into accounts", { count: formatCount(sales.length, fmt) }),
      icon: <ArrowUp />,
      tile: "bg-income-soft text-income",
      ink: "text-ink",
    },
    {
      label: t(realized < 0 ? "Realized loss" : "Realized gain"),
      value: `${realized > 0 ? "+ " : realized < 0 ? "− " : ""}${money(Math.abs(realized))}`,
      sub:
        sold.length === 0
          ? t("Nothing sold yet")
          : t(sold.length === 1 ? "On {count} sold asset, paid {amount}" : "On {count} sold assets, paid {amount}", { count: formatCount(sold.length, fmt), amount: money(soldPaid) }),
      icon: realized < 0 ? <TrendingDown /> : <TrendingUp />,
      tile: realized < 0 ? "bg-expense-soft text-expense" : realized > 0 ? "bg-income-soft text-income" : "bg-surface-sunken text-ink-soft",
      ink: realized < 0 ? "text-expense" : realized > 0 ? "text-income" : "text-ink",
    },
  ];

  const tabs = <AssetTradeTabs value={popup ?? "purchase"} onChange={setPopup} />;

  function run(row: TradeRow, action: () => Promise<{ success: boolean; message?: string }>, done: string, failed: string) {
    setBusyKey(row.key);
    startRow(async () => {
      try {
        const result = await action();
        if (result.success) {
          toast.success(t(done));
          router.refresh();
        } else {
          toast.error(t(result.message ?? failed));
        }
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      } finally {
        setBusyKey(null);
      }
    });
  }

  async function remove(row: TradeRow) {
    const amount = money(row.amount);
    const wallet = walletName(row.accountId);
    if (row.kind === "SALE") {
      if (!(await confirm({ title: t("Undo this sale?"), message: t("{asset} goes back to your assets and the {amount} leaves {wallet}.", { asset: row.asset.name, amount, wallet }), confirmLabel: "Undo sale", danger: true }))) return;
      run(row, () => undoAssetSaleAction(businessId, row.asset.id), "Sale undone", "Failed to undo the sale");
    } else {
      if (!(await confirm({ title: t("Delete this purchase?"), message: t("{asset} is removed from your assets and the {amount} goes back to {wallet}.", { asset: row.asset.name, amount, wallet }), confirmLabel: "Delete", danger: true }))) return;
      run(row, () => deleteAssetAction(businessId, row.asset.id), "Purchase deleted", "Failed to delete the asset");
    }
  }

  const clearFilters = () => {
    setSearch("");
    setFilter("all");
  };

  return (
    <PageFrame className="leading-[normal]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-page-title text-ink">{t("Asset purchases & sales")}</h1>
        {canManage && (
          <Button onClick={() => setPopup("purchase")} className="h-11 shrink-0 rounded-full px-4.5">
            <Plus strokeWidth={2.5} className="size-4" />
            {t("Record purchase or sale")}
          </Button>
        )}
      </div>
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add, sell or update assets in this workspace.")}</ReadOnlyNote>}

      <div role="group" aria-label={t("Purchases and sales in total")} className="grid gap-3.5 md:grid-cols-3">
        {summary.map((item) => (
          <div key={item.label} className="flex min-w-0 items-center gap-3.5 rounded-[16px] border border-line-card bg-surface px-4.5 py-3.5 shadow-[0_1px_2px_rgba(18,32,29,0.04)]">
            <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-[12px] [&_svg]:size-4.5", item.tile)}>
              {item.icon}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[12.5px] font-medium text-ink-muted">{item.label}</span>
              <span className={cn("text-[20px] font-bold whitespace-nowrap tabular-nums", item.ink)}>{item.value}</span>
              <span className="truncate text-[12px] text-ink-muted">{item.sub}</span>
            </span>
          </div>
        ))}
      </div>

      <Card padding="none" className="flex min-h-65 flex-col overflow-hidden rounded-[18px]" role="region" aria-label={t("Asset transactions")}>
        <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 md:px-6">
          <Input
            size="sm"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            leading={<Search />}
            placeholder={t("Search asset, category, account or note…")}
            aria-label={t("Search asset purchases and sales")}
            frameClassName="h-11 min-w-0 flex-1 basis-60 rounded-[10px]"
          />
          <div role="group" aria-label={t("Type")} className="flex gap-0.5 rounded-full bg-surface-sunken p-0.75">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={cn("flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] whitespace-nowrap", filter === option.value ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(18,32,29,0.10)] dark:bg-surface-raised" : "font-medium text-ink-soft hover:text-ink")}
              >
                {option.dot && <span aria-hidden="true" className={cn("size-2 rounded-full", option.dot)} />}
                {t(option.label)}
              </button>
            ))}
          </div>
        </div>

        <div className={cn("hidden items-center gap-x-3.5 border-y border-line bg-table-head px-6 py-2.5 text-caption font-semibold text-ink-muted md:grid", COLUMNS)}>
          <span>#</span>
          <span>{t("Date")}</span>
          <span>{t("Type")}</span>
          <span>{t("Asset")}</span>
          <span>{t("Category")}</span>
          <span>{t("Account")}</span>
          <span className="text-right">{t("Amount")}</span>
          <span className="text-right">{t("Actions")}</span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[16px] bg-surface-sunken text-ink-muted">
              {all.length ? <Search className="size-5.5" /> : <ArrowLeftRight className="size-5.5" />}
            </span>
            <span className="text-[16px] font-semibold text-ink">{t(all.length ? "Nothing matches" : "No purchases or sales yet")}</span>
            <span className="text-[13.5px] text-ink-muted">{t(all.length ? "Try another word or show all types." : "Record your first asset purchase to see it here.")}</span>
            {all.length ? (
              <Button variant="secondary" onClick={clearFilters} className="mt-1.5 h-10 rounded-full px-4">
                {t("Clear search")}
              </Button>
            ) : (
              canManage && (
                <Button variant="secondary" onClick={() => setPopup("purchase")} className="mt-1.5 h-10 rounded-full px-4">
                  {t("Record purchase or sale")}
                </Button>
              )
            )}
          </div>
        ) : (
          <ul className="flex-1">
            {rows.map((row, index) => {
              const sale = row.kind === "SALE";
              const busy = busyKey === row.key;
              // A sold asset's purchase can't go until its sale is undone.
              const locked = !sale && row.asset.status === "SOLD";
              const note = details(row);
              return (
                <li key={row.key} aria-busy={busy || undefined} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1 border-b border-divider px-4 py-3 text-[14px] tabular-nums md:h-15.5 md:px-6 md:py-0", COLUMNS)}>
                  <span className="text-[13px] text-ink-muted max-md:hidden">{formatCount(index + 1, fmt)}</span>
                  <span className="text-[13px] whitespace-nowrap text-ink-soft max-md:hidden">{formatDate(day(row.date), "d MMM yyyy", fmt)}</span>
                  <span className="max-md:hidden">
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.75 text-[12px] font-semibold whitespace-nowrap", sale ? "bg-income-soft text-income" : "bg-expense-soft text-expense")}>{t(sale ? "Sale" : "Purchase")}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <AssetTypeTile visual={categoryVisual(categories, row.asset.category)} className="size-8.5 rounded-[10px]" />
                    <span className="flex min-w-0 flex-col gap-px">
                      <span title={row.asset.name} className="truncate font-medium text-ink">
                        {row.asset.name}
                      </span>
                      <span title={note} className="truncate text-[12px] text-ink-muted">
                        <span className="md:hidden">{`${t(sale ? "Sale" : "Purchase")} · ${formatDate(day(row.date), "d MMM yyyy", fmt)} · `}</span>
                        {note}
                      </span>
                    </span>
                  </span>
                  <span className="truncate text-[13px] text-ink-2 max-md:hidden">{t(row.asset.category)}</span>
                  <span className="truncate text-[13px] text-ink-soft max-md:hidden">{walletName(row.accountId)}</span>
                  <span className={cn("text-right font-semibold whitespace-nowrap", sale ? "text-income" : "text-expense")}>{`${sale ? "+" : "−"} ${money(row.amount)}`}</span>
                  <span className="flex justify-end gap-1 max-md:col-span-2">
                    {canManage && (
                      <>
                        <IconAction onClick={() => setOpened(row.asset)} disabled={busy} aria-label={t(sale ? "Edit sale of {name}" : "Edit purchase of {name}", { name: row.asset.name })} title={t("Edit")}>
                          <Pencil aria-hidden="true" />
                        </IconAction>
                        <IconAction
                          tone="danger"
                          onClick={() => remove(row)}
                          disabled={busy || locked}
                          aria-label={t(sale ? "Undo sale of {name}" : "Delete {name}", { name: row.asset.name })}
                          title={locked ? t("Undo the sale first, then delete the purchase.") : t(sale ? "Undo sale" : "Delete")}
                        >
                          {busy ? <Loader size={14} label={t("Loading...")} /> : <Trash2 aria-hidden="true" />}
                        </IconAction>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {all.length > 0 && (
          <p className="border-t border-divider px-6 py-3 text-[13px] text-ink-muted">
            {t(all.length === 1 ? "Showing {shown} of {total} transaction · newest first" : "Showing {shown} of {total} transactions · newest first", { shown: formatCount(rows.length, fmt), total: formatCount(all.length, fmt) })}
          </p>
        )}
      </Card>

      {canManage && (
        <>
          <AssetDrawer
            open={popup === "purchase"}
            onClose={() => setPopup(null)}
            businessId={businessId}
            categories={categories}
            currency={currency}
            initialMode="buy"
            tabs={tabs}
            title={t("Record purchase or sale")}
          />
          <SellAssetDrawer open={popup === "sale"} onClose={() => setPopup(null)} businessId={businessId} asset={null} choices={owned} currency={currency} tabs={tabs} title={t("Record purchase or sale")} />
        </>
      )}
      <UpdateValueDrawer open={opened !== null && opened.status !== "SOLD"} onClose={() => setOpened(null)} businessId={businessId} asset={opened?.status === "SOLD" ? null : opened} categories={categories} currency={currency} initialMode="details" detailsTitle={t("Edit purchase")} />
      <SoldAssetDrawer open={opened?.status === "SOLD"} onClose={() => setOpened(null)} businessId={businessId} asset={opened?.status === "SOLD" ? opened : null} categories={categories} currency={currency} canManage={canManage} />
      {confirmDialog}
    </PageFrame>
  );
}
