"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { GroupExpenseCategoryOption } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { createGroupExpenseCategoryAction, updateGroupExpenseCategoryAction } from "@/lib/groupExpensesActions";
import {
  budgetCategoryColorClass,
  budgetCategoryIcon,
  budgetCategoryIconLabel,
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_ICONS,
} from "@/lib/budgetCategoryVisuals";

interface GroupExpenseCategoryModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editingCategory: GroupExpenseCategoryOption | null;
}

// Same name + icon + color shape as AssetCategoryModal -- Group Expense
// categories have no per-category spending limit either, just a name and
// how it's shown in the picker/list.
export function GroupExpenseCategoryModal({ open, onClose, businessId, editingCategory }: GroupExpenseCategoryModalProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<(typeof BUDGET_CATEGORY_ICONS)[number] | null>(null);
  const [color, setColor] = useState<(typeof BUDGET_CATEGORY_COLORS)[number]>(BUDGET_CATEGORY_COLORS[0]);
  const [iconSearch, setIconSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingCategory?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingCategory) {
        setName(editingCategory.name);
        setIcon(editingCategory.icon as (typeof BUDGET_CATEGORY_ICONS)[number] | null);
        setColor(editingCategory.color as (typeof BUDGET_CATEGORY_COLORS)[number]);
      } else {
        setName("");
        setIcon(null);
        setColor(BUDGET_CATEGORY_COLORS[0]);
      }
      setIconSearch("");
    }
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error(t("Give this category a name"));
      return;
    }

    startTransition(async () => {
      const result = editingCategory
        ? await updateGroupExpenseCategoryAction(businessId, editingCategory.id, { name: name.trim(), icon, color })
        : await createGroupExpenseCategoryAction(businessId, { name: name.trim(), icon, color });

      if (result.success) {
        toast.success(editingCategory ? t("Category updated") : t("Category added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save category"));
      }
    });
  }

  const query = iconSearch.trim().toLowerCase();
  const filteredIcons = query
    ? BUDGET_CATEGORY_ICONS.filter((iconKey) => iconKey.includes(query) || budgetCategoryIconLabel(iconKey).toLowerCase().includes(query))
    : BUDGET_CATEGORY_ICONS;

  return (
    <Modal open={open} onClose={onClose} title={editingCategory ? t("Edit Category") : t("Add Category")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Category Name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g., Gas Bill, Wifi Bill, Maid")}
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">{t("Choose an Icon")}</label>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              placeholder={t("Search icons...")}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto pr-1">
            {filteredIcons.length === 0 ? (
              <p className="col-span-6 py-4 text-center text-sm text-neutral-400">{t("No matching icon")}</p>
            ) : (
              filteredIcons.map((iconKey) => {
                const Icon = budgetCategoryIcon(iconKey);
                const label = budgetCategoryIconLabel(iconKey);
                const selected = icon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setIcon(iconKey)}
                    title={label}
                    aria-label={label}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                      selected ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">{t("Choose a Color")}</label>
          <div className="grid grid-cols-4 gap-2">
            {BUDGET_CATEGORY_COLORS.map((colorKey) => {
              const selected = color === colorKey;
              return (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() => setColor(colorKey)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium text-white capitalize transition-shadow ${budgetCategoryColorClass(colorKey)} ${
                    selected ? "ring-2 ring-offset-2 ring-neutral-900" : ""
                  }`}
                >
                  {t(colorKey)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingCategory ? t("Save Changes") : t("Add Category")}
        </button>
      </div>
    </Modal>
  );
}
