"use client";

import { FileText, LayoutGrid, Package, Pencil, Plus, Search, Table2, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useStoredChoice } from "@/components/modules/Customer/Balance/useStoredChoice";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import IconAction from "@/components/smartly/IconAction";
import PageFrame from "@/components/smartly/PageFrame";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { deleteAssetAction } from "@/lib/customer/assetActions";
import { assetGain, assetsSummary, assetWorth, categoryVisual, gainChip, updateCount } from "@/lib/customer/assetDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetDrawer } from "./AssetDrawer";
import { AssetTypeTile } from "./AssetTypeTile";
import { ReadOnlyNote } from "./ReadOnlyNote";
import { SoldAssetDrawer } from "./SoldAssetDrawer";
import { UpdateValueDrawer } from "./UpdateValueDrawer";

interface MyAssetsPageClientProps {
  businessId: string;
  // Every asset, owned and sold.
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
}

type Status = "all" | "ACTIVE" | "SOLD";
type View = "cards" | "table";
const VIEWS = ["cards", "table"] as const;

// The card's button covers the card (its ::after), so the card draws the
// focus ring the button can't show on its own.
const CARD_FOCUS = [
  "has-[[data-slot=card-action]:focus-visible]:outline-2",
  "has-[[data-slot=card-action]:focus-visible]:outline-offset-2",
  "has-[[data-slot=card-action]:focus-visible]:outline-(--focus-ring)",
].join(" ");

// The board's table: Asset, You paid, Value today, Gain or loss, Value
// updates, Status, Actions.
const COLUMNS = "md:grid-cols-[minmax(0,1.6fr)_130px_150px_minmax(150px,1fr)_110px_90px_80px]";
const TONE_TEXT = { income: "text-income", expense: "text-expense", neutral: "text-ink-muted" } as const;
const TONE_CHIP = { income: "bg-income-soft text-income", expense: "bg-expense-soft text-expense", neutral: "bg-surface-sunken text-ink-soft" } as const;

// All assets: everything owned or sold as cards or a table, newest purchase
// first, with a search (name, category or note) and the category and
// status filters. An owned card opens Update value and a sold one the sale;
// Edit opens an asset's details, Delete removes one added by mistake.
export function MyAssetsPageClient({ businessId, assets, categories, currency, canManage }: MyAssetsPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [status, setStatus] = useState<Status>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useStoredChoice<View>("smartly-asset-view", VIEWS, "cards");
  const [addOpen, setAddOpen] = useState(false);
  const [opened, setOpened] = useState<{ asset: Asset; details: boolean } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  const { totalValue } = assetsSummary(assets);
  const counts = new Map<string, number>();
  for (const asset of assets) counts.set(asset.category, (counts.get(asset.category) ?? 0) + 1);
  // The categories in use first as the category list orders them, then any
  // an asset still carries after its category was deleted.
  const names = [...categories.map((option) => option.name).filter((name) => counts.has(name)), ...[...counts.keys()].filter((name) => !categories.some((option) => option.name === name))];
  // A category the link names that no asset has shows everything.
  const active = names.includes(category) ? category : "";
  const q = search.trim().toLowerCase();
  const shown = assets
    .filter((asset) => (!active || asset.category === active) && (status === "all" || asset.status === status))
    .filter((asset) => !q || [asset.name, asset.category, t(asset.category), asset.notes ?? ""].some((text) => text.toLowerCase().includes(q)))
    .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const updatesLabel = (count: number) => (count === 0 ? t("None yet") : t(count === 1 ? "{count} update" : "{count} updates", { count: formatCount(count, fmt) }));
  const showAll = () => {
    setCategory("");
    setStatus("all");
    setSearch("");
  };

  async function remove(asset: Asset) {
    if (busyId) return;
    const updates = updateCount(asset);
    const lines = [
      t("Use this for an asset added by mistake. It is removed from every Assets page."),
      updates > 0 ? t(updates === 1 ? "Its {count} value update will be deleted too." : "Its {count} value updates will be deleted too.", { count: formatCount(updates, fmt) }) : null,
      asset.purchaseAccountId ? t("The {amount} payment leaves the Balance ledger, so that balance goes back up.", { amount: money(asset.purchasePrice) }) : null,
    ];
    if (!(await confirm({ title: t("Delete {name}?", { name: asset.name }), message: lines.filter(Boolean).join(" "), confirmLabel: "Delete", danger: true }))) return;
    setBusyId(asset.id);
    startDelete(async () => {
      try {
        const result = await deleteAssetAction(businessId, asset.id);
        if (result.success) {
          toast.success(t("{name} deleted", { name: asset.name }));
          router.refresh();
        } else {
          toast.error(t(result.message ?? "Failed to delete the asset"));
        }
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      } finally {
        setBusyId(null);
      }
    });
  }

  // Edit and Delete, for those who may; a sold asset's sale is undone first.
  const actions = (asset: Asset) => {
    if (!canManage) return null;
    const sold = asset.status === "SOLD";
    const busy = busyId === asset.id;
    return (
      <span className="relative z-10 flex shrink-0 gap-1.5">
        <IconAction onClick={() => setOpened({ asset, details: true })} disabled={busy} aria-label={t("Edit {name}", { name: asset.name })} title={t("Edit")}>
          <Pencil aria-hidden="true" />
        </IconAction>
        <IconAction tone="danger" onClick={() => remove(asset)} disabled={busy || sold} aria-label={t("Delete {name}", { name: asset.name })} title={sold ? t("Undo the sale first, then delete the asset.") : t("Delete")}>
          {busy ? <Loader size={14} label={t("Loading...")} /> : <Trash2 aria-hidden="true" />}
        </IconAction>
      </span>
    );
  };

  const totals = shown.filter((asset) => status === "SOLD" || asset.status === "ACTIVE");
  const totalPaid = totals.reduce((sum, asset) => sum + Number(asset.purchasePrice), 0);
  const totalWorth = totals.reduce((sum, asset) => sum + assetWorth(asset), 0);
  const totalDiff = totalWorth - totalPaid;

  return (
    <PageFrame className="gap-5 leading-[normal]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-page-title text-ink">{t("All assets")}</h1>
        {canManage && (
          <Button onClick={() => setAddOpen(true)} className="h-10 shrink-0 rounded-full px-4">
            <Plus strokeWidth={2.5} className="size-4" />
            {t("Add asset")}
          </Button>
        )}
      </div>
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add, sell or update assets in this workspace.")}</ReadOnlyNote>}

      {assets.length === 0 ? (
        <EmptyState icon={<Package />} title={t("Nothing owned yet")} description={t("Add what you already own, or buy something new, and it shows up here.")} action={canManage && <Button onClick={() => setAddOpen(true)}>{t("Add asset")}</Button>} className="min-h-80" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <Input
              size="sm"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setSearch("")}
              leading={<Search />}
              placeholder={t("Search assets by name, category or note…")}
              aria-label={t("Search assets")}
              frameClassName="h-11 min-w-0 flex-1 basis-60 rounded-[10px]"
            />
            <NativeSelect aria-label={t("Category")} value={active} onChange={(event) => setCategory(event.target.value)} frameClassName="h-11 w-50 rounded-[10px] max-sm:flex-1" className="text-[14px] font-semibold">
              <option value="">{`${t("All categories")} (${formatCount(assets.length, fmt)})`}</option>
              {names.map((name) => (
                <option key={name} value={name}>
                  {`${t(name)} (${formatCount(counts.get(name) ?? 0, fmt)})`}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect aria-label={t("Status")} value={status} onChange={(event) => setStatus(event.target.value as Status)} frameClassName="h-11 w-45 rounded-[10px] max-sm:flex-1" className="text-[14px] font-semibold">
              <option value="all">{t("All status")}</option>
              <option value="ACTIVE">{t("Active")}</option>
              <option value="SOLD">{t("Sold")}</option>
            </NativeSelect>
            <div role="group" aria-label={t("View")} className="flex shrink-0 gap-0.5 rounded-full bg-surface-sunken p-0.75">
              {(
                [
                  { value: "cards", label: "Card view", icon: LayoutGrid },
                  { value: "table", label: "Table view", icon: Table2 },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={view === option.value}
                  aria-label={t(option.label)}
                  title={t(option.label)}
                  onClick={() => setView(option.value)}
                  className={cn("flex h-9 w-9.5 items-center justify-center rounded-full", view === option.value ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.12)] dark:bg-surface-raised" : "text-ink-faint hover:text-ink")}
                >
                  <option.icon className="size-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <EmptyState
              icon={<Package />}
              title={t("No assets match your search or filters.")}
              action={
                <>
                  <Button variant="secondary" onClick={showAll}>
                    {t("Show all")}
                  </Button>
                  {canManage && <Button onClick={() => setAddOpen(true)}>{t("Add asset")}</Button>}
                </>
              }
            />
          ) : view === "cards" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shown.map((asset) => {
                const sold = asset.status === "SOLD";
                const visual = categoryVisual(categories, asset.category);
                const gain = assetGain(asset);
                const since = formatDate(asset.purchaseDate, "MMM yyyy", fmt);
                // An owned card updates its value (for those who may); a sold one
                // opens the sale for anyone.
                const clickable = sold || canManage;
                return (
                  <Card key={asset.id} padding="none" interactive={clickable} className={cn("group relative flex flex-col gap-4 rounded-[18px] p-4.5", clickable && CARD_FOCUS, sold && "bg-strip")}>
                    <div className="flex items-start gap-3">
                      <AssetTypeTile visual={visual} size="xl" glossy className="rounded-[16px]" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.75 pt-0.5">
                        {clickable ? (
                          // The whole card is this one button: a div card, so
                          // the figures inside stay plain text.
                          <button
                            type="button"
                            data-slot="card-action"
                            onClick={() => setOpened({ asset, details: false })}
                            aria-label={t(sold ? "See the sale of {name}" : "Update value of {name}", { name: asset.name })}
                            className="truncate text-left text-[15px] font-semibold text-ink after:absolute after:inset-0 after:rounded-[18px] focus-visible:outline-none"
                          >
                            {asset.name}
                          </button>
                        ) : (
                          <span className="truncate text-[15px] font-semibold text-ink">{asset.name}</span>
                        )}
                        <span className="truncate text-[12.5px] text-ink-muted">{t("{type} · since {month}", { type: t(asset.category), month: since })}</span>
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-0.75 text-[12px] font-bold", sold ? "bg-surface-sunken text-ink-soft" : "bg-income-soft text-income")}>{t(sold ? "Sold" : "Active")}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] text-ink-muted">{t(sold ? "Sold for" : "Value today")}</span>
                      <span className={cn("text-[26px] font-bold tracking-[-0.02em] tabular-nums", sold ? "text-ink-muted" : "text-ink")}>{money(assetWorth(asset))}</span>
                      <span className={cn("text-[12.5px] font-semibold tabular-nums", gain.amount > 0 ? "text-income" : gain.amount < 0 ? "text-expense" : "text-ink-muted")}>
                        {gain.amount === 0 ? t("Same as you paid") : t(sold ? "{amount} vs what you paid" : "{amount} since you bought it", { amount: formatSignedCurrency(gain.amount, currency, fmt) })}
                      </span>
                    </div>
                    {/* Two cells on a hairline grid: what was paid, and how often the value was checked since. */}
                    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-line-card">
                      <div className="flex flex-col gap-0.5 bg-strip px-3 py-2.5">
                        <dt className="text-[11.5px] text-ink-muted">{t("You paid")}</dt>
                        <dd className="text-[13.5px] font-semibold text-ink-2 tabular-nums">{money(asset.purchasePrice)}</dd>
                      </div>
                      <div className="flex flex-col gap-0.5 bg-strip px-3 py-2.5">
                        <dt className="text-[11.5px] text-ink-muted">{t("Value updates")}</dt>
                        <dd className="text-[13.5px] font-semibold text-ink-2">{updatesLabel(updateCount(asset))}</dd>
                      </div>
                    </dl>
                    <div className="mt-auto flex items-center gap-2.5 border-t border-divider pt-3">
                      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[12.5px] text-ink-soft">
                        {asset.notes && (
                          <>
                            <FileText className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                            <span className="truncate">{asset.notes}</span>
                          </>
                        )}
                      </span>
                      {actions(asset)}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card padding="none" className="overflow-hidden rounded-[18px]" role="region" aria-label={t("Assets table")}>
              <div className={cn("hidden items-center gap-x-4 border-b border-line bg-table-head px-5 py-3 text-caption font-medium text-ink-muted md:grid", COLUMNS)}>
                <span>{t("Asset")}</span>
                <span className="text-right">{t("You paid")}</span>
                <span className="text-right">{t("Value today")}</span>
                <span className="text-right">{t("Gain or loss")}</span>
                <span className="text-right">{t("Value updates")}</span>
                <span>{t("Status")}</span>
                <span className="text-right">{t("Actions")}</span>
              </div>
              <ul>
                {shown.map((asset) => {
                  const sold = asset.status === "SOLD";
                  const gain = assetGain(asset);
                  const chip = gainChip(gain.percent);
                  return (
                    <li key={asset.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-divider px-5 py-2.5 tabular-nums md:min-h-16.5", COLUMNS, sold && "bg-strip")}>
                      <span className="flex min-w-0 items-center gap-3">
                        <AssetTypeTile visual={categoryVisual(categories, asset.category)} glossy className="size-9.5 rounded-[12px] [&_svg]:size-5" />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <button type="button" onClick={() => (sold || canManage) && setOpened({ asset, details: false })} disabled={!sold && !canManage} className="truncate text-left text-[14.5px] font-semibold text-ink enabled:hover:underline disabled:cursor-default">
                            {asset.name}
                          </button>
                          <span className="truncate text-[12px] text-ink-muted">{t("{type} · since {month}", { type: t(asset.category), month: formatDate(asset.purchaseDate, "MMM yyyy", fmt) })}</span>
                        </span>
                      </span>
                      <span className="text-right text-[14px] text-ink-soft max-md:hidden">{money(asset.purchasePrice)}</span>
                      <span className="flex flex-col items-end gap-px">
                        <span className={cn("text-[15px] font-bold whitespace-nowrap", sold ? "text-ink-muted" : "text-ink")}>{money(assetWorth(asset))}</span>
                        {sold && <span className="text-[11.5px] text-ink-muted">{t("Sold for")}</span>}
                      </span>
                      <span className="flex min-w-0 items-center justify-end gap-2 max-md:hidden">
                        <span className={cn("text-[13.5px] font-semibold whitespace-nowrap", TONE_TEXT[chip.tone])}>{gain.amount === 0 ? money(0) : formatSignedCurrency(gain.amount, currency, fmt)}</span>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-bold", TONE_CHIP[chip.tone])}>{toLocaleDigits(chip.label, fmt)}</span>
                      </span>
                      <span className="text-right text-[13px] text-ink-soft max-md:hidden">{updatesLabel(updateCount(asset))}</span>
                      <span className="max-md:hidden">
                        <span className={cn("rounded-full px-2.5 py-0.75 text-[12px] font-bold", sold ? "bg-surface-sunken text-ink-soft" : "bg-income-soft text-income")}>{t(sold ? "Sold" : "Active")}</span>
                      </span>
                      <span className="flex justify-end max-md:col-span-2">{actions(asset)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-t border-line bg-table-head px-5 py-3 text-[13px] font-bold text-ink tabular-nums", COLUMNS)}>
                <span>{`${t(status === "SOLD" ? "Sold total" : "Active total")} · ${t(totals.length === 1 ? "{count} asset" : "{count} assets", { count: formatCount(totals.length, fmt) })}`}</span>
                <span className="text-right max-md:hidden">{money(totalPaid)}</span>
                <span className="text-right">{money(totalWorth)}</span>
                <span className={cn("text-right max-md:hidden", totalDiff > 0 ? "text-emerald" : totalDiff < 0 ? "text-expense" : "text-ink-muted")}>{totalDiff === 0 ? money(0) : formatSignedCurrency(totalDiff, currency, fmt)}</span>
              </div>
            </Card>
          )}
        </>
      )}

      <AssetDrawer open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} categories={categories} totalValue={totalValue} currency={currency} variant="add" initialCategory={active || undefined} />
      <UpdateValueDrawer
        open={opened !== null && opened.asset.status !== "SOLD"}
        onClose={() => setOpened(null)}
        businessId={businessId}
        asset={opened && opened.asset.status !== "SOLD" ? opened.asset : null}
        categories={categories}
        currency={currency}
        initialMode={opened?.details ? "details" : "value"}
      />
      <SoldAssetDrawer open={opened?.asset.status === "SOLD"} onClose={() => setOpened(null)} businessId={businessId} asset={opened?.asset.status === "SOLD" ? opened.asset : null} categories={categories} currency={currency} canManage={canManage} />
      {confirmDialog}
    </PageFrame>
  );
}
