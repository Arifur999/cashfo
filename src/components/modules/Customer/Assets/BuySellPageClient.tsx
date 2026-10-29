"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
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
const COLUMNS = "md:grid-cols-[40px_110px_100px_minmax(0,1fr)_120px_130px_140px_92px]";
const ROW_ACTION = "flex size-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40 pointer-coarse:size-11";

// Asset purchases & sales: every purchase paid from a wallet and every sale,
// newest first, to search, filter by type, edit or delete; New transaction
// opens one popup with Purchase and Sale tabs.
export function BuySellPageClient({ businessId, assets, categories, wallets, currency, canManage }: BuySellPageClientProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [popup, setPopup] = useState<Popup>(null);
  // A row's Edit: an owned asset's Update value popup, or the sale.
  const [opened, setOpened] = useState<Asset | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [, startRow] = useTransition();

  const lang = displayLanguage(locale);
  const walletName = (id: string | null) => {
    const wallet = wallets.find((candidate) => candidate.id === id);
    return wallet ? accountDisplayName(wallet, lang) : "—";
  };
  const { owned, totalValue } = assetsSummary(assets);
  const all = tradeRows(assets);
  const q = search.trim().toLowerCase();
  const rows = all
    .filter((row) => filter === "all" || row.kind === filter)
    .filter((row) => !q || [row.asset.name, row.asset.category, t(row.asset.category), row.asset.notes ?? ""].some((text) => text.toLowerCase().includes(q)));

  const tabs = (
    <SegmentedControl
      options={[
        { value: "purchase", label: "Purchase", icon: <ArrowDown className="size-4 text-expense" aria-hidden="true" /> },
        { value: "sale", label: "Sale", icon: <ArrowUp className="size-4 text-income" aria-hidden="true" /> },
      ]}
      value={popup ?? "purchase"}
      onChange={(next) => setPopup(next)}
      label="Transaction type"
      size="lg"
      stretch
    />
  );

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
    const amount = formatCurrency(row.amount, currency, fmt);
    const wallet = walletName(row.accountId);
    if (row.kind === "SALE") {
      if (!(await confirm({ title: t("Undo this sale?"), message: t("{asset} goes back to your assets and the {amount} leaves {wallet}.", { asset: row.asset.name, amount, wallet }), confirmLabel: "Undo sale", danger: true }))) return;
      run(row, () => undoAssetSaleAction(businessId, row.asset.id), "Sale undone", "Failed to undo the sale");
    } else {
      if (!(await confirm({ title: t("Delete this purchase?"), message: t("{asset} is removed from your assets and the {amount} goes back to {wallet}.", { asset: row.asset.name, amount, wallet }), confirmLabel: "Delete", danger: true }))) return;
      run(row, () => deleteAssetAction(businessId, row.asset.id), "Purchase deleted", "Failed to delete the asset");
    }
  }

  return (
    <PageFrame>
      <PageHeader
        title={t("Asset purchases & sales")}
        actions={
          canManage && (
            <Button onClick={() => setPopup("purchase")} className="rounded-full px-4.5">
              <Plus strokeWidth={2.5} className="size-4" />
              {t("New transaction")}
            </Button>
          )
        }
      />
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add, sell or update assets in this workspace.")}</ReadOnlyNote>}

      <Card padding="none" className="overflow-hidden" role="region" aria-label={t("Asset transactions")}>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-divider p-3">
          <Input
            size="sm"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            leading={<Search />}
            placeholder={t("Search asset, category or details…")}
            aria-label={t("Search asset transactions")}
            frameClassName="h-10 min-w-60 flex-1"
          />
          <SegmentedControl
            options={[
              { value: "all", label: "All" },
              { value: "PURCHASE", label: "Purchase", dot: "var(--expense)" },
              { value: "SALE", label: "Sale", dot: "var(--income)" },
            ]}
            value={filter}
            onChange={setFilter}
            label="Type"
            variant="pill"
          />
        </div>

        <div className={cn("hidden items-center gap-x-4 border-b border-divider bg-table-head px-5 py-2.5 text-caption font-semibold text-ink-muted md:grid", COLUMNS)}>
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
          <p className="px-6 py-10 text-center text-small text-ink-muted">{all.length === 0 ? t("No purchase or sale yet. A purchase paid from a wallet, or a sale, shows up here.") : t("Nothing matches. Try another word or type.")}</p>
        ) : (
          <ul>
            {rows.map((row, index) => {
              const sale = row.kind === "SALE";
              const busy = busyKey === row.key;
              // A sold asset's purchase can't go until its sale is undone.
              const locked = !sale && row.asset.status === "SOLD";
              return (
                <li key={row.key} aria-busy={busy || undefined} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-divider px-5 py-3 last:border-b-0 md:min-h-16", COLUMNS)}>
                  <span className="text-small text-ink-muted tabular-nums max-md:hidden">{formatCount(index + 1, fmt)}</span>
                  <span className="text-small whitespace-nowrap text-ink-2 tabular-nums max-md:hidden">{formatDate(`${row.date}T00:00:00.000Z`, "d MMM yyyy", fmt)}</span>
                  <span className="max-md:hidden">
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.75 text-caption font-semibold", sale ? "bg-income-soft text-income" : "bg-expense-soft text-expense")}>{t(sale ? "Sale" : "Purchase")}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-3">
                    <AssetTypeTile visual={categoryVisual(categories, row.asset.category)} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-body font-semibold text-ink">{row.asset.name}</span>
                      <span className="truncate text-caption text-ink-muted">
                        <span className="md:hidden">{`${t(sale ? "Sale" : "Purchase")} · ${formatDate(`${row.date}T00:00:00.000Z`, "d MMM yyyy", fmt)}${row.asset.notes ? " · " : ""}`}</span>
                        {row.asset.notes}
                      </span>
                    </span>
                  </span>
                  <span className="truncate text-small text-ink-2 max-md:hidden">{t(row.asset.category)}</span>
                  <span className="truncate text-small text-ink-2 max-md:hidden">{walletName(row.accountId)}</span>
                  <span className={cn("text-right text-body font-semibold whitespace-nowrap tabular-nums", sale ? "text-income" : "text-expense")}>
                    {`${sale ? "+" : "−"} ${formatCurrency(row.amount, currency, fmt)}`}
                  </span>
                  <span className="flex justify-end gap-0.5 max-md:col-span-2">
                    {canManage && (
                      <>
                        <button type="button" onClick={() => setOpened(row.asset)} disabled={busy} aria-label={t("Edit transaction")} title={t("Edit")} className={cn(ROW_ACTION, "text-ink-2 hover:bg-surface-sunken")}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(row)}
                          disabled={busy || locked}
                          aria-label={t("Delete transaction")}
                          title={locked ? t("Undo the sale first, then delete the purchase.") : t("Delete")}
                          className={cn(ROW_ACTION, "text-expense enabled:hover:bg-expense-soft")}
                        >
                          {busy ? <Loader size={14} label={t("Loading...")} /> : <Trash2 className="size-4" aria-hidden="true" />}
                        </button>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {all.length > 0 && (
          <p className="border-t border-divider px-5 py-3 text-caption text-ink-muted">
            {t("Showing {shown} of {total} transactions · newest first", { shown: formatCount(rows.length, fmt), total: formatCount(all.length, fmt) })}
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
            totalValue={totalValue}
            currency={currency}
            initialMode="buy"
            tabs={tabs}
            title={t("New asset transaction")}
          />
          <SellAssetDrawer open={popup === "sale"} onClose={() => setPopup(null)} businessId={businessId} asset={null} choices={owned} categories={categories} currency={currency} tabs={tabs} title={t("New asset transaction")} />
        </>
      )}
      <UpdateValueDrawer open={opened !== null && opened.status !== "SOLD"} onClose={() => setOpened(null)} businessId={businessId} asset={opened?.status === "SOLD" ? null : opened} categories={categories} currency={currency} />
      <SoldAssetDrawer open={opened?.status === "SOLD"} onClose={() => setOpened(null)} businessId={businessId} asset={opened?.status === "SOLD" ? opened : null} categories={categories} currency={currency} canManage={canManage} />
      {confirmDialog}
    </PageFrame>
  );
}
