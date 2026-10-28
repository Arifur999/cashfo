"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BudgetCategoryName } from "@/lib/customer/budgetActions";
import { categoryTone } from "@/lib/customer/categoryTone";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface CategoryListboxProps {
  id: string;
  kind: "INCOME" | "EXPENSE";
  options: BudgetCategoryName[];
  value: string;
  onChange: (name: string) => void;
  // Leaving for Category Set (the popup closes first).
  onNavigate: () => void;
  disabled?: boolean;
}

// The transaction popup's category (design: TxnCategoryOpen): one box with
// the picked category's dot and name, opening the kind's categories, each
// with its colour, the picked one ticked, and "Add new category" under them.
export function CategoryListbox({ id, kind, options, value, onChange, onNavigate, disabled = false }: CategoryListboxProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const picked = options.find((option) => option.name === value);
  const label = kind === "INCOME" ? t("Income categories") : t("Expense categories");

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <span className={cn("min-w-0 flex-1 truncate", picked || value ? "text-ink" : "text-ink-muted")}>{picked?.name ?? (value || t("Select a category"))}</span>
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
                <span className="min-w-0 flex-1 truncate">{option.name}</span>
                {on && <Check className="size-4 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <div aria-hidden="true" className="mx-1 my-1.5 h-px bg-divider" />
        <Link href={`/category-set?new=${kind}`} onNavigate={onNavigate} className="flex h-11 items-center gap-2 rounded-[8px] px-2.5 text-body font-semibold text-emerald hover:bg-hover">
          <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
          {t("Add new category")}
        </Link>
      </PopoverContent>
    </Popover>
  );
}
