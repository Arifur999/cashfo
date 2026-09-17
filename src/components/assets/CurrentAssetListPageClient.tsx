"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";
import type { Asset, AssetCategoryOption } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatCurrency } from "@/lib/currency";
import { AddCurrentAssetModal } from "./AddCurrentAssetModal";
import { assetCategoryIconFor } from "./assetCategoryDisplay";

interface CurrentAssetListPageClientProps {
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
}

// A read-only reference table of everything currently owned (ACTIVE only --
// a sold asset belongs on the Dashboard's full history view, not here),
// plus an "Add Assets" shortcut (AddCurrentAssetModal -- a simpler,
// Account-less entry form, see its own comment) so an empty/short list
// isn't a dead end. Selling and revaluing still only happen on their own
// dedicated pages (Purchase & Sell Asset / Asset update). Total Asset
// Value sits at the top (not just a bottom table row) and search is a
// plain client-side name filter -- this list is never paginated/large
// enough to need a server round-trip.
export function CurrentAssetListPageClient({ businessId, assets, categories, currency, canManage }: CurrentAssetListPageClientProps) {
  const { t } = useLocale();
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredAssets = search.trim() ? assets.filter((a) => a.name.toLowerCase().includes(search.trim().toLowerCase())) : assets;
  const total = assets.reduce((sum, a) => sum + Number(a.currentValue), 0);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("Current Asset List")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("Everything you currently own, at a glance.")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search asset name...")}
              className="w-64 rounded-xl border border-neutral-200 bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary"
            />
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setPurchaseOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
            >
              <Plus className="h-4 w-4" />
              {t("Add Assets")}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
        <p className="text-sm text-neutral-500">{t("Total Asset Value")}</p>
        <p className="mt-1 text-2xl font-bold text-neutral-900">{formatCurrency(total, currency)}</p>
      </div>

      <div className="mt-4 rounded-2xl bg-surface shadow-sm shadow-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t("Asset")}</th>
                <th className="px-4 py-3">{t("Category")}</th>
                <th className="px-4 py-3">{t("Purchase Date")}</th>
                <th className="px-4 py-3">{t("Purchase Price")}</th>
                <th className="px-4 py-3">{t("Notes")}</th>
                <th className="px-4 py-3 text-right">{t("Current Value")}</th>
              </tr>
            </thead>
            {filteredAssets.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-neutral-400">
                    {assets.length === 0 ? t("No assets currently owned.") : t("No assets match your search.")}
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-neutral-50">
                {filteredAssets.map((asset, index) => {
                  const Icon = assetCategoryIconFor(categories, asset.category);
                  return (
                    <tr key={asset.id}>
                      <td className="px-4 py-3 text-neutral-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-medium text-neutral-900">{asset.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{asset.category}</td>
                      <td className="px-4 py-3 text-neutral-500">
                        {new Date(asset.purchaseDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{formatCurrency(asset.purchasePrice, currency)}</td>
                      <td className="max-w-[16rem] truncate px-4 py-3 text-neutral-500">{asset.notes || <span className="text-neutral-300">--</span>}</td>
                      <td className="px-4 py-3 text-right font-semibold text-neutral-900">{formatCurrency(asset.currentValue, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>
      </div>

      <AddCurrentAssetModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} businessId={businessId} currency={currency} />
    </div>
  );
}
