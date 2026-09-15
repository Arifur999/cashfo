"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { Asset } from "@/lib/api";
import { updateAssetValueAction } from "@/lib/assetActions";
import { formatCurrency } from "@/lib/currency";

interface UpdateAssetValueModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  asset: Asset | null;
  currency: string;
}

// Records a new value for an asset -- e.g. a car depreciating or land
// appreciating -- as a fresh AssetValueHistory entry rather than overwriting
// currentValue silently, so the history list below the form always explains
// how a value got to where it is. Same "reset on open/id change" render-time
// pattern as SavingsWithdrawModal/VaultEntryModal.
export function UpdateAssetValueModal({ open, onClose, businessId, asset, currency }: UpdateAssetValueModalProps) {
  const router = useRouter();
  const [prevKey, setPrevKey] = useState(open ? asset?.id ?? null : null);
  const [newValue, setNewValue] = useState(asset?.currentValue ?? "");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentKey = open ? asset?.id ?? null : null;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    if (open) {
      setNewValue(asset?.currentValue ?? "");
      setNote("");
    }
  }

  const parsedValue = Number(newValue);
  const isValid = newValue.trim().length > 0 && Number.isFinite(parsedValue) && parsedValue > 0;

  function handleSubmit() {
    if (!asset || !isValid) return;
    startTransition(async () => {
      const result = await updateAssetValueAction(businessId, asset.id, {
        value: parsedValue,
        note: note.trim() || undefined,
      });
      if (result.success) {
        toast.success("Value updated");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to update value");
      }
    });
  }

  const history = asset?.valueHistory.slice(0, 5) ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Update Value">
      <div className="space-y-4">
        {asset && (
          <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            Current value: <span className="font-semibold text-neutral-900">{formatCurrency(asset.currentValue, currency)}</span>
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">New Value</label>
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            type="number"
            step="0.01"
            min={0}
            placeholder="0.00"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Note <span className="text-neutral-400">(optional)</span>
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Market rate increased"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        {history.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium text-neutral-700">Value History</p>
            <div className="divide-y divide-neutral-50 rounded-xl border border-neutral-100">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900">{formatCurrency(entry.value, currency)}</p>
                    {entry.note && <p className="truncate text-xs text-neutral-400">{entry.note}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">{new Date(entry.recordedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!isValid || isPending}
        onClick={handleSubmit}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Update Value
      </button>
    </Modal>
  );
}
