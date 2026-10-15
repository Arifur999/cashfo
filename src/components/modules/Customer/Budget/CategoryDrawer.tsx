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
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { BudgetCategorySummary, BudgetCategoryType } from "@/lib/customer/api";
import { createBudgetCategoryAction, updateBudgetCategoryAction } from "@/lib/customer/budgetActions";
import { budgetCategoryHex, budgetCategoryIcon, budgetCategoryIconLabel, BUDGET_CATEGORY_COLORS, BUDGET_CATEGORY_ICONS, INCOME_CATEGORY_ICONS, suggestIconForCategoryName } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type IconKey = (typeof BUDGET_CATEGORY_ICONS)[number];
type ColorKey = (typeof BUDGET_CATEGORY_COLORS)[number];

interface CategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  type: BudgetCategoryType;
  editing: BudgetCategorySummary | null;
  currency: string;
  // The month's budget the limit is checked against (expense only): what
  // is still unassigned, so a limit past it gets a warning.
  unassigned?: number | null;
  totalBudget?: number | null;
}

const QUICK_LIMITS = [2000, 5000, 10000, 20000];

// Add or edit a category in the design's drawer: a live preview of the
// tile, the name, the icon grid with search, the colour dots, and -- for
// an expense -- the monthly limit with quick chips and the budget warning.
export function CategoryDrawer({ open, onClose, businessId, type, editing, currency, unassigned = null, totalBudget = null }: CategoryDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const isIncome = type === "INCOME";
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<IconKey | null>(null);
  const [color, setColor] = useState<ColorKey>(BUDGET_CATEGORY_COLORS[0]);
  const [limit, setLimit] = useState("");
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
      setColor((editing?.color as ColorKey) ?? BUDGET_CATEGORY_COLORS[0]);
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

  const limitValue = Number(limit) || 0;
  const valid = name.trim().length > 0 && (isIncome || limitValue > 0);
  // How much of the budget this limit would take beyond what is unassigned
  // (editing adds back the category's current limit first).
  const currentLimit = editing?.monthlyLimit ? Number(editing.monthlyLimit) : 0;
  const over = !isIncome && unassigned !== null && limitValue > unassigned + currentLimit ? limitValue - (unassigned + currentLimit) : 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = { name: name.trim(), icon, color, ...(!isIncome && { monthlyLimit: limitValue }) };
      const result = editing ? await updateBudgetCategoryAction(businessId, editing.id, input) : await createBudgetCategoryAction(businessId, { type, ...input });
      if (result.success) {
        toast.success(editing ? t("Category updated") : t("Category added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save category"));
      }
    });
  }

  const available = isIncome ? INCOME_CATEGORY_ICONS : BUDGET_CATEGORY_ICONS;
  const query = iconSearch.trim().toLowerCase();
  const icons = query ? available.filter((key) => key.includes(query) || budgetCategoryIconLabel(key).toLowerCase().includes(query)) : available;
  const tone = categoryTone(color);
  const title = editing ? t(isIncome ? "Edit income source" : "Edit expense category") : t(isIncome ? "Add income source" : "Add expense category");

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] sm:max-w-115" : "h-[92vh] rounded-t-xl")}
      >
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-h3 text-ink">{title}</SheetTitle>
            <p className="text-small text-ink-muted">{t(isIncome ? "Name where the money comes from." : "Give it a monthly limit so you're warned early.")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <div aria-label={t("Preview")} className="flex flex-col gap-3 rounded-lg border border-line bg-cream p-4">
              <div className="flex items-center gap-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-[19px]", tone.bg, tone.fg)}>{icon && createElement(budgetCategoryIcon(icon), { "aria-hidden": true })}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-title text-ink">{name.trim() || t(isIncome ? "New source" : "New category")}</span>
                  <span className="text-caption font-normal text-ink-muted">{isIncome ? t("Income source") : `${t("Limit")} ${formatCurrency(limitValue, currency)}`}</span>
                </span>
                {!isIncome && <span className="text-caption font-semibold text-emerald">{formatCurrency(limitValue, currency)} {t("left")}</span>}
              </div>
              <ProgressBar value={0} size="sm" label={t("Preview")} />
            </div>

            <Field htmlFor="cat-name" label={<span className="text-body font-medium text-ink">{t("Name")}</span>}>
              <Input id="cat-name" size="md" value={name} onChange={(event) => changeName(event.target.value)} autoFocus maxLength={60} placeholder={t(isIncome ? "Salary" : "Groceries")} />
            </Field>

            <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-body font-medium text-ink">{t("Icon")}</legend>
              <Input size="sm" type="search" value={iconSearch} onChange={(event) => setIconSearch(event.target.value)} leading={<Search />} placeholder={t("Search icons, e.g. food, bus, rent")} aria-label={t("Search icons")} />
              <div className="grid max-h-56 grid-cols-8 gap-2 overflow-y-auto">
                {icons.length === 0 ? (
                  <p className="col-span-8 py-4 text-center text-small text-ink-muted">{t("No matching icon")}</p>
                ) : (
                  icons.map((key) => {
                    const on = icon === key;
                    const label = budgetCategoryIconLabel(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-label={label}
                        title={label}
                        aria-pressed={on}
                        onClick={() => {
                          setIcon(key);
                          setIconTouched(true);
                        }}
                        className={cn("flex h-10.5 items-center justify-center rounded-md border transition-colors [&_svg]:size-4.5", on ? "border-[1.5px] border-emerald bg-mint-50 text-emerald" : "border-line bg-surface text-ink-2 hover:border-line-strong")}
                      >
                        {createElement(budgetCategoryIcon(key), { "aria-hidden": true })}
                      </button>
                    );
                  })
                )}
              </div>
              <span className="text-caption font-normal text-ink-muted">{t("Scroll for more icons")}</span>
            </fieldset>

            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 text-body font-medium text-ink">{t("Colour")}</legend>
              <div className="flex flex-wrap gap-1 pt-1 pl-1">
                {BUDGET_CATEGORY_COLORS.map((key) => {
                  const on = color === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={t(key)}
                      title={t(key)}
                      aria-pressed={on}
                      onClick={() => setColor(key)}
                      style={{ background: budgetCategoryHex(key) }}
                      className={cn("flex size-7.5 items-center justify-center rounded-full text-white transition-shadow", on && "shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)]")}
                    >
                      {on && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {!isIncome && (
              <div className="flex flex-col gap-2">
                <label htmlFor="cat-limit" className="text-body font-medium text-ink">
                  {t("Monthly limit")}
                </label>
                <div className="flex h-13 items-stretch overflow-hidden rounded-md border border-line-strong bg-surface focus-within:border-emerald focus-within:shadow-[0_0_0_3px_rgba(31,122,90,0.18)]">
                  <span className="flex w-12 shrink-0 items-center justify-center border-r border-line bg-cream text-h3 font-semibold text-ink-2">{currencySymbol(currency)}</span>
                  <input
                    id="cat-limit"
                    type="text"
                    inputMode="decimal"
                    value={limit}
                    onChange={(event) => setLimit(normalizeMoneyInput(event.target.value))}
                    aria-describedby={over > 0 ? "cat-limit-help" : undefined}
                    className="min-w-0 flex-1 bg-transparent px-4 text-h2 font-semibold text-ink tabular-nums outline-none placeholder:text-ink-faint"
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_LIMITS.map((amount) => (
                    <button key={amount} type="button" onClick={() => setLimit(String(amount))} className="h-7.5 rounded-full border border-line bg-surface px-3 text-caption font-medium text-ink-2 tabular-nums hover:border-line-strong">
                      {formatCurrency(amount, currency).replace(/\.00$/, "")}
                    </button>
                  ))}
                </div>
                {over > 0 && totalBudget !== null && (
                  <span id="cat-limit-help" className="flex gap-2 text-caption leading-relaxed text-warning">
                    <TriangleAlert className="mt-0.5 size-[13px] shrink-0" strokeWidth={2.25} aria-hidden="true" />
                    {t("Only")} {formatCurrency((unassigned ?? 0) + currentLimit, currency)} {t("of your")} {formatCurrency(totalBudget, currency)} {t("budget is unassigned. This limit goes")} {formatCurrency(over, currency)} {t("over it.")}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 pt-3 pb-6")}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {editing ? t("Save changes") : t(isIncome ? "Add source" : "Add category")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
