"use client";

import { Coffee, Minus, Moon, Pencil, Plus, Sun, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import type { GroupExpenseCategoryOption, GroupKind, GroupSettings, GroupSplit } from "@/lib/customer/api";
import { updateBusinessAction } from "@/lib/customer/businessActions";
import { formatCurrency } from "@/lib/customer/currency";
import { SPLIT_LABELS, SPLITS } from "@/lib/customer/groupDisplay";
import { updateGroupExpenseCategoryAction, updateGroupMemberAction, updateGroupSettingsAction } from "@/lib/customer/groupExpensesActions";
import { mealText, unitsOf } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CategoryTile } from "./GroupBits";
import type { GroupPageData } from "./groupTypes";

interface GroupSettingsTabProps {
  data: GroupPageData;
  onEditBudget: () => void;
  onAddCategory: () => void;
  onEditCategory: (category: GroupExpenseCategoryOption) => void;
  onRemoveCategory: (category: GroupExpenseCategoryOption) => void;
  onDeleteGroup: () => void;
}

// "1st", "2nd", "21st"... for the month start picker.
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const MEAL_STEPS = [0, 0.5, 1, 1.5, 2];

// The board's group settings: the name, whether it is a family or a mess,
// when its month starts and who keeps the cash; each member's shares; the
// monthly budget; how each category is shared; meal counting; and delete.
// Each change saves as it is made.
export function GroupSettingsTab({ data, onEditBudget, onAddCategory, onEditCategory, onRemoveCategory, onDeleteGroup }: GroupSettingsTabProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [name, setName] = useState(data.name);
  const [isPending, startTransition] = useTransition();
  const settings = data.settings;
  const units = unitsOf(settings);
  const active = data.members.filter((member) => member.status === "ACTIVE");
  const totalShares = active.reduce((sum, member) => sum + Number(member.shareUnits), 0);
  const byShares = data.expenses.filter((expense) => expense.split === "SHARES").reduce((sum, expense) => sum + Number(expense.amount), 0);
  const budget = data.budgets.find((b) => `${b.year}-${String(b.month).padStart(2, "0")}` === data.range.key);

  function run(action: () => Promise<{ success: boolean; message?: string }>, failed: string) {
    startTransition(async () => {
      const result = await action();
      if (result.success) router.refresh();
      else toast.error(result.message ?? failed);
    });
  }

  const save = (input: Partial<Omit<GroupSettings, "breakfastUnits" | "lunchUnits" | "dinnerUnits">> & { breakfastUnits?: number; lunchUnits?: number; dinnerUnits?: number }) => run(() => updateGroupSettingsAction(data.businessId, input), t("Failed to save the settings"));

  function saveName() {
    const next = name.trim();
    if (!next || next === data.name) return;
    run(async () => {
      const result = await updateBusinessAction(data.businessId, { name: next });
      if (result.success) toast.success(t("Group renamed"));
      return result;
    }, t("Failed to rename the group"));
  }

  const switchClass = (on: boolean) => cn("flex h-6.5 w-11 shrink-0 rounded-full p-0.75 transition-colors", on ? "justify-end bg-emerald" : "justify-start bg-line-strong");

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <Card padding="none" className="flex flex-col gap-4 p-5">
          <h2 className="text-title font-semibold text-ink">{t("General")}</h2>
          <Field htmlFor="gs-name" label={<span className="text-body font-medium text-ink">{t("Group name")}</span>}>
            <Input id="gs-name" size="md" value={name} onChange={(event) => setName(event.target.value)} onBlur={saveName} onKeyDown={(event) => event.key === "Enter" && saveName()} maxLength={80} />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Kind of group")}</legend>
            <SegmentedControl<GroupKind>
              options={[
                { value: "FAMILY", label: "Family" },
                { value: "MESS", label: "Mess" },
              ]}
              value={settings.kind}
              onChange={(kind) => save({ kind })}
              label="Kind of group"
              stretch
              className="[&>button]:h-8.5"
            />
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field htmlFor="gs-start" label={<span className="text-body font-medium text-ink">{t("Month starts on")}</span>}>
              <NativeSelect id="gs-start" size="md" value={settings.monthStartDay} onChange={(event) => save({ monthStartDay: Number(event.target.value) })} frameClassName="w-full" className="font-normal">
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {t("{day} of each month", { day: locale === "bn" ? String(day) : ordinal(day) })}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field htmlFor="gs-cash" label={<span className="text-body font-medium text-ink">{t("Cash kept by")}</span>}>
              <NativeSelect id="gs-cash" size="md" value={settings.cashHolderMemberId ?? ""} onChange={(event) => save({ cashHolderMemberId: event.target.value || null })} frameClassName="w-full" className="font-normal">
                <option value="">{t("No one in particular")}</option>
                {active.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <span className="text-caption leading-normal text-ink-muted">{t("Changing the month start affects new months only. Closed months keep their dates.")}</span>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-col gap-0.75 px-5 pt-5 pb-3">
            <h2 className="text-title font-semibold text-ink">{t("Members' shares")}</h2>
            <span className="text-small leading-normal text-ink-muted">{t('Used for costs shared "by shares". For a family this is usually how many people each brother feeds.')}</span>
          </div>
          {active.map((member) => {
            const shares = Number(member.shareUnits);
            const setShares = (next: number) => run(() => updateGroupMemberAction(data.businessId, member.id, { shareUnits: next }), t("Failed to update member"));
            return (
              <div key={member.id} className="flex h-14 items-center gap-3 border-t border-divider px-5">
                <PersonAvatar name={member.name} src={member.photoUrl} size={32} coloured />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-semibold text-ink">{member.name}</span>
                  {member.phone && <span className="truncate text-caption text-ink-muted">{member.phone}</span>}
                </span>
                <span className="flex h-9 items-center overflow-hidden rounded-md border border-line-strong">
                  <button type="button" aria-label={t("Fewer shares for {name}", { name: member.name })} disabled={isPending || shares <= 0.5} onClick={() => setShares(Math.max(0.5, shares - (shares > 1 ? 1 : 0.5)))} className="flex h-full w-8 items-center justify-center bg-strip disabled:opacity-40">
                    <Minus className="size-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-8.5 text-center text-body-lg font-bold tabular-nums">{mealText(shares)}</span>
                  <button type="button" aria-label={t("More shares for {name}", { name: member.name })} disabled={isPending || shares >= 100} onClick={() => setShares(shares < 1 ? 1 : shares + 1)} className="flex h-full w-8 items-center justify-center bg-strip disabled:opacity-40">
                    <Plus className="size-3.5" aria-hidden="true" />
                  </button>
                </span>
                <span className="w-17.5 text-right text-small text-ink-2 tabular-nums">{totalShares ? `${((shares / totalShares) * 100).toFixed(1)}%` : "—"}</span>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-strip px-5 py-3 text-small">
            <span className="font-semibold text-ink">{t("{count} shares in total", { count: mealText(totalShares) })}</span>
            {byShares > 0 && totalShares > 0 && (
              <span className="text-ink-2 tabular-nums">
                {t("{month} by shares {amount}", { month: monthName(data.range.key, locale, "long"), amount: formatCurrency(byShares, data.currency) })} → {active.map((member) => formatCurrency((byShares * Number(member.shareUnits)) / totalShares, data.currency).replace(/^৳\s?/, "")).join(" · ")}
              </span>
            )}
          </div>
        </Card>

        <Card padding="none" className="flex items-center gap-4 p-5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.75">
            <h2 className="text-title font-semibold text-ink">{t("Monthly budget")}</h2>
            <span className="text-small text-ink-muted">{budget ? t("{amount} for {month}. Warns at 90% used.", { amount: formatCurrency(budget.budgetAmount, data.currency), month: monthName(data.range.key, locale, "long") }) : t("No budget for {month} yet. Warns at 90% used.", { month: monthName(data.range.key, locale, "long") })}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onEditBudget}>
            {t("Edit budgets")}
          </Button>
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div className="flex flex-col gap-0.75">
              <h2 className="text-title font-semibold text-ink">{t("Categories and how each is shared")}</h2>
              <span className="text-small text-ink-muted">{t("The default for new expenses. Any single expense can still be changed.")}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={onAddCategory}>
              <Plus />
              {t("Add")}
            </Button>
          </div>
          {data.categories.length === 0 && <p className="border-t border-divider px-5 py-5 text-center text-small text-ink-muted">{t("No category yet. Bazar, rent, bills… add the ones this group uses.")}</p>}
          {data.categories.map((category) => (
            <div key={category.id} className="flex h-12 items-center gap-3 border-t border-divider px-5">
              <CategoryTile name={category.name} categories={data.categories} size={28} />
              <span className="flex-1 truncate text-body font-medium text-ink">{category.name}</span>
              <NativeSelect
                size="sm"
                value={category.defaultSplit}
                onChange={(event) => run(() => updateGroupExpenseCategoryAction(data.businessId, category.id, { defaultSplit: event.target.value as GroupSplit }), t("Failed to update category"))}
                aria-label={t("How {name} is shared", { name: category.name })}
                className={cn("h-8 text-small font-semibold", category.defaultSplit === "EQUAL" ? "text-ink-2" : "border-mint-200 bg-mint-50 text-forest")}
              >
                {SPLITS.filter((split) => split !== "EXACT" && (split !== "MEALS" || settings.mealsOn || settings.kind === "MESS")).map((split) => (
                  <option key={split} value={split}>
                    {t(SPLIT_LABELS[split])}
                  </option>
                ))}
              </NativeSelect>
              <button type="button" onClick={() => onEditCategory(category)} aria-label={`${t("Edit")} ${category.name}`} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink">
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onRemoveCategory(category)} aria-label={`${t("Delete")} ${category.name}`} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-expense-soft hover:text-expense">
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </Card>

        <Card padding="none" className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.75">
              <h2 id="gs-meals" className="text-title font-semibold text-ink">
                {t("Meal counting")}
              </h2>
              <span className="text-small leading-normal text-ink-muted">{settings.mealsOn ? t("On. Bazar shared by meals is split by the meals each person eats, at the month's meal rate.") : t("Off. Turn it on if bazar should be shared by the meals each person eats, like a mess.")}</span>
            </div>
            <button type="button" role="switch" aria-checked={settings.mealsOn} aria-labelledby="gs-meals" disabled={isPending} onClick={() => save({ mealsOn: !settings.mealsOn })} className={switchClass(settings.mealsOn)}>
              <span className="size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(11,61,46,0.14)]" />
            </button>
          </div>
          {settings.mealsOn && (
            <div className="flex flex-wrap items-center gap-3 border-t border-divider pt-4 text-small text-ink-2">
              <span>{t("One meal counts as")}</span>
              {(
                [
                  { key: "breakfastUnits", label: "Breakfast", icon: Coffee, value: units.breakfast },
                  { key: "lunchUnits", label: "Lunch", icon: Sun, value: units.lunch },
                  { key: "dinnerUnits", label: "Dinner", icon: Moon, value: units.dinner },
                ] as const
              ).map((slot) => (
                <label key={slot.key} className="flex items-center gap-1.5">
                  <slot.icon className="size-3.5 text-ink-muted" aria-hidden="true" />
                  {t(slot.label)}
                  <NativeSelect size="sm" value={slot.value} onChange={(event) => save({ [slot.key]: Number(event.target.value) })} className="h-8 font-semibold">
                    {MEAL_STEPS.map((step) => (
                      <option key={step} value={step}>
                        {mealText(step)}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              ))}
            </div>
          )}
        </Card>

        <Card padding="none" className="flex items-center gap-4 border-expense-line p-5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.75">
            <h2 className="text-title font-semibold text-expense">{t("Delete this group")}</h2>
            <span className="text-small leading-relaxed text-ink-muted">
              {t("Removes")} {data.name} {t("with every entry and closed month. This can't be undone.")}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={onDeleteGroup} className="border-expense/40 text-expense hover:bg-expense-soft">
            {t("Delete group")}
          </Button>
        </Card>
      </div>
    </div>
  );
}
