"use client";

import { useState } from "react";
import type { Asset, AssetCategory } from "@/lib/api";
import { AssetListRows } from "./AssetListRows";
import { ASSET_CATEGORY_LABELS } from "./assetCategoryDisplay";

interface CategoryPageClientProps {
  assets: Asset[];
  currency: string;
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

// The only place to browse assets by category -- moved here from the
// Dashboard (which is now a plain, unfiltered overview) per the user's
// explicit request. Same row rendering as Dashboard (see AssetListRows).
export function CategoryPageClient({ assets, currency }: CategoryPageClientProps) {
  const [activeCategory, setActiveCategory] = useState<AssetCategory | "">("");
  const filteredAssets = activeCategory ? assets.filter((a) => a.category === activeCategory) : assets;

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Category</h1>
      <p className="mt-1 text-sm text-neutral-500">Browse your assets by category.</p>

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
        <AssetListRows
          assets={filteredAssets}
          currency={currency}
          emptyMessage={assets.length === 0 ? 'No assets yet -- add one under "Purchase & Sell Asset".' : "No assets in this category."}
        />
      </div>
    </div>
  );
}
