"use client";

import { FileText, Package, Plus, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { assetGain, categoryVisual, gainChip, typeChips, updateCount } from "@/lib/customer/assetDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetDrawer } from "./AssetDrawer";
import { AssetTypeTile } from "./AssetTypeTile";
import { ReadOnlyNote } from "./ReadOnlyNote";
import { UpdateValueDrawer } from "./UpdateValueDrawer";

interface MyAssetsPageClientProps {
  businessId: string;
  // Owned assets only.
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
}

// The card's button covers the card (its ::after), so the card draws the
// focus ring the button can't show on its own.
const CARD_FOCUS = [
  "has-[[data-slot=card-action]:focus-visible]:outline-2",
  "has-[[data-slot=card-action]:focus-visible]:outline-offset-2",
  "has-[[data-slot=card-action]:focus-visible]:outline-(--focus-ring)",
].join(" ");

// My assets: everything owned as cards, each with today's value, how it
// has moved since purchase, and the line of values it went through.
export function MyAssetsPageClient({ businessId, assets, categories, currency, canManage }: MyAssetsPageClientProps) {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [valuing, setValuing] = useState<Asset | null>(null);

  const total = assets.reduce((sum, asset) => sum + Number(asset.currentValue), 0);
  const counts = new Map<string, number>();
  for (const asset of assets) counts.set(asset.category, (counts.get(asset.category) ?? 0) + 1);
  const chips = typeChips(categories, counts, category);
  // A type the link names that this workspace doesn't have shows everything.
  const active = chips.includes(category) ? category : "";
  const q = search.trim().toLowerCase();
  const shown = assets.filter((asset) => (!active || asset.category === active) && (!q || asset.name.toLowerCase().includes(q)));
  const showAll = () => {
    setCategory("");
    setSearch("");
  };

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Assets")}`}
        title={t("Current assets")}
        description={fillNodes(t(assets.length === 1 ? "{count} thing you own · {amount} today" : "{count} things you own · {amount} today"), {
          count: formatCount(assets.length, locale),
          amount: <b className="font-semibold text-ink">{formatCurrency(total, currency, locale)}</b>,
        })}
        actions={
          <>
            {assets.length > 0 && <Input size="sm" type="search" value={search} onChange={(event) => setSearch(event.target.value)} leading={<Search />} placeholder={t("Search assets…")} aria-label={t("Search assets")} frameClassName="h-10 min-w-0 flex-1 md:w-60 md:flex-none" />}
            {canManage && (
              <Button onClick={() => setAddOpen(true)}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("Add asset")}
              </Button>
            )}
          </>
        }
      />
      {!canManage && <ReadOnlyNote>{t("Only the owner or an accountant can add, sell or update assets in this workspace.")}</ReadOnlyNote>}

      {assets.length === 0 ? (
        <EmptyState icon={<Package />} title={t("Nothing owned yet")} description={t("Add what you already own, or buy something new, and it shows up here.")} action={canManage && <Button onClick={() => setAddOpen(true)}>{t("Add asset")}</Button>} className="min-h-80" />
      ) : (
        <>
          <div role="group" aria-label={t("Filter by category")} className="flex flex-wrap gap-2">
            <FilterChip on={active === ""} onClick={() => setCategory("")} count={formatCount(assets.length, locale)}>
              {t("All")}
            </FilterChip>
            {chips.map((name) => (
              <FilterChip key={name} on={active === name} onClick={() => setCategory(name)} count={formatCount(counts.get(name) ?? 0, locale)} dot={categoryVisual(categories, name).color}>
                {t(name)}
              </FilterChip>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shown.length === 0 && (
              <EmptyState
                icon={<Package />}
                title={active && !q ? t("No {type} assets yet", { type: t(active) }) : t("No asset matches")}
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
              const visual = categoryVisual(categories, asset.category);
              const gain = assetGain(asset);
              const chip = gainChip(gain.percent);
              const updates = updateCount(asset);
              const since = formatDate(asset.purchaseDate, "MMM yyyy", locale);
              return (
                <Card key={asset.id} padding="none" interactive={canManage} className={cn("group relative flex flex-col gap-4 p-4.5", canManage && CARD_FOCUS)}>
                  <div className="flex items-start gap-3">
                    <AssetTypeTile visual={visual} size="xl" glossy />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.75 pt-0.5">
                      {canManage ? (
                        // The whole card is this one button: a div card, so
                        // the figures inside stay plain text.
                        <button type="button" data-slot="card-action" onClick={() => setValuing(asset)} aria-label={t("Update value of {name}", { name: asset.name })} className="truncate text-left text-[15px] leading-[normal] font-semibold text-ink after:absolute after:inset-0 after:rounded-card focus-visible:outline-none">
                          {asset.name}
                        </button>
                      ) : (
                        <span className="truncate text-[15px] leading-[normal] font-semibold text-ink">{asset.name}</span>
                      )}
                      <span className="truncate text-[12.5px] leading-[normal] text-ink-muted">{t("{type} · since {month}", { type: t(asset.category), month: since })}</span>
                    </span>
                    <Chip tone={chip.tone} size="sm" className="font-semibold">
                      {toLocaleDigits(chip.label, locale)}
                    </Chip>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-caption font-normal text-ink-muted">{t("Value today")}</span>
                    <span className="text-[26px] leading-[normal] font-bold tracking-[-0.02em] text-ink tabular-nums">{formatCurrency(asset.currentValue, currency, locale)}</span>
                    <span className={cn("text-[12.5px] leading-[normal] font-semibold tabular-nums", gain.amount > 0 ? "text-income" : gain.amount < 0 ? "text-expense" : "text-ink-muted")}>
                      {gain.amount === 0 ? t("Same as you paid") : t("{amount} since you bought it", { amount: formatSignedCurrency(gain.amount, currency, locale) })}
                    </span>
                  </div>
                  {/* Two cells on a hairline grid: what was paid, and how often the value was checked since. */}
                  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-line-card">
                    <div className="flex flex-col gap-0.5 bg-strip px-3 py-2.5">
                      <dt className="text-[11.5px] leading-[normal] text-ink-muted">{t("You paid")}</dt>
                      <dd className="text-[13.5px] leading-[normal] font-semibold text-ink-2 tabular-nums">{formatCurrency(asset.purchasePrice, currency, locale)}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5 bg-strip px-3 py-2.5">
                      <dt className="text-[11.5px] leading-[normal] text-ink-muted">{t("Value updates")}</dt>
                      <dd className="text-[13.5px] leading-[normal] font-semibold text-ink-2">{updates === 0 ? t("None yet") : t(updates === 1 ? "{count} update" : "{count} updates", { count: formatCount(updates, locale) })}</dd>
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

      <AssetDrawer open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} categories={categories} totalValue={total} currency={currency} initialMode="own" initialCategory={active || undefined} />
      <UpdateValueDrawer open={valuing !== null} onClose={() => setValuing(null)} businessId={businessId} asset={valuing} categories={categories} currency={currency} />
    </PageFrame>
  );
}

function FilterChip({ on, onClick, count, dot, children }: { on: boolean; onClick: () => void; count: string; dot?: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("flex h-8.5 items-center gap-1.5 rounded-full border px-3 text-small transition-colors pointer-coarse:h-11", on ? "border-emerald bg-mint-50 font-semibold text-emerald" : "border-line bg-surface font-medium text-ink-2 hover:border-line-strong")}>
      {dot && <span aria-hidden="true" className="size-2 rounded-full" style={{ background: dot }} />}
      {children} <span className={cn("tabular-nums", on ? "text-emerald" : "text-ink-faint")}>{count}</span>
    </button>
  );
}
