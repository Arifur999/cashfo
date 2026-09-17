"use client";

import { Modal } from "@/components/ui/Modal";
import type { Asset } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatCurrency } from "@/lib/currency";

interface AssetValueHistoryModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset | null;
  currency: string;
}

// Read-only "how did this asset's value get to where it is" view -- every
// AssetValueHistory row (the first one is always the purchase itself,
// recordedAt set to purchaseDate -- see AssetsService.purchase()'s
// comment), oldest first so it reads top-to-bottom as a timeline: e.g.
// "01 Jan 2026: ৳100,000" then "31 Dec 2026: ৳150,000".
export function AssetValueHistoryModal({ open, onClose, asset, currency }: AssetValueHistoryModalProps) {
  const { t } = useLocale();
  const history = asset ? [...asset.valueHistory].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()) : [];

  return (
    <Modal open={open} onClose={onClose} title={asset ? `${asset.name} -- ${t("Value History")}` : t("Value History")}>
      {history.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-400">{t("No value history yet.")}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                <th className="px-3.5 py-2.5">{t("Date")}</th>
                <th className="px-3.5 py-2.5">{t("Value")}</th>
                <th className="px-3.5 py-2.5">{t("Note")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3.5 py-2.5 text-neutral-500">
                    {new Date(entry.recordedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-3.5 py-2.5 font-semibold text-neutral-900">{formatCurrency(entry.value, currency)}</td>
                  <td className="px-3.5 py-2.5 text-neutral-500">{entry.note || <span className="text-neutral-300">--</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
