import type { Asset } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { ASSET_CATEGORY_ICONS, ASSET_CATEGORY_LABELS } from "./assetCategoryDisplay";

interface CurrentAssetListPageClientProps {
  assets: Asset[];
  currency: string;
}

// A plain read-only reference table of everything currently owned (ACTIVE
// only -- a sold asset belongs on the Dashboard's full history view, not
// here). No action buttons, no modals -- just "what do I currently have and
// what's it worth", for a quick glance without the Dashboard's extra stats
// or the Purchase & Sell/Asset update pages' management chrome.
export function CurrentAssetListPageClient({ assets, currency }: CurrentAssetListPageClientProps) {
  const total = assets.reduce((sum, a) => sum + Number(a.currentValue), 0);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Assets Management</h1>
      <p className="mt-1 text-sm text-neutral-500">Everything you currently own, at a glance.</p>

      <div className="mt-6 rounded-2xl bg-surface shadow-sm shadow-black/5">
        {assets.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">No assets currently owned.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Purchase Date</th>
                  <th className="px-4 py-3">Purchase Price</th>
                  <th className="px-4 py-3 text-right">Current Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {assets.map((asset) => {
                  const Icon = ASSET_CATEGORY_ICONS[asset.category];
                  return (
                    <tr key={asset.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-medium text-neutral-900">{asset.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{ASSET_CATEGORY_LABELS[asset.category]}</td>
                      <td className="px-4 py-3 text-neutral-500">
                        {new Date(asset.purchaseDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{formatCurrency(asset.purchasePrice, currency)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-neutral-900">{formatCurrency(asset.currentValue, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-100">
                  <td colSpan={4} className="px-4 py-3 text-right font-medium text-neutral-500">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-neutral-900">{formatCurrency(total, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
