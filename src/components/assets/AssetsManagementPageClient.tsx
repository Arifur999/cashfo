"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import type { Asset, AssetCategory } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { ASSET_CATEGORY_ICONS, ASSET_CATEGORY_LABELS } from "./assetCategoryDisplay";
import { PurchaseAssetModal } from "./PurchaseAssetModal";
import { SellAssetModal } from "./SellAssetModal";
import { UpdateAssetValueModal } from "./UpdateAssetValueModal";

interface AssetsManagementPageClientProps {
  businessId: string;
  assets: Asset[];
  currency: string;
  canManage: boolean;
}

const FILTER_PILLS: { value: AssetCategory | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "VEHICLE", label: ASSET_CATEGORY_LABELS.VEHICLE },
  { value: "LAND", label: ASSET_CATEGORY_LABELS.LAND },
  { value: "PROPERTY", label: ASSET_CATEGORY_LABELS.PROPERTY },
  { value: "JEWELLERY", label: ASSET_CATEGORY_LABELS.JEWELLERY },
  { value: "ELECTRONICS", label: ASSET_CATEGORY_LABELS.ELECTRONICS },
  { value: "INVESTMENT", label: ASSET_CATEGORY_LABELS.INVESTMENT },
  { value: "OTHER", label: ASSET_CATEGORY_LABELS.OTHER },
];

// No local `assets` state -- the list always renders straight off the
// server-fetched prop, and every mutating modal below just calls
// router.refresh() on success so the page re-fetches it. Same tradeoff as
// SavingsGoalsDashboardPageClient, just without any client-only overview
// math to keep in sync.
export function AssetsManagementPageClient({ businessId, assets, currency, canManage }: AssetsManagementPageClientProps) {
  const [activeCategory, setActiveCategory] = useState<AssetCategory | "">("");
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [sellTarget, setSellTarget] = useState<Asset | null>(null);
  const [valueTarget, setValueTarget] = useState<Asset | null>(null);

  const filteredAssets = activeCategory ? assets.filter((a) => a.category === activeCategory) : assets;
  const totalActiveValue = assets.filter((a) => a.status === "ACTIVE").reduce((sum, a) => sum + Number(a.currentValue), 0);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Assets Management</h1>
          <p className="mt-1 text-sm text-neutral-500">Track and manage your physical and financial assets.</p>
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

      <div className="mt-6 rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
        <p className="text-sm text-neutral-500">Total Asset Value</p>
        <p className="mt-1 text-2xl font-bold text-neutral-900">{formatCurrency(totalActiveValue, currency)}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTER_PILLS.map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() => setActiveCategory(pill.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === pill.value ? "bg-brand-primary text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-surface shadow-sm shadow-black/5">
        {filteredAssets.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            {assets.length === 0 ? 'No assets yet -- click "Purchase Asset" to add your first one.' : "No assets in this category."}
          </p>
        ) : (
          <div className="divide-y divide-neutral-50">
            {filteredAssets.map((asset) => {
              const Icon = ASSET_CATEGORY_ICONS[asset.category];
              const isSold = asset.status === "SOLD";
              return (
                <div key={asset.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${isSold ? "bg-neutral-50/70" : ""}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isSold ? "bg-neutral-200 text-neutral-400" : "bg-brand-primary/10 text-brand-primary"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${isSold ? "text-neutral-500" : "text-neutral-900"}`}>
                        {asset.name}
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                            isSold ? "bg-neutral-200 text-neutral-500" : "bg-brand-primary/10 text-brand-primary"
                          }`}
                        >
                          {isSold ? "Sold" : "Active"}
                        </span>
                      </p>
                      <p className="truncate text-xs text-neutral-400">
                        {new Date(asset.purchaseDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} &middot;{" "}
                        {ASSET_CATEGORY_LABELS[asset.category]}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {isSold ? (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-neutral-500">{formatCurrency(asset.soldPrice ?? "0", currency)}</p>
                        <p className="text-xs text-neutral-400">
                          Sold {asset.soldAt ? new Date(asset.soldAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""}
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-neutral-900">{formatCurrency(asset.currentValue, currency)}</p>
                        {canManage && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setValueTarget(asset)}
                              aria-label="Update Value"
                              title="Update Value"
                              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSellTarget(asset)}
                              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                            >
                              Sell
                            </button>
                          </div>
                        )}
                      </>
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
      <UpdateAssetValueModal open={!!valueTarget} onClose={() => setValueTarget(null)} businessId={businessId} asset={valueTarget} currency={currency} />
    </div>
  );
}
