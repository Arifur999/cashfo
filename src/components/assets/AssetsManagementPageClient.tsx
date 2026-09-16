import type { Asset, AssetCategoryOption } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { AssetListRows } from "./AssetListRows";

interface AssetsManagementPageClientProps {
  assets: Asset[];
  categories: AssetCategoryOption[];
  currency: string;
}

// The landing page of the Assets Management group -- a pure overview (total
// value + every asset, ACTIVE and SOLD alike). No category filter here
// anymore -- that moved to its own Category page (see AssetListRows for the
// shared row rendering both pages use). Deliberately no Purchase/Sell/
// Update Value actions here either -- those live on their own dedicated
// sub-pages, so this page doesn't offer three different ways to do the
// same thing.
export function AssetsManagementPageClient({ assets, categories, currency }: AssetsManagementPageClientProps) {
  const totalActiveValue = assets.filter((a) => a.status === "ACTIVE").reduce((sum, a) => sum + Number(a.currentValue), 0);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Assets Management</h1>
      <p className="mt-1 text-sm text-neutral-500">Track and manage your physical and financial assets.</p>

      <div className="mt-6 rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
        <p className="text-sm text-neutral-500">Total Asset Value</p>
        <p className="mt-1 text-2xl font-bold text-neutral-900">{formatCurrency(totalActiveValue, currency)}</p>
      </div>

      <div className="mt-6 rounded-2xl bg-surface shadow-sm shadow-black/5">
        <AssetListRows assets={assets} categories={categories} currency={currency} emptyMessage='No assets yet -- add one under "Purchase & Sell Asset".' />
      </div>
    </div>
  );
}
