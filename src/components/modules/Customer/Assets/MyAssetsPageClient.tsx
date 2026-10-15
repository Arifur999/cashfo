"use client";

import { Package, Plus, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createElement, useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { assetGain, categoryVisual, gainChip, updateCount, valueTrail } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetDrawer } from "./AssetDrawer";
import { Sparkline } from "./Sparkline";
import { UpdateValueDrawer } from "./UpdateValueDrawer";

interface MyAssetsPageClientProps {
  businessId: string;
  // Owned assets only.
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
}

// My assets: everything owned as cards, each with today's value, how it
// has moved since purchase, and the line of values it went through.
export function MyAssetsPageClient({ businessId, assets, categories, currency, canManage }: MyAssetsPageClientProps) {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [valuing, setValuing] = useState<Asset | null>(null);

  const total = assets.reduce((sum, asset) => sum + Number(asset.currentValue), 0);
  const q = search.trim().toLowerCase();
  const shown = assets.filter((asset) => (!category || asset.category === category) && (!q || asset.name.toLowerCase().includes(q)));
  const counts = new Map<string, number>();
  for (const asset of assets) counts.set(asset.category, (counts.get(asset.category) ?? 0) + 1);
  const chips = [...categories.map((option) => option.name), ...[...counts.keys()].filter((name) => !categories.some((option) => option.name === name))].filter((name) => counts.has(name));

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Assets")}`}
        title={t("My assets")}
        description={
          <>
            {assets.length} {t(assets.length === 1 ? "thing you own" : "things you own")} · <b className="font-semibold text-ink">{formatCurrency(total, currency)}</b> {t("today")}
          </>
        }
        actions={
          <>
            {assets.length > 0 && <Input size="sm" type="search" value={search} onChange={(event) => setSearch(event.target.value)} leading={<Search />} placeholder={t("Search assets…")} aria-label={t("Search assets")} frameClassName="h-10 w-60" />}
            {canManage && (
              <Button onClick={() => setAddOpen(true)}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("Add asset")}
              </Button>
            )}
          </>
        }
      />

      {assets.length === 0 ? (
        <EmptyState icon={<Package />} title={t("Nothing owned yet")} description={t("Add what you already own, or buy something new, and it shows up here.")} action={canManage && <Button onClick={() => setAddOpen(true)}>{t("Add asset")}</Button>} className="min-h-80" />
      ) : (
        <>
          <div role="group" aria-label={t("Filter by category")} className="flex flex-wrap gap-2">
            <FilterChip on={category === ""} onClick={() => setCategory("")} count={assets.length}>
              {t("All")}
            </FilterChip>
            {chips.map((name) => (
              <FilterChip key={name} on={category === name} onClick={() => setCategory(name)} count={counts.get(name) ?? 0} dot={categoryVisual(categories, name).hex}>
                {name}
              </FilterChip>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shown.length === 0 && <p className="py-8 text-center text-body text-ink-muted md:col-span-2 lg:col-span-3">{t("No asset matches")}</p>}
            {shown.map((asset) => {
              const visual = categoryVisual(categories, asset.category);
              const chip = gainChip(assetGain(asset).percent);
              const updates = updateCount(asset);
              const body = (
                <>
                  <div className="flex items-center gap-3">
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.5", visual.tone.bg, visual.tone.fg)}>{createElement(visual.icon, { "aria-hidden": true })}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="truncate text-title text-ink">{asset.name}</span>
                      <span className="text-caption font-normal text-ink-muted">{asset.category}</span>
                    </span>
                    <Chip tone={chip.tone} size="sm" className="font-semibold">
                      {chip.label}
                    </Chip>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <span className="flex flex-col gap-0.5">
                      <span className="text-caption font-normal text-ink-muted">{t("Value today")}</span>
                      <span className="text-h2 tracking-[-0.01em] text-ink tabular-nums">{formatCurrency(asset.currentValue, currency)}</span>
                    </span>
                    <Sparkline values={valueTrail(asset)} label={t("Value over time")} />
                  </div>
                  <div className="flex justify-between gap-3 border-t border-surface-sunken pt-3 text-caption font-normal text-ink-muted">
                    <span>
                      {t("Paid")} <b className="font-semibold text-ink-2 tabular-nums">{formatCurrency(asset.purchasePrice, currency)}</b> · {formatDate(asset.purchaseDate, "MMM yyyy")}
                    </span>
                    <span>{updates === 0 ? t("Never updated") : `${updates} ${t(updates === 1 ? "update" : "updates")}`}</span>
                  </div>
                  {asset.notes && <span className="-mt-1 truncate text-caption font-normal text-ink-muted">{asset.notes}</span>}
                </>
              );
              return canManage ? (
                <Card key={asset.id} asChild interactive className="flex flex-col gap-3 text-left">
                  <button type="button" onClick={() => setValuing(asset)}>
                    {body}
                  </button>
                </Card>
              ) : (
                <Card key={asset.id} className="flex flex-col gap-3">
                  {body}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <AssetDrawer open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} categories={categories} totalValue={total} currency={currency} initialMode="own" />
      <UpdateValueDrawer open={valuing !== null} onClose={() => setValuing(null)} businessId={businessId} asset={valuing} categories={categories} currency={currency} />
    </PageFrame>
  );
}

function FilterChip({ on, onClick, count, dot, children }: { on: boolean; onClick: () => void; count: number; dot?: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("flex h-8.5 items-center gap-2 rounded-full border px-3 text-small transition-colors", on ? "border-[1.5px] border-emerald bg-mint-50 font-semibold text-emerald" : "border-line bg-surface font-medium text-ink-2 hover:border-line-strong")}>
      {dot && <span aria-hidden="true" className="size-2 rounded-full" style={{ background: dot }} />}
      {children} <span className={cn("tabular-nums", on ? "text-emerald/80" : "text-ink-muted")}>{count}</span>
    </button>
  );
}
