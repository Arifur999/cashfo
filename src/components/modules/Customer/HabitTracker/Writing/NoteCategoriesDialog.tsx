"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import type { NoteCategory } from "@/lib/customer/api";
import { createNoteCategoryAction, deleteNoteCategoryAction, updateNoteCategoryAction } from "@/lib/customer/writingActions";
import { CATEGORY_NAME_MAX, categoryDotClass, nextCategoryColor } from "@/lib/customer/writingDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface NoteCategoriesDialogProps {
  open: boolean;
  categories: NoteCategory[];
  // Live notes in each category.
  counts: Record<string, number>;
  onClose: () => void;
  onChange: (categories: NoteCategory[]) => void;
  // Its notes stay, without a category.
  onRemoved: (id: string) => void;
}

// "Manage" categories (the board's Categories popup): each one's colour
// (tap to change), name and count, × to delete, and a box to add one. A
// change is saved as it is made; a name when the box is left.
export function NoteCategoriesDialog({ open, categories, counts, onClose, onChange, onRemoved }: NoteCategoriesDialogProps) {
  const { t, fmt } = useLocale();
  const [names, setNames] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // A name box goes back to the saved name.
  const forget = (id: string) =>
    setNames((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

  const replace = (category: NoteCategory) => onChange(categories.map((entry) => (entry.id === category.id ? category : entry)));

  const rename = (category: NoteCategory) => {
    const name = (names[category.id] ?? category.name).trim();
    if (name === category.name) return;
    if (!name) {
      forget(category.id);
      return;
    }
    startTransition(async () => {
      const result = await updateNoteCategoryAction(category.id, { name });
      if (!result.success || !result.data) {
        setError(t(result.message ?? "Failed to save the category"));
        forget(category.id);
        return;
      }
      setError(null);
      forget(category.id);
      replace(result.data);
    });
  };

  const recolor = (category: NoteCategory) =>
    startTransition(async () => {
      const result = await updateNoteCategoryAction(category.id, { color: nextCategoryColor(category.color) });
      if (result.success && result.data) replace(result.data);
      else setError(t(result.message ?? "Failed to save the category"));
    });

  const remove = (category: NoteCategory) =>
    startTransition(async () => {
      const result = await deleteNoteCategoryAction(category.id);
      if (!result.success) {
        setError(t(result.message ?? "Failed to delete the category"));
        return;
      }
      onChange(categories.filter((entry) => entry.id !== category.id));
      onRemoved(category.id);
      toast.success(t("{name} removed. Its notes stay, without a category.", { name: category.name }));
    });

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createNoteCategoryAction(name);
      if (!result.success || !result.data) {
        setError(t(result.message ?? "Failed to add the category"));
        return;
      }
      setError(null);
      setNewName("");
      onChange([...categories, result.data]);
    });
  };

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={460}
      title={t("Categories")}
      footer={
        <Button type="button" onClick={onClose} disabled={isPending}>
          {t("Done")}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-1.5">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => recolor(category)}
                disabled={isPending}
                aria-label={t("Change colour of {name}", { name: category.name })}
                title={t("Change colour")}
                className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-line hover:bg-surface-sunken"
              >
                <span aria-hidden="true" className={cn("size-3.5 rounded-[4px]", categoryDotClass(category.color))} />
              </button>
              <Input
                size="sm"
                aria-label={t("Category name")}
                value={names[category.id] ?? category.name}
                maxLength={CATEGORY_NAME_MAX}
                onChange={(event) => setNames((current) => ({ ...current, [category.id]: event.target.value }))}
                onBlur={() => rename(category)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    rename(category);
                  }
                }}
                frameClassName="min-w-0 flex-1 rounded-sm"
              />
              <span className="w-16 shrink-0 text-right text-caption whitespace-nowrap text-ink-muted tabular-nums">{t((counts[category.id] ?? 0) === 1 ? "{count} note" : "{count} notes", { count: formatCount(counts[category.id] ?? 0, fmt) })}</span>
              <button
                type="button"
                onClick={() => remove(category)}
                disabled={isPending}
                aria-label={t("Delete {name}", { name: category.name })}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-expense-soft hover:text-expense"
              >
                <X className="size-4" strokeWidth={2.25} aria-hidden="true" />
              </button>
            </li>
          ))}
          {categories.length === 0 && <li className="py-2 text-small text-ink-muted">{t("No categories yet.")}</li>}
        </ul>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
          className="flex gap-2"
        >
          <Input size="sm" aria-label={t("New category")} value={newName} maxLength={CATEGORY_NAME_MAX} onChange={(event) => setNewName(event.target.value)} placeholder={t("New category, e.g. Health")} frameClassName="min-w-0 flex-1 rounded-sm" />
          <Button type="submit" variant="secondary" className="h-9.5 rounded-sm" disabled={!newName.trim() || isPending}>
            {t("Add")}
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-small text-expense">
            {error}
          </p>
        )}
      </div>
    </PopupDialog>
  );
}
