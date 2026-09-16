import type { Asset } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { ASSET_CATEGORY_ICONS, ASSET_CATEGORY_LABELS } from "./assetCategoryDisplay";

interface AssetListRowsProps {
  assets: Asset[];
  currency: string;
  emptyMessage: string;
}

// Shared row rendering (icon, name + Active/Sold badge, category + purchase
// date, value or sold-price) -- used by both the Dashboard (all assets, no
// filter) and the Category page (filtered by the selected pill) so the two
// don't drift apart visually.
export function AssetListRows({ assets, currency, emptyMessage }: AssetListRowsProps) {
  if (assets.length === 0) {
    return <p className="py-10 text-center text-sm text-neutral-400">{emptyMessage}</p>;
  }

  return (
    <div className="divide-y divide-neutral-50">
      {assets.map((asset) => {
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
                <p className="text-sm font-bold text-neutral-900">{formatCurrency(asset.currentValue, currency)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
