"use client";

import { Check, Search, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import ProgressBar from "@/components/smartly/ProgressBar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAmountField } from "@/hooks/useAmountField";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { BudgetCategorySummary, BudgetCategoryType } from "@/lib/customer/api";
import { createAssetCategoryAction, updateAssetCategoryAction } from "@/lib/customer/assetActions";
import { createBudgetCategoryAction, updateBudgetCategoryAction } from "@/lib/customer/budgetActions";
import { createGroupExpenseCategoryAction, updateGroupExpenseCategoryAction } from "@/lib/customer/groupExpensesActions";
import { budgetCategoryIcon, BUDGET_CATEGORY_ICONS, EXPENSE_PICKER_ICONS, iconLabelKey, iconMatches, INCOME_CATEGORY_ICONS, suggestIconForCategoryName } from "@/lib/customer/budgetCategoryVisuals";
import { CATEGORY_TONE_COLORS, categoryTone, pickerColor } from "@/lib/customer/categoryTone";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { fillNodes } from "@/lib/i18n/fill";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type IconKey = (typeof BUDGET_CATEGORY_ICONS)[number];

// What the drawer edits: a budget category in full, or just the name,
// icon and colour of an asset category.
export type EditableCategory = Pick<BudgetCategorySummary, "id" | "name" | "icon" | "color"> & Partial<Pick<BudgetCategorySummary, "monthlyLimit">>;

interface CategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  // Budget categories are income or expense; an asset or a group category
  // has no type and no limit, and saves through its own API.
  type?: BudgetCategoryType;
  variant?: "budget" | "asset" | "group";
  editing: EditableCategory | null;
  currency: string;
  // The month's budget the limit is checked against (expense only): what
  // is still unassigned, so a limit past it gets a warning.
  unassigned?: number | null;
  totalBudget?: number | null;
  // The names already taken, so a second "Groceries" is caught before the
  // save rather than refused by it.
  existingNames?: string[];
  // An asset type's assets, when editing one: until the backend renames
  // them with it, they keep the old name, and the drawer says so.
  assetCount?: number;
}

const QUICK_LIMITS = [2000, 5000, 10000, 20000];

// The icon window: two rows of the grid (6 across on a phone, 8 wider).
const ICON_ROWS = 2;

// Add or edit a category in the design's drawer: a live preview of the
// tile, the name, the icon grid with search, the colour dots, then for an
// expense the monthly limit with quick chips and the budget warning.
export function CategoryDrawer({ open, onClose, businessId, type = "EXPENSE", variant = "budget", editing, currency, unassigned = null, totalBudget = null, existingNames, assetCount = 0 }: CategoryDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const isAsset = variant === "asset";
  const isGroup = variant === "group";
  const isIncome = type === "INCOME";
  // Only a budget expense category carries a monthly limit.
  const noLimit = isIncome || isAsset || isGroup;
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<IconKey | null>(null);
  const [color, setColor] = useState<string>("blue");
  const [limit, setLimit] = useState("");
  const limitField = useAmountField(limit, setLimit, currency);
  const [iconSearch, setIconSearch] = useState("");
  // Once an icon is picked by hand, typing a name never swaps it.
  const [iconTouched, setIconTouched] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Populate the instant the drawer opens, or switches to another category.
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setIcon((editing?.icon as IconKey | null) ?? null);
      setColor(editing?.color ?? "blue");
      setLimit(editing?.monthlyLimit ? String(Number(editing.monthlyLimit)) : "");
      setIconTouched(editing?.icon != null);
      setIconSearch("");
    }
  }

  function changeName(next: string) {
    setName(next);
    if (!iconTouched) {
      const suggested = suggestIconForCategoryName(next);
      if (suggested) setIcon(suggested);
    }
  }

  const trimmed = name.trim();
  const limitValue = Number(limit) || 0;
  // A name the workspace already has (its own, when editing, is fine).
  const taken = !!trimmed && trimmed !== editing?.name && (existingNames ?? []).includes(trimmed);
  const valid = trimmed.length > 0 && !taken && (noLimit || limitValue > 0);
  // What the disabled button is waiting for.
  const missing = !trimmed ? "Add a name to save" : !noLimit && !(limitValue > 0) ? "Add a monthly limit to save" : null;
  // How much of the budget this limit would take beyond what is unassigned
  // (editing adds back the category's current limit first).
  const currentLimit = editing?.monthlyLimit ? Number(editing.monthlyLimit) : 0;
  // Renaming an asset type its assets are filed under.
  const renamesAssets = isAsset && !!editing && assetCount > 0 && !!trimmed && trimmed !== editing.name;
  const over = !noLimit && unassigned !== null && limitValue > unassigned + currentLimit ? limitValue - (unassigned + currentLimit) : 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = { name: trimmed, icon, color, ...(!noLimit && { monthlyLimit: limitValue }) };
      const result = isAsset
        ? editing
          ? await updateAssetCategoryAction(businessId, editing.id, input)
          : await createAssetCategoryAction(businessId, input)
        : isGroup
          ? editing
            ? await updateGroupExpenseCategoryAction(businessId, editing.id, input)
            : await createGroupExpenseCategoryAction(businessId, input)
          : editing
          ? await updateBudgetCategoryAction(businessId, editing.id, input)
          : await createBudgetCategoryAction(businessId, { type, ...input });
      if (result.success) {
        toast.success(t(isAsset ? (editing ? "Asset type updated" : "Asset type added") : editing ? "Category updated" : "Category added"));
        onClose();
        router.refresh();
      } else {
        toast.error(t(result.message ?? (isAsset ? "Failed to save the asset type" : "Failed to save category")));
      }
    });
  }

  const available = isIncome ? INCOME_CATEGORY_ICONS : EXPENSE_PICKER_ICONS;
  const icons = available.filter((key) => iconMatches(key, iconSearch, t));
  // The hint only when the grid has more than its window shows.
  const overflows = icons.length > (wide ? 8 : 6) * ICON_ROWS;
  const tone = categoryTone(color);
  const chosenDot = pickerColor(color);
  const title = isAsset ? (editing ? t("Edit asset type") : t("Add asset type")) : isGroup ? (editing ? t("Edit category") : t("Add category")) : editing ? t(isIncome ? "Edit income category" : "Edit expense category") : t(isIncome ? "Add income category" : "Add expense category");
  const label = "text-body font-medium text-ink";

  const limitSection = !noLimit && (
    <div className="flex flex-col gap-2">
      <label htmlFor="cat-limit" className={label}>
        {t("Monthly limit")}
      </label>
      <div className="flex h-13 items-stretch overflow-hidden rounded-sm border border-input bg-surface transition-[border-color,box-shadow] focus-within:border-focus-ring focus-within:focus-halo">
        <span className="flex w-12 shrink-0 items-center justify-center border-r border-line bg-strip text-h3 font-semibold text-ink-soft">{currencySymbol(currency)}</span>
        <input
          id="cat-limit"
          type="text"
          inputMode="decimal"
          {...limitField}
          aria-describedby={over > 0 ? "cat-limit-help" : undefined}
          className="min-w-0 flex-1 bg-transparent px-3.5 text-[20px] font-semibold text-ink tabular-nums outline-none placeholder:text-ink-faint"
          placeholder="0"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_LIMITS.map((amount) => (
          <button key={amount} type="button" onClick={() => setLimit(String(amount))} className="h-7.5 rounded-full border border-line bg-surface px-3 text-caption font-medium text-ink-2 tabular-nums hover:border-line-strong pointer-coarse:h-11 pointer-coarse:px-4">
            {formatCurrency(amount, currency, locale).replace(/\.00$/, "")}
          </button>
        ))}
      </div>
      {over > 0 && totalBudget !== null && (
        <span id="cat-limit-help" className="flex gap-1.5 text-caption leading-normal text-warning">
          <TriangleAlert className="mt-0.5 size-3.25 shrink-0" strokeWidth={2.25} aria-hidden="true" />
          <span>
            {fillNodes(t("Only {free} of your {budget} budget is unassigned. This limit goes {over} over it."), {
              free: formatCurrency((unassigned ?? 0) + currentLimit, currency, locale),
              budget: formatCurrency(totalBudget, currency, locale),
              over: formatCurrency(over, currency, locale),
            })}
          </span>
        </span>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-drawer data-[side=right]:sm:max-w-115" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}
      >
        {/* The phone sheet's handle, as the transaction drawer has. */}
        {!wide && <span aria-hidden="true" className="mt-2 block h-1.25 w-10 shrink-0 self-center rounded-full bg-line-strong" />}
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-2 pb-2")}>
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-h3 text-ink">{title}</SheetTitle>
            <p className="text-small text-ink-muted">{t(isAsset ? "Group what you own." : isGroup ? "What an expense can be filed under." : isIncome ? "Name where the money comes from." : "Give it a monthly limit so you're warned early.")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className={cn("flex shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken", wide ? "size-9 pointer-coarse:size-11" : "size-11")}>
            <X className={wide ? "size-4.5" : "size-5"} aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4.5 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <div aria-label={t("Preview")} className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-strip p-3.5">
              <div className="flex items-center gap-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4.75", tone.bg, tone.fg)}>{icon && createElement(budgetCategoryIcon(icon), { "aria-hidden": true })}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-[15px] font-semibold text-ink">{trimmed || t(isAsset ? "New asset type" : "New category")}</span>
                  <span className="text-caption text-ink-muted">{isAsset ? t("Asset type") : isGroup ? t("Expense category") : isIncome ? t("Income category") : t("Limit {amount}", { amount: formatCurrency(limitValue, currency, locale) })}</span>
                </span>
                {!noLimit && <span className="text-caption font-semibold text-emerald">{t("{amount} left", { amount: formatCurrency(limitValue, currency, locale) })}</span>}
              </div>
              {/* An asset type has nothing to fill a bar with. */}
              {!isAsset && <ProgressBar value={0} size="sm" label={t("Preview")} className="bg-line" />}
            </div>

            <Field htmlFor="cat-name" label={<span className={label}>{t("Name")}</span>} error={taken ? t(isAsset ? "An asset type with that name already exists" : "A category with this name already exists") : undefined}>
              <Input id="cat-name" size="md" value={name} invalid={taken} onChange={(event) => changeName(event.target.value)} autoFocus maxLength={60} placeholder={t(isAsset ? "Vehicle" : isGroup ? "Bazar" : isIncome ? "Salary" : "Groceries")} frameClassName="px-3.5" />
            </Field>
            {renamesAssets && (
              <p className="-mt-2 flex gap-2 text-caption leading-relaxed text-warning">
                <TriangleAlert className="mt-0.5 size-3.25 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                {plural(t, assetCount, "{count} asset keeps the old name", "{count} assets keep the old name", undefined, locale)}
              </p>
            )}

            <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend className={cn("mb-2", label)}>{t("Icon")}</legend>
              <Input size="sm" type="search" value={iconSearch} onChange={(event) => setIconSearch(event.target.value)} leading={<Search />} placeholder={t(isAsset ? "Search icons, e.g. car, land, gold" : "Search icons, e.g. food, bus, rent")} aria-label={t("Search icons")} frameClassName="h-9 text-small" />
              {/* Two rows show; the rest scroll. 2px of room so a chosen icon's ring isn't cut. */}
              <div className="-m-0.5 grid max-h-23.5 grid-cols-6 gap-1.5 overflow-y-auto p-0.5 md:grid-cols-8 pointer-coarse:max-h-24.5">
                {icons.length === 0 ? (
                  <p className="col-span-6 py-4 text-center text-small text-ink-muted md:col-span-8">{t("No matching icon")}</p>
                ) : (
                  icons.map((key) => {
                    const on = icon === key;
                    const iconName = t(iconLabelKey(key));
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-label={iconName}
                        title={iconName}
                        aria-pressed={on}
                        onClick={() => {
                          setIcon(key);
                          setIconTouched(true);
                        }}
                        className={cn("flex h-10.5 items-center justify-center rounded-full border transition-colors pointer-coarse:h-11 [&_svg]:size-4.5", on ? "border-[1.5px] border-emerald bg-emerald-soft text-emerald" : "border-line bg-surface text-ink-soft hover:border-line-strong")}
                      >
                        {createElement(budgetCategoryIcon(key), { "aria-hidden": true })}
                      </button>
                    );
                  })
                )}
              </div>
              {overflows && <span className="text-caption text-ink-muted">{t("Scroll for more icons")}</span>}
            </fieldset>

            <fieldset className="m-0 border-0 p-0">
              <legend className={cn("mb-2", label)}>{t("Colour")}</legend>
              {/* Each dot is the tile's own colour, so the dot is what you get. */}
              <div className="flex flex-wrap gap-1 pt-1 pl-1">
                {CATEGORY_TONE_COLORS.map((key) => {
                  const on = chosenDot === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={t(key)}
                      title={t(key)}
                      aria-pressed={on}
                      onClick={() => setColor(key)}
                      className={cn("flex size-7.5 items-center justify-center rounded-full transition-shadow pointer-coarse:size-11", categoryTone(key).fg, on && "shadow-[0_0_0_2px_var(--surface),0_0_0_4px_currentColor]")}
                    >
                      <span aria-hidden="true" className="flex size-full items-center justify-center rounded-full bg-current">
                        {on && <Check className="size-3.5 text-surface" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {limitSection}
          </div>

          <div className={cn("flex flex-col gap-2 border-t border-line bg-surface", wide ? "px-6 py-3.5" : "px-4 pt-3 pb-6")}>
            {missing && <p className="text-caption text-ink-muted">{t(missing)}</p>}
            <div className="flex items-center justify-end gap-2.5">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={!valid || isPending} className="px-4.5">
                {isPending && <Loader size={16} onDark label={t("Loading...")} />}
                {editing ? t(isAsset || isGroup ? "Save changes" : "Save") : t(isAsset ? "Add asset type" : "Add category")}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
