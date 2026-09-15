import {
  Briefcase,
  Car,
  Gift,
  Home,
  Laptop,
  ShoppingCart,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Categories are plain string labels on TransactionEntry.categoryId (no real
// Category table), so this is a label -> visual lookup rather than anything
// driven by an id -- a fixed common-label map, distinct from each
// BudgetCategory's own user-chosen icon/color (Budget/Income Planning).
// Falls back to a neutral wallet glyph for any label this map doesn't
// recognize (e.g. a custom category name, or one entered by hand via the
// Advanced Raw Journal Entry form).
const CATEGORY_VISUALS: Record<string, { Icon: LucideIcon; color: string }> = {
  Salary: { Icon: Wallet, color: "text-emerald-500" },
  "Business Sale": { Icon: Briefcase, color: "text-blue-500" },
  Freelance: { Icon: Laptop, color: "text-purple-500" },
  Gift: { Icon: Gift, color: "text-pink-500" },
  Food: { Icon: Utensils, color: "text-orange-500" },
  Transport: { Icon: Car, color: "text-sky-500" },
  Rent: { Icon: Home, color: "text-indigo-500" },
  "Utility Bill": { Icon: Zap, color: "text-amber-500" },
  Shopping: { Icon: ShoppingCart, color: "text-rose-500" },
};

const DEFAULT_VISUAL = { Icon: Wallet, color: "text-neutral-400" };

export function categoryVisual(category: string | null): { Icon: LucideIcon; color: string } {
  if (!category) return DEFAULT_VISUAL;
  return CATEGORY_VISUALS[category] ?? DEFAULT_VISUAL;
}
