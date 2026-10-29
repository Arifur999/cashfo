"use client";

import { FileText, Package, Plus, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { assetGain, assetsSummary, assetWorth, categoryVisual, updateCount } from "@/lib/customer/assetDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount } from "@/lib/i18n/digits";
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

// The card's button covers the card (its ::after), so the card draws the
// focus ring the button can't show on its own.
const CARD_FOCUS = [
  "has-[[data-slot=card-action]:focus-visible]:outline-2",
  "has-[[data-slot=card-action]:focus-visible]:outline-offset-2",
  "has-[[data-slot=card-action]:focus-visible]:outline-(--focus-ring)",
].join(" ");

// All assets: everything owned or sold as cards, newest purchase first,
// with a search (name, category or note) and the category and status
// filters. An owned card opens Update value; a sold one, the sale.
export function MyAssetsPageClient({ businessId, assets, categories, currency, canManage }: MyAssetsPageClientProps) {
  const { t, fmt } = useLocale();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [status, setStatus] = useState<Status>("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [opened, setOpened] = useState<Asset | null>(null);

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
  const showAll = () => {
    setCategory("");
    setStatus("all");
    setSearch("");
  };

  return (
    <PageFrame>
      <PageHeader
        title={t("All assets")}
        actions={
          canManage && (
            <Button onClick={() => setAddOpen(true)} className="rounded-full px-4.5">
              <Plus strokeWidth={2.5} className="size-4" />
              {t("Add asset")}
            </Button>
          )
        }
      />
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add, sell or update assets in this workspace.")}</ReadOnlyNote>}

      {assets.length === 0 ? (
        <EmptyState icon={<Package />} title={t("Nothing owned yet")} description={t("Add what you already own, or buy something new, and it shows up here.")} action={canManage && <Button onClick={() => setAddOpen(true)}>{t("Add asset")}</Button>} className="min-h-80" />
      ) : (
        <>
          <Card padding="none" className="flex flex-wrap items-center gap-2.5 p-3">
            <Input
              size="sm"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              leading={<Search />}
              placeholder={t("Search assets by name, category or note…")}
              aria-label={t("Search assets")}
              frameClassName="h-10 min-w-60 flex-1"
            />
            <NativeSelect size="sm" aria-label={t("Category")} value={active} onChange={(event) => setCategory(event.target.value)} frameClassName="w-50 max-sm:flex-1" className="h-10">
              <option value="">{`${t("All categories")} (${formatCount(assets.length, fmt)})`}</option>
              {names.map((name) => (
                <option key={name} value={name}>
                  {`${t(name)} (${formatCount(counts.get(name) ?? 0, fmt)})`}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect size="sm" aria-label={t("Status")} value={status} onChange={(event) => setStatus(event.target.value as Status)} frameClassName="w-45 max-sm:flex-1" className="h-10">
              <option value="all">{t("All status")}</option>
              <option value="ACTIVE">{t("Active")}</option>
              <option value="SOLD">{t("Sold")}</option>
            </NativeSelect>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shown.length === 0 && (
              <EmptyState
                icon={<Package />}
                title={t("No asset matches")}
                action={
                  <>
                    <Button variant="secondary" onClick={showAll}>
                      {t("Show all")}
                    </Button>
                    {canManage && <Button onClick={() => setAddOpen(true)}>{t("Add asset")}</Button>}
                  </>
                }
                className="md:col-span-2 lg:col-span-3"
              />
            )}
            {shown.map((asset) => {
              const sold = asset.status === "SOLD";
              const visual = categoryVisual(categories, asset.category);
              const gain = assetGain(asset);
              const updates = updateCount(asset);
              const since = formatDate(asset.purchaseDate, "MMM yyyy", fmt);
              // An owned card updates its value (for those who may); a sold one
              // opens the sale for anyone.
              const clickable = sold || canManage;
              return (
                <Card key={asset.id} padding="none" interactive={clickable} className={cn("group relative flex flex-col gap-4 p-4.5", clickable && CARD_FOCUS, sold && "bg-strip")}>
                  <div className="flex items-start gap-3">
                    <AssetTypeTile visual={visual} size="xl" glossy />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.75 pt-0.5">
                      {clickable ? (
                        // The whole card is this one button: a div card, so
                        // the figures inside stay plain text.
                        <button
                          type="button"
                          data-slot="card-action"
                          onClick={() => setOpened(asset)}
                          aria-label={t(sold ? "See the sale of {name}" : "Update value of {name}", { name: asset.name })}
                          className="truncate text-left text-[15px] leading-[normal] font-semibold text-ink after:absolute after:inset-0 after:rounded-card focus-visible:outline-none"
                        >
                          {asset.name}
                        </button>
                      ) : (
                        <span className="truncate text-[15px] leading-[normal] font-semibold text-ink">{asset.name}</span>
                      )}
                      <span className="truncate text-[12.5px] leading-[normal] text-ink-muted">{t("{type} · since {month}", { type: t(asset.category), month: since })}</span>
                    </span>
                    <Chip tone={sold ? "neutral" : "income"} size="sm" className="font-semibold">
                      {t(sold ? "Sold" : "Active")}
                    </Chip>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-caption font-normal text-ink-muted">{t(sold ? "Sold for" : "Value today")}</span>
                    <span className={cn("text-[26px] leading-[normal] font-bold tracking-[-0.02em] tabular-nums", sold ? "text-ink-muted" : "text-ink")}>{formatCurrency(assetWorth(asset), currency, fmt)}</span>
                    <span className={cn("text-[12.5px] leading-[normal] font-semibold tabular-nums", gain.amount > 0 ? "text-income" : gain.amount < 0 ? "text-expense" : "text-ink-muted")}>
                      {gain.amount === 0
                        ? t("Same as you paid")
                        : t(sold ? "{amount} vs what you paid" : "{amount} since you bought it", { amount: formatSignedCurrency(gain.amount, currency, fmt) })}
                    </span>
                  </div>
                  {/* Two cells on a hairline grid: what was paid, and how often the value was checked since. */}
                  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-line-card">
                    <div className="flex flex-col gap-0.5 bg-strip px-3 py-2.5">
                      <dt className="text-[11.5px] leading-[normal] text-ink-muted">{t("You paid")}</dt>
                      <dd className="text-[13.5px] leading-[normal] font-semibold text-ink-2 tabular-nums">{formatCurrency(asset.purchasePrice, currency, fmt)}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-strip px-3 py-2.5">
                      <dt className="text-[11.5px] leading-[normal] text-ink-muted">{t("Value updates")}</dt>
                      <dd className="text-[13.5px] leading-[normal] font-semibold text-ink-2">{updates === 0 ? t("None yet") : t(updates === 1 ? "{count} update" : "{count} updates", { count: formatCount(updates, fmt) })}</dd>
                    </div>
                  </dl>
                  {asset.notes && (
                    <span className="-mt-1 flex min-w-0 items-center gap-1.5 text-[12.5px] leading-[normal] text-ink-soft">
                      <FileText className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                      <span className="truncate">{asset.notes}</span>
                    </span>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <AssetDrawer open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} categories={categories} totalValue={totalValue} currency={currency} variant="add" initialCategory={active || undefined} />
      <UpdateValueDrawer open={opened !== null && opened.status !== "SOLD"} onClose={() => setOpened(null)} businessId={businessId} asset={opened?.status === "SOLD" ? null : opened} categories={categories} currency={currency} />
      <SoldAssetDrawer open={opened?.status === "SOLD"} onClose={() => setOpened(null)} businessId={businessId} asset={opened?.status === "SOLD" ? opened : null} categories={categories} currency={currency} canManage={canManage} />
    </PageFrame>
  );
}
