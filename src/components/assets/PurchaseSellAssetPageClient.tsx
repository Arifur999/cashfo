"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { Asset, AssetCategoryOption } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { assetCategoryIconFor } from "./assetCategoryDisplay";
import { PurchaseAssetModal } from "./PurchaseAssetModal";
import { SellAssetModal } from "./SellAssetModal";

interface PurchaseSellAssetPageClientProps {
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
  canManage: boolean;
}

// Action-focused: just the two money-moving operations (buying a new asset,
// selling an owned one), without the Dashboard's stats/filters or the Asset
// update page's revaluation focus -- deliberately no "Update Value" button
// here, that lives on its own page.
export function PurchaseSellAssetPageClient({ businessId, assets, categories, currency, canManage }: PurchaseSellAssetPageClientProps) {
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [sellTarget, setSellTarget] = useState<Asset | null>(null);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Assets Management</h1>
          <p className="mt-1 text-sm text-neutral-500">Purchase a new asset, or sell one you currently own.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setPurchaseOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Purchase Asset
          </button>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-surface shadow-sm shadow-black/5">
        <div className="border-b border-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-700">Sell an Asset</div>
        {assets.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">No assets to sell yet -- purchase one first.</p>
        ) : (
          <div className="divide-y divide-neutral-50">
            {assets.map((asset) => {
              const Icon = assetCategoryIconFor(categories, asset.category);
              return (
                <div key={asset.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{asset.name}</p>
                      <p className="truncate text-xs text-neutral-400">{asset.category}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="text-sm font-bold text-neutral-900">{formatCurrency(asset.currentValue, currency)}</p>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setSellTarget(asset)}
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Sell
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PurchaseAssetModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} businessId={businessId} currency={currency} />
      <SellAssetModal open={!!sellTarget} onClose={() => setSellTarget(null)} businessId={businessId} asset={sellTarget} currency={currency} />
    </div>
  );
}
