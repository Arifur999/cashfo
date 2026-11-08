"use client";

import { Check, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BudgetCategoryName } from "@/lib/customer/budgetActions";
import { categoryTone } from "@/lib/customer/categoryTone";
import { categoryLabel } from "@/lib/customer/transactionRows";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { NewCategoryForm } from "./NewCategoryForm";

interface CategoryListboxProps {
  id: string;
  businessId: string;
  // null: no type picked yet, so there is nothing to list ("Choose Income
  // or Expense first"); opening it asks for the type (onNeedKind).
  kind: "INCOME" | "EXPENSE" | null;
  options: BudgetCategoryName[];
  value: string;
  onChange: (name: string) => void;
  // A category added from the list: the popup adds it to its options.
  onAdded: (category: BudgetCategoryName) => void;
  // Whether the reader may add one (an owner or accountant).
  canAddCategory: boolean;
  // Opened before a type was picked.
  onNeedKind?: () => void;
  // Save found none picked: a red edge.
  invalid?: boolean;
  disabled?: boolean;
}

// The transaction popup's category (design: TxnDrawer, TxnCategoryOpen):
// one 48px box with the picked category's dot and name, opening the kind's
// categories right under it in the popup (the fields below move down), each
// with its colour, the picked one ticked, and "Add new category" under
// them, which turns into a name box: the new category is picked and the
// list closes.
export function CategoryListbox({ id, businessId, kind, options, value, onChange, onAdded, canAddCategory, onNeedKind, invalid = false, disabled = false }: CategoryListboxProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const picked = options.find((option) => option.name === value);
  const label = kind === "INCOME" ? t("Income categories") : t("Expense categories");
  const shown = open && kind !== null;

  // An opened list scrolls into the popup's view.
  useEffect(() => {
    if (shown) list.current?.scrollIntoView({ block: "nearest" });
  }, [shown]);

  // Esc puts away the name box, then the list, before the popup: heard on
  // the window as it comes down, ahead of the dialog's own listener.
  useEffect(() => {
    if (!shown) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (adding) setAdding(false);
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [shown, adding]);

  function toggle() {
    if (kind === null) {
      onNeedKind?.();
      return;
    }
    setOpen(!open);
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={shown}
        onClick={toggle}
        className={cn(
          "flex h-12 w-full items-center gap-2.5 rounded-field bg-surface px-3.5 text-left text-body transition-[border-color,box-shadow] disabled:opacity-60",
          shown ? "border-[1.5px] border-emerald" : invalid ? "border border-expense-fill" : "border border-input hover:border-line-strong",
        )}
      >
        {picked && <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full bg-current", categoryTone(picked.color).fg)} />}
        <span className={cn("min-w-0 flex-1 truncate", picked || value ? "text-ink" : "text-ink-muted")}>
          {value ? categoryLabel(picked?.name ?? value, t) : kind === null ? t("Choose Income or Expense first") : t("Select a category")}
        </span>
        {shown ? <ChevronUp className="size-4 shrink-0 text-ink-muted" aria-hidden="true" /> : <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />}
      </button>
      {shown && (
        <div ref={list} className="flex flex-col rounded-md border border-line bg-surface p-1.5 shadow-float">
          <span className="px-2.5 pt-2 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{label}</span>
          <div role="listbox" aria-label={label} className="flex max-h-44 flex-col overflow-y-auto">
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
                  className={cn("flex min-h-10 shrink-0 items-center gap-2.5 rounded-sm px-2.5 text-left text-body text-ink", on ? "bg-surface-sunken font-semibold" : "hover:bg-surface-sunken")}
                >
                  <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full bg-current", categoryTone(option.color).fg)} />
                  <span className="min-w-0 flex-1 truncate">{categoryLabel(option.name, t)}</span>
                  {on && <Check className="size-4 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          {canAddCategory && kind !== null && (
            <>
              <div aria-hidden="true" className="mx-1 my-1.5 h-px bg-line" />
              {adding ? (
                <div className="px-1 pt-1.5 pb-1">
                  <NewCategoryForm
                    businessId={businessId}
                    kind={kind}
                    taken={options.map((option) => option.name)}
                    compact
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
                <button type="button" onClick={() => setAdding(true)} className="flex h-11 w-full items-center gap-2 rounded-sm px-2.5 text-body font-semibold text-emerald hover:bg-surface-sunken">
                  <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                  {t("Add new category")}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
