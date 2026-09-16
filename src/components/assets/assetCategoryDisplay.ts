import type { AssetCategoryOption } from "@/lib/api";
import { budgetCategoryColorClass, budgetCategoryIcon } from "@/lib/budgetCategoryVisuals";

// Categories are now a real per-business list (see AssetCategoryOption),
// not a fixed enum -- these helpers look up the matching option's icon/
// color by name, falling back gracefully when an asset's category string
// doesn't match any current option (e.g. the option was since deleted --
// same tolerance BudgetCategory/TransactionEntry.categoryId already has).
export function findAssetCategory(categories: AssetCategoryOption[], name: string): AssetCategoryOption | undefined {
  return categories.find((c) => c.name === name);
}

export function assetCategoryIconFor(categories: AssetCategoryOption[], name: string) {
  const match = findAssetCategory(categories, name);
  return budgetCategoryIcon(match?.icon ?? "");
}

export function assetCategoryColorClassFor(categories: AssetCategoryOption[], name: string): string {
  const match = findAssetCategory(categories, name);
  return match ? budgetCategoryColorClass(match.color) : "bg-neutral-400";
}
