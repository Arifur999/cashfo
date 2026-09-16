"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { AssetCategoryOption } from "@/lib/api";
import { deleteAssetCategoryAction } from "@/lib/assetActions";
import { budgetCategoryColorClass, budgetCategoryIcon } from "@/lib/budgetCategoryVisuals";
import { AssetCategoryModal } from "./AssetCategoryModal";

interface CategoryPageClientProps {
  businessId: string;
  categories: AssetCategoryOption[];
  canManage: boolean;
}

// "closed" hides the modal; {mode: "create"} opens it empty; an actual
// AssetCategoryOption opens it pre-filled for editing that category.
type CategoryModalState = "closed" | { mode: "create" } | AssetCategoryOption;

function isCreateState(state: CategoryModalState): state is { mode: "create" } {
  return typeof state === "object" && state !== null && "mode" in state;
}

// Replaces the old category-filter + asset-list page -- per the product
// owner, this page now manages the categories themselves (add/edit/delete)
// and never displays any assets. See IncomeCategoryColumn for the row
// precedent this mirrors, minus the "spent"/"View Transactions" line (asset
// categories carry no per-category spending figure).
export function CategoryPageClient({ businessId, categories, canManage }: CategoryPageClientProps) {
  const router = useRouter();
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>("closed");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const editingCategory = categoryModal === "closed" || isCreateState(categoryModal) ? null : categoryModal;

  function handleDelete(category: AssetCategoryOption) {
    if (
      !window.confirm(
        `Delete the "${category.name}" category? Existing assets keep showing this name, but it won't be pickable for new ones.`,
      )
    )
      return;
    setDeletingId(category.id);
    startDeleteTransition(async () => {
      const result = await deleteAssetCategoryAction(businessId, category.id);
      if (result.success) {
        toast.success("Category deleted");
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to delete category");
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Category</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage the categories your assets are organized into.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setCategoryModal({ mode: "create" })}
            className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        )}
      </div>

      <div className="mt-6">
        {categories.length === 0 ? (
          <div className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-neutral-400 shadow-sm shadow-black/5">
            No categories yet -- click &quot;Add Category&quot; to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => {
              const Icon = category.icon ? budgetCategoryIcon(category.icon) : null;
              return (
                <div key={category.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${budgetCategoryColorClass(category.color)}`}>
                      {Icon && <Icon className="h-5 w-5" />}
                    </span>
                    <p className="min-w-0 font-medium text-neutral-900">{category.name}</p>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCategoryModal(category)}
                        title="Edit"
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === category.id && isDeleting}
                        onClick={() => handleDelete(category)}
                        title="Delete"
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AssetCategoryModal
        open={categoryModal !== "closed"}
        onClose={() => setCategoryModal("closed")}
        businessId={businessId}
        editingCategory={editingCategory}
      />
    </div>
  );
}
