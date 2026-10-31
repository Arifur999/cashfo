"use client";

import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import type { GroupExpenseCategoryOption } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { createGroupExpenseCategoryAction, updateGroupExpenseCategoryAction } from "@/lib/customer/groupExpensesActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GroupDialog } from "./GroupDialog";

// The board's nine icons and seven colours.
export const GROUP_CATEGORY_ICONS = ["shopping-cart", "house", "zap", "pill", "sparkles", "wifi", "book-open", "car", "package"] as const;
export const GROUP_CATEGORY_COLORS = ["teal", "blue", "orange", "pink", "violet", "amber", "gray"] as const;

const ICON_NAMES: Record<string, string> = { "shopping-cart": "Cart", house: "House", zap: "Utility", pill: "Medicine", sparkles: "Sparkle", wifi: "Wi-Fi", "book-open": "Book", car: "Car", package: "Box" };

interface GroupCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  categories: GroupExpenseCategoryOption[];
  editing: GroupExpenseCategoryOption | null;
}

// Add or edit a group category (the v7 FamilyCategories board): its name,
// icon and colour, with a preview. How it is shared is set in Settings.
export function GroupCategoryDialog({ open, onClose, businessId, categories, editing }: GroupCategoryDialogProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(GROUP_CATEGORY_ICONS[0]);
  const [color, setColor] = useState<string>(GROUP_CATEGORY_COLORS[0]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setIcon(editing?.icon ?? GROUP_CATEGORY_ICONS[0]);
      setColor(editing?.color ?? GROUP_CATEGORY_COLORS[0]);
      setError("");
    }
  }

  // A saved icon or colour the board doesn't list stays on offer.
  const icons = [...GROUP_CATEGORY_ICONS, ...(editing?.icon && !(GROUP_CATEGORY_ICONS as readonly string[]).includes(editing.icon) ? [editing.icon] : [])];
  const colors = [...GROUP_CATEGORY_COLORS, ...(editing?.color && !(GROUP_CATEGORY_COLORS as readonly string[]).includes(editing.color) ? [editing.color] : [])];
  const tone = categoryTone(color);

  function save() {
    const trimmed = name.trim();
    const found = !trimmed ? t("Give the category a name.") : categories.some((c) => c.id !== editing?.id && c.name.trim().toLowerCase() === trimmed.toLowerCase()) ? t("{name} already exists.", { name: trimmed }) : "";
    setError(found);
    if (found || isPending) return;
    startTransition(async () => {
      const input = { name: trimmed, icon, color };
      const result = await attempt(() => (editing ? updateGroupExpenseCategoryAction(businessId, editing.id, input) : createGroupExpenseCategoryAction(businessId, input)), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) {
        toast.error(result.message ?? (editing ? t("Failed to update category") : t("Failed to create category")));
        return;
      }
      toast.success(editing ? t("Category updated") : t("Category added"));
      onClose();
      router.refresh();
    });
  }

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={460}
      title={editing ? t("Edit category") : t("Add category")}
      lead={
        <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-[11px] [&_svg]:size-5", tone.bg, tone.fg)}>
          {createElement(budgetCategoryIcon(icon), {})}
        </span>
      }
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader />}
            {editing ? t("Save changes") : t("Add category")}
          </Button>
        </>
      }
    >
      <Field htmlFor="cat-name" label={<span className="text-body font-medium text-ink">{t("Name")}</span>}>
        <Input id="cat-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={60} placeholder={t("e.g. School fees")} invalid={!!error} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-body font-medium text-ink">{t("Icon")}</legend>
        <div role="radiogroup" aria-label={t("Icon")} className="grid grid-cols-9 gap-1.5">
          {icons.map((value) => {
            const on = value === icon;
            return (
              <button key={value} type="button" role="radio" aria-checked={on} aria-label={t(ICON_NAMES[value] ?? value)} onClick={() => setIcon(value)} className={cn("flex aspect-square items-center justify-center rounded-lg border [&_svg]:size-4.5", on ? cn("border-[1.5px] border-emerald", tone.bg, tone.fg) : "border-line text-ink-muted hover:border-input")}>
                {createElement(budgetCategoryIcon(value), { "aria-hidden": true })}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-body font-medium text-ink">{t("Color")}</legend>
        <div role="radiogroup" aria-label={t("Color")} className="flex flex-wrap gap-2">
          {colors.map((value) => {
            const on = value === color;
            const swatch = categoryTone(value);
            return (
              <button key={value} type="button" role="radio" aria-checked={on} aria-label={t("Color {name}", { name: t(value) })} onClick={() => setColor(value)} className={cn("flex size-8.5 items-center justify-center rounded-full border-2", on ? "border-ink" : "border-transparent")}>
                <span className={cn("size-6 rounded-full bg-current", swatch.fg)} />
              </button>
            );
          })}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-small font-semibold text-expense">
          {error}
        </p>
      )}
    </GroupDialog>
  );
}
