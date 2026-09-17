"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import type { AssetCategoryOption } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
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
  const { t } = useLocale();
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
      toast.error(t("Asset name is required"));
      return;
    }
    const valueNumber = Number(value);
    if (!value || valueNumber <= 0) {
      toast.error(t("Value must be greater than zero"));
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
        toast.success(t("Asset saved"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save asset"));
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Current Asset")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Date")}</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Asset Name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g. Toyota Corolla, Family Land")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Category")}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            {categories.length === 0 && <option value="">{t("No categories yet")}</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Value")}
            {currencySuffix}
          </label>
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
            {t("Notes")} <span className="text-neutral-400">({t("Optional")})</span>
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
        {t("Save Asset")}
      </button>
    </Modal>
  );
}
