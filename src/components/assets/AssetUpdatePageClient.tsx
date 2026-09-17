"use client";

import { Pencil, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { Asset, AssetCategoryOption } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatCurrency } from "@/lib/currency";
import { AssetActionsMenu } from "./AssetActionsMenu";
import { assetCategoryIconFor } from "./assetCategoryDisplay";
import { AssetValueHistoryModal } from "./AssetValueHistoryModal";
import { UpdateAssetValueModal } from "./UpdateAssetValueModal";

interface AssetUpdatePageClientProps {
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
}

// Revaluation-focused: every ACTIVE asset with its purchase price vs
// current tracked value (a rising plot, a depreciating car -- see the
// product spec's own examples) and an "Update Value" action -- deliberately
// no Sell button here, that lives on the Purchase & Sell page.
export function AssetUpdatePageClient({ businessId, assets, categories, currency, canManage }: AssetUpdatePageClientProps) {
  const { t } = useLocale();
  const [valueTarget, setValueTarget] = useState<Asset | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Asset | null>(null);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">{t("Assets Management")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("Update each asset's current market value as it appreciates or depreciates.")}</p>

      <div className="mt-6 rounded-2xl bg-surface shadow-sm shadow-black/5">
        {assets.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">{t("No assets yet -- purchase one first under Purchase & Sell Asset.")}</p>
        ) : (
          <div className="divide-y divide-neutral-50">
            {assets.map((asset) => {
              const Icon = assetCategoryIconFor(categories, asset.category);
              const change = Number(asset.currentValue) - Number(asset.purchasePrice);
              const changePercent = Number(asset.purchasePrice) > 0 ? (change / Number(asset.purchasePrice)) * 100 : 0;
              return (
                <div key={asset.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{asset.name}</p>
                      <p className="truncate text-xs text-neutral-400">
                        {asset.category} &middot; {t("Purchased at")} {formatCurrency(asset.purchasePrice, currency)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-neutral-900">{formatCurrency(asset.currentValue, currency)}</p>
                      {change !== 0 && (
                        <p className={`flex items-center justify-end gap-1 text-xs font-medium ${change > 0 ? "text-brand-primary" : "text-brand-danger"}`}>
                          {change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {changePercent > 0 ? "+" : ""}
                          {changePercent.toFixed(1)}%
                        </p>
                      )}
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setValueTarget(asset)}
                        className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t("Update Value")}
                      </button>
                    )}
                    <AssetActionsMenu onViewDetails={() => setDetailsTarget(asset)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <UpdateAssetValueModal open={!!valueTarget} onClose={() => setValueTarget(null)} businessId={businessId} asset={valueTarget} currency={currency} />
      <AssetValueHistoryModal open={!!detailsTarget} onClose={() => setDetailsTarget(null)} asset={detailsTarget} currency={currency} />
    </div>
  );
}
