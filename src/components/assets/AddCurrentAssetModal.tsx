"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import type { AssetCategoryOption } from "@/lib/api";
import { getAssetCategoriesAction, purchaseAssetAction } from "@/lib/assetActions";

interface AddCurrentAssetModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
}

// "Current Asset list"'s own "Add Assets" flow -- deliberately simpler than
// PurchaseAssetModal (Purchase & Sell Asset's own form): no Account field,
// since this is just a plain inventory entry, not a real purchase paid from
// a specific account. Backend AssetsService.purchase() skips creating a
// Transaction entirely when purchaseAccountId is omitted -- see its comment.
export function AddCurrentAssetModal({ open, onClose, businessId, currency }: AddCurrentAssetModalProps) {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [categories, setCategories] = useState<AssetCategoryOption[]>([]);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDate(new Date().toISOString().slice(0, 10));
      setName("");
      setCategory("");
      setValue("");
      setNotes("");
    }
  }

  useEffect(() => {
    if (!open) return;
    getAssetCategoriesAction(businessId).then((result) => {
      const fetchedCategories = result.data ?? [];
      setCategories(fetchedCategories);
      setCategory((current) => current || fetchedCategories.find((c) => c.name === "Other")?.name || fetchedCategories[0]?.name || "");
    });
  }, [open, businessId]);

  const currencySuffix = currency ? ` (${currency})` : "";

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Asset name is required");
      return;
    }
    const valueNumber = Number(value);
    if (!value || valueNumber <= 0) {
      toast.error("Value must be greater than zero");
      return;
    }
    startTransition(async () => {
      const result = await purchaseAssetAction(businessId, {
        name: name.trim(),
        category,
        purchaseDate: date,
        purchasePrice: valueNumber,
        notes: notes.trim() || undefined,
      });
      if (result.success) {
        toast.success("Asset saved");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to save asset");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Current Asset">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Date</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Asset Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Toyota Corolla, Family Land"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            {categories.length === 0 && <option value="">No categories yet</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Value{currencySuffix}</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Notes <span className="text-neutral-400">(optional)</span>
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={handleSubmit}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Asset
      </button>
    </Modal>
  );
}
