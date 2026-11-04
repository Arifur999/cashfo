"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BudgetCategoryName } from "@/lib/customer/budgetActions";
import { categoryTone } from "@/lib/customer/categoryTone";
import { categoryLabel } from "@/lib/customer/transactionRows";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { NewCategoryForm } from "./NewCategoryForm";

interface CategoryListboxProps {
  id: string;
  businessId: string;
  kind: "INCOME" | "EXPENSE";
  options: BudgetCategoryName[];
  value: string;
  onChange: (name: string) => void;
  // A category added from the list: the popup adds it to its options.
  onAdded: (category: BudgetCategoryName) => void;
  // Whether the reader may add one (an owner or accountant).
  canAddCategory: boolean;
  disabled?: boolean;
}

// The transaction popup's category (design: TxnCategoryOpen): one box with
// the picked category's dot and name, opening the kind's categories, each
// with its colour, the picked one ticked, and "Add new category" under them,
// which turns into a name box: the new category is picked and the list
// closes.
export function CategoryListbox({ id, businessId, kind, options, value, onChange, onAdded, canAddCategory, disabled = false }: CategoryListboxProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const picked = options.find((option) => option.name === value);
  const label = kind === "INCOME" ? t("Income categories") : t("Expense categories");

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setAdding(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-12 w-full items-center gap-2.5 rounded-field border bg-surface px-3.5 text-left text-body transition-[border-color,box-shadow] disabled:opacity-60",
            open ? "border-[1.5px] border-emerald" : "border-input hover:border-line-strong",
          )}
        >
          {picked && <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full bg-current", categoryTone(picked.color).fg)} />}
          <span className={cn("min-w-0 flex-1 truncate", picked || value ? "text-ink" : "text-ink-muted")}>{value ? categoryLabel(picked?.name ?? value, t) : t("Select a category")}</span>
          <ChevronDown className={cn("size-4 shrink-0 text-ink-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-(--radix-popover-trigger-width) gap-0 rounded-[12px] border border-divider bg-surface p-1.5 shadow-overlay ring-0">
        <div role="listbox" aria-label={label} className="flex max-h-72 flex-col overflow-y-auto">
          <span className="px-2.5 pt-2 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{label}</span>
          {options.map((option) => {
            const on = option.name === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  onChange(option.name);
                  setOpen(false);
                }}
                className={cn("flex h-11 shrink-0 items-center gap-2.5 rounded-[8px] px-2.5 text-left text-body text-ink hover:bg-hover", on && "bg-surface-sunken font-semibold")}
              >
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full bg-current", categoryTone(option.color).fg)} />
                <span className="min-w-0 flex-1 truncate">{categoryLabel(option.name, t)}</span>
                {on && <Check className="size-4 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {canAddCategory && (
          <>
            <div aria-hidden="true" className="mx-1 my-1.5 h-px bg-divider" />
            {adding ? (
              <div className="p-1">
                <NewCategoryForm
                  businessId={businessId}
                  kind={kind}
                  taken={options.map((option) => option.name)}
                  autoFocus
                  onCancel={() => setAdding(false)}
                  onAdded={(category) => {
                    onAdded(category);
                    onChange(category.name);
                    setAdding(false);
                    setOpen(false);
                  }}
                />
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)} className="flex h-11 w-full items-center gap-2 rounded-[8px] px-2.5 text-body font-semibold text-emerald hover:bg-hover">
                <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                {t("Add new category")}
              </button>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
