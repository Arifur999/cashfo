"use client";

import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import type { BudgetCategoryType } from "@/lib/customer/api";
import { createBudgetCategoryAction, updateBudgetCategoryAction } from "@/lib/customer/budgetActions";
import { BUDGET_CATEGORY_COLORS } from "@/lib/customer/budgetCategoryVisuals";
import { CATEGORY_NAME_MAX, CATEGORY_NAME_WORDS, categoryNameProblem, categoryServerProblem } from "@/lib/customer/categoryName";
import { categoryTone } from "@/lib/customer/categoryTone";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { IEDialog, KindCards } from "./IEDialog";

export interface CategoryDialogState {
  // null: a new category.
  id: string | null;
  type: BudgetCategoryType;
  name: string;
  // null for a new one: the first colour its type doesn't use yet.
  color: string | null;
  // How many transactions use it: one that is used keeps its type.
  used: number;
}

// What the workspace has of each type: the names (a name is used once per
// type) and the colours (a new category starts on one not taken).
export type CategoriesByType = Record<BudgetCategoryType, { names: string[]; colors: string[] }>;

interface CategoryDialogProps {
  businessId: string;
  editing: CategoryDialogState | null;
  existing: CategoriesByType;
  onClose: () => void;
  // The category saved (its id, to light its row).
  onSaved: (id: string | null) => void;
}

export const KIND_OPTIONS = [
  { value: "INCOME" as const, label: "Income", sub: "Money coming in", icon: <ArrowUp strokeWidth={2.25} />, tone: "income" as const },
  { value: "EXPENSE" as const, label: "Expense", sub: "Money going out", icon: <ArrowDown strokeWidth={2.25} />, tone: "expense" as const },
];

// The colour names the swatches read out.
const COLOR_WORDS: Record<(typeof BUDGET_CATEGORY_COLORS)[number], string> = {
  blue: "Blue@@colour",
  green: "Green@@colour",
  purple: "Purple@@colour",
  orange: "Orange@@colour",
  pink: "Pink@@colour",
  yellow: "Yellow@@colour",
  red: "Red@@colour",
  indigo: "Indigo@@colour",
  teal: "Teal@@colour",
  cyan: "Cyan@@colour",
  violet: "Violet@@colour",
  lime: "Lime@@colour",
};

// The swatches in the CategoryDrawer board's order (deep teal, cyan, blue,
// indigo, violet, purple, pink, red, orange, yellow, teal, green), each
// name drawing the board's dot nearest its own.
const SWATCH_ORDER = ["green", "cyan", "blue", "indigo", "violet", "purple", "pink", "red", "orange", "yellow", "teal", "lime"] as const satisfies readonly (typeof BUDGET_CATEGORY_COLORS)[number][];

// The colour a new category of a type starts on: one no category of the
// type has yet, as the API would pick.
export const freeColor = (taken: readonly string[]): string => BUDGET_CATEGORY_COLORS.find((color) => !taken.includes(color)) ?? BUDGET_CATEGORY_COLORS[taken.length % BUDGET_CATEGORY_COLORS.length];

// Category Set's New / Edit category popup (design: CategoryDrawer): the
// type (locked once transactions use it), the name beside its letter tile,
// and the colour. Renaming one renames it on its transactions too (the API
// carries them along).
export function CategoryDialog({ businessId, editing, existing, onClose, onSaved }: CategoryDialogProps) {
  const { t, fmt } = useLocale();
  const [type, setType] = useState<BudgetCategoryType>("EXPENSE");
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(BUDGET_CATEGORY_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Each opening starts from what it was opened with.
  const [seen, setSeen] = useState<CategoryDialogState | null>(null);
  if (editing !== seen) {
    setSeen(editing);
    if (editing) {
      setType(editing.type);
      setName(editing.name);
      setColor(editing.color ?? freeColor(existing[editing.type].colors));
      setError(null);
    }
  }

  const isNew = editing?.id === null;
  const locked = !!editing && editing.used > 0;
  const tone = categoryTone(color);
  const letter = [...name.trim()][0]?.toUpperCase() ?? "";

  function pickType(next: BudgetCategoryType) {
    setType(next);
    setError(null);
    // A new category takes the next type's free colour, unless one was picked.
    if (isNew && color === freeColor(existing[type].colors)) setColor(freeColor(existing[next].colors));
  }

  function save() {
    if (!editing || isPending) return;
    // Its own name doesn't count as taken.
    const taken = existing[type].names.filter((other) => !(editing.id && other === editing.name && type === editing.type));
    const problem = categoryNameProblem(name, taken);
    if (problem) {
      setError(CATEGORY_NAME_WORDS.drawer[problem]);
      return;
    }
    const trimmed = name.trim();
    startTransition(async () => {
      const result = isNew
        ? await createBudgetCategoryAction(businessId, { type, name: trimmed, icon: null, color })
        : await updateBudgetCategoryAction(businessId, editing.id as string, { name: trimmed, ...(color !== editing.color && { color }), ...(type !== editing.type && { type }) });
      if (result.success) {
        toast.success(t(isNew ? "Category added" : "Category updated"));
        onSaved(result.data?.id ?? editing.id);
        onClose();
        return;
      }
      const refused = categoryServerProblem(result.message);
      if (refused) setError(CATEGORY_NAME_WORDS.drawer[refused]);
      else toast.error(t(result.message ?? "Failed to save the category"));
    });
  }

  return (
    <IEDialog open={editing !== null} onClose={onClose} title={t(isNew ? "New category" : "Edit category")} busy={isPending} saveLabel={isNew ? "Save category" : "Save changes"} onSubmit={save}>
      <div className="flex flex-col gap-2">
        <KindCards legend="Type" value={type} onChange={pickType} options={KIND_OPTIONS} disabled={locked} />
        {locked && editing && (
          <p className="text-[12.5px] text-ink-muted">
            {plural(t, editing.used, "{count} transaction uses it, so its type stays the same.", "{count} transactions use it, so its type stays the same.", undefined, fmt)}
          </p>
        )}
      </div>
      <Field
        htmlFor="cat-name"
        label={<span className="text-body font-medium text-ink">{t("Category name")}</span>}
        hint={<span className="text-small text-ink-muted">{t(type === "INCOME" ? "Shows in the Transactions form when Income is picked." : "Shows in the Transactions form when Expense is picked.")}</span>}
        error={error ? t(error) : undefined}
      >
        <span className="flex items-center gap-2.5">
          <span aria-hidden="true" className={cn("flex size-12 shrink-0 items-center justify-center rounded-[12px] text-[18px] font-bold", tone.bg, tone.fg)}>
            {letter}
          </span>
          <Input
            id="cat-name"
            size="lg"
            frameClassName="flex-1"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder={t(type === "INCOME" ? "e.g. Rental income" : "e.g. Mobile & Internet")}
            maxLength={CATEGORY_NAME_MAX}
            invalid={error !== null}
            autoFocus
          />
        </span>
      </Field>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2 text-body font-medium text-ink">{t("Colour")}</legend>
        <div role="radiogroup" aria-label={t("Colour")} className="flex flex-wrap gap-2">
          {SWATCH_ORDER.map((option) => {
            const on = option === color;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={t("Colour {name}", { name: t(COLOR_WORDS[option]) })}
                onClick={() => setColor(option)}
                className={cn(
                  "flex size-7.5 items-center justify-center rounded-full bg-current outline-offset-2 pointer-coarse:size-10",
                  categoryTone(option).fg,
                  on && "outline-2 outline-current",
                )}
              >
                {on && <Check className="size-3.5 text-white" strokeWidth={3} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </fieldset>
    </IEDialog>
  );
}
