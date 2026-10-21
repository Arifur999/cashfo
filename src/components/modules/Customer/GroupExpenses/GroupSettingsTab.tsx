"use client";

import { CalendarClock, Coffee, Moon, Pencil, Plus, Sun, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Switch } from "@/components/ui/switch";
import type { GroupExpenseCategoryOption, GroupKind, GroupSettings, GroupSplit } from "@/lib/customer/api";
import { updateBusinessAction } from "@/lib/customer/businessActions";
import { formatCurrency } from "@/lib/customer/currency";
import { groupMonthOf, monthRangeOf, poolsMeals, rangeLabel, SPLIT_LABELS, SPLITS, splitTotals } from "@/lib/customer/groupDisplay";
import { updateGroupExpenseCategoryAction, updateGroupMemberAction, updateGroupSettingsAction } from "@/lib/customer/groupExpensesActions";
import { mealText, unitsOf } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { toBanglaDigits } from "@/lib/i18n/banglaDates";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { attempt } from "./attempt";
import { CategoryTile } from "./GroupBits";
import type { GroupPageData } from "./groupTypes";
import { ShareStepper } from "./ShareStepper";

interface GroupSettingsTabProps {
  data: GroupPageData;
  onEditBudget: () => void;
  onAddCategory: () => void;
  onEditCategory: (category: GroupExpenseCategoryOption) => void;
  onRemoveCategory: (category: GroupExpenseCategoryOption) => void;
  onDeleteGroup: () => void;
}

type Section = "general" | "shares" | "categories" | "meals";
type SettingsInput = Partial<Omit<GroupSettings, "breakfastUnits" | "lunchUnits" | "dinnerUnits">> & { breakfastUnits?: number; lunchUnits?: number; dinnerUnits?: number };

// "1st", "2nd", "21st"... for the month start picker.
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const MEAL_STEPS = [0, 0.5, 1, 1.5, 2];

// "Saving…", then "Saved" for a moment: a live region, so a screen reader
// hears it too. Always there, so nothing shifts.
function SaveStatus({ state }: { state: "saving" | "saved" | null }) {
  const { t } = useLocale();
  return (
    <span aria-live="polite" className="shrink-0 text-caption font-normal text-ink-muted">
      {/* "Saved@@status": the plain "Saved" is money put by (জমা) in Savings. */}
      {state === "saving" ? t("Saving…") : state === "saved" ? t("Saved@@status") : ""}
    </span>
  );
}

// The board's group settings: the name, whether it is a family or a mess,
// when its month starts and who keeps the cash; each member's shares; the
// monthly budget; how each category is shared; meal counting; and delete.
// Each change saves as it is made; its card says when, and its controls
// wait for the save.
export function GroupSettingsTab({ data, onEditBudget, onAddCategory, onEditCategory, onRemoveCategory, onDeleteGroup }: GroupSettingsTabProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [name, setName] = useState(data.name);
  const [nameKept, setNameKept] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState<Section | null>(null);
  const [saved, setSaved] = useState<Section | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A new start day waiting for its confirm.
  const [newStart, setNewStart] = useState<number | null>(null);
  const settings = data.settings;
  const units = unitsOf(settings);
  const active = data.members.filter((member) => member.status === "ACTIVE");
  const totalShares = active.reduce((sum, member) => sum + Number(member.shareUnits), 0);
  // What each member pays of the month's costs shared by shares, expense by expense.
  const byShares = splitTotals(data.expenses, "SHARES", data.members, data.range, poolsMeals(settings.mealsOn, data.settlement));
  const sharesTotal = Object.values(byShares).reduce((sum, value) => sum + value, 0);
  const budget = data.budgets.find((b) => `${b.year}-${String(b.month).padStart(2, "0")}` === data.range.key);
  const month = monthName(data.range.key, locale, "long");
  const money = (value: number | string) => formatCurrency(value, data.currency);
  const dayWord = (day: number) => (locale === "bn" ? toBanglaDigits(day) : ordinal(day));
  const status = (section: Section) => (saving === section ? "saving" : saved === section ? "saved" : null);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  // A card's controls are disabled while it saves, which drops focus from
  // the one just used; it goes back there once they come back.
  const refocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (isPending || !refocus.current) return;
    const control = refocus.current;
    refocus.current = null;
    if (!document.activeElement || document.activeElement === document.body) control.focus();
  }, [isPending]);

  function run(section: Section, action: () => Promise<{ success: boolean; message?: string }>, failed: string) {
    refocus.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    setSaving(section);
    setSaved(null);
    startTransition(async () => {
      const result = await attempt(action, t("No connection. Nothing was saved; try again."));
      setSaving(null);
      if (!result.success) {
        toast.error(result.message ?? failed);
        return;
      }
      setSaved(section);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(null), 2500);
      router.refresh();
    });
  }

  const save = (section: Section, input: SettingsInput) => run(section, () => updateGroupSettingsAction(data.businessId, input), t("Failed to save the settings"));

  // The name on its way to the server: Enter saves, and the blur that
  // follows (the field is disabled while saving) must not send it twice.
  const sentName = useRef<string | null>(null);

  function saveName() {
    const next = name.trim();
    // An empty name isn't saved: the old one comes back, and the field says why.
    if (!next) {
      setName(data.name);
      setNameKept(true);
      return;
    }
    if (next === data.name || next === sentName.current) return;
    sentName.current = next;
    run(
      "general",
      async () => {
        try {
          const result = await updateBusinessAction(data.businessId, { name: next });
          if (result.success) toast.success(t("Group renamed"));
          else sentName.current = null;
          return result;
        } catch (error) {
          sentName.current = null;
          throw error;
        }
      },
      t("Failed to rename the group"),
    );
  }

  // The open month is cut by the new day at once: say what it becomes.
  const startPreview = newStart === null ? null : monthRangeOf(groupMonthOf(data.today, newStart), newStart);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <Card padding="none" className="p-5">
          <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-title font-semibold text-ink">{t("General")}</h2>
              <SaveStatus state={status("general")} />
            </div>
            <Field htmlFor="gs-name" label={<span className="text-body font-medium text-ink">{t("Group name")}</span>} error={nameKept ? t("A group needs a name, so the old one was kept.") : undefined}>
              <Input
                id="gs-name"
                size="md"
                value={name}
                invalid={nameKept}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameKept(false);
                }}
                onBlur={saveName}
                onKeyDown={(event) => event.key === "Enter" && saveName()}
                maxLength={80}
              />
            </Field>
            <fieldset className="flex min-w-0 flex-col gap-2">
              <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Kind of group")}</legend>
              <SegmentedControl<GroupKind>
                options={[
                  { value: "FAMILY", label: "Family" },
                  { value: "MESS", label: "Mess" },
                ]}
                value={settings.kind}
                onChange={(kind) => kind !== settings.kind && save("general", { kind })}
                label="Kind of group"
                stretch
                className="[&>button]:h-8.5 [&>button]:disabled:opacity-60"
              />
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field htmlFor="gs-start" label={<span className="text-body font-medium text-ink">{t("Month starts on")}</span>}>
                <NativeSelect id="gs-start" size="md" value={settings.monthStartDay} onChange={(event) => Number(event.target.value) !== settings.monthStartDay && setNewStart(Number(event.target.value))} frameClassName="w-full" className="font-normal" aria-describedby="gs-start-note">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {t("{day} of each month", { day: dayWord(day) })}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field htmlFor="gs-cash" label={<span className="text-body font-medium text-ink">{t("Cash kept by")}</span>}>
                <NativeSelect id="gs-cash" size="md" value={settings.cashHolderMemberId ?? ""} onChange={(event) => save("general", { cashHolderMemberId: event.target.value || null })} frameClassName="w-full" className="font-normal">
                  <option value="">{t("No one in particular")}</option>
                  {active.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <span id="gs-start-note" className="text-caption leading-normal text-ink-muted">
              {t("Every month is counted from this day, the open one too. Entries keep their dates, and so do closed records.")}
            </span>
          </fieldset>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <fieldset disabled={isPending} className="min-w-0">
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
              <div className="flex flex-col gap-0.75">
                <h2 className="text-title font-semibold text-ink">{t("Members' shares")}</h2>
                <span className="text-small leading-normal text-ink-muted">{t('Used for costs shared "by shares". For a family this is usually how many people each brother feeds.')}</span>
              </div>
              <SaveStatus state={status("shares")} />
            </div>
            {active.map((member) => {
              const shares = Number(member.shareUnits);
              const theirs = byShares[member.id];
              return (
                <div key={member.id} className="flex min-h-14 items-center gap-3 border-t border-divider px-5 py-2">
                  <PersonAvatar name={member.name} src={member.photoUrl} size={32} coloured />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-semibold text-ink">{member.name}</span>
                    {member.phone && <span className="truncate text-caption text-ink-muted">{member.phone}</span>}
                  </span>
                  <ShareStepper value={shares} name={member.name} disabled={isPending} onChange={(next) => run("shares", () => updateGroupMemberAction(data.businessId, member.id, { shareUnits: next }), t("Failed to update member"))} />
                  {/* Their part of the month's by-shares costs, by name, as each expense split it. */}
                  <span className="flex w-20 flex-col items-end text-right tabular-nums">
                    <span className="text-small text-ink-2">{totalShares ? `${((shares / totalShares) * 100).toFixed(1)}%` : "—"}</span>
                    {theirs !== undefined && <span className="text-caption text-ink-muted">{money(theirs)}</span>}
                  </span>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-strip px-5 py-3 text-small">
              <span className="font-semibold text-ink">{t("{count} shares in total", { count: mealText(totalShares, locale) })}</span>
              {sharesTotal > 0 && <span className="text-ink-2 tabular-nums">{t("{month} by shares {amount}", { month, amount: money(sharesTotal) })}</span>}
            </div>
          </fieldset>
        </Card>

        <Card padding="none" className="flex items-center gap-4 p-5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.75">
            <h2 className="text-title font-semibold text-ink">{t("Monthly budget")}</h2>
            <span className="text-small text-ink-muted">{budget ? t("{amount} for {month}. Warns at 90% used.", { amount: money(budget.budgetAmount), month }) : t("No budget for {month} yet. Warns at 90% used.", { month })}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onEditBudget}>
            {t("Edit budgets")}
          </Button>
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card padding="none" className="overflow-hidden">
          <fieldset disabled={isPending} className="min-w-0">
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
              <div className="flex flex-col gap-0.75">
                <h2 className="text-title font-semibold text-ink">{t("Categories and how each is shared")}</h2>
                <span className="text-small text-ink-muted">{t("The default for new expenses. Any single expense can still be changed.")}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <SaveStatus state={status("categories")} />
                <Button variant="secondary" size="sm" onClick={onAddCategory}>
                  <Plus />
                  {t("Add")}
                </Button>
              </div>
            </div>
            {data.categories.length === 0 && <p className="border-t border-divider px-5 py-5 text-center text-small text-ink-muted">{t("No category yet. Bazar, rent, bills… add the ones this group uses.")}</p>}
            {data.categories.map((category) => (
              <div key={category.id} className="flex min-h-12 items-center gap-3 border-t border-divider px-5 py-1.5">
                <CategoryTile name={category.name} categories={data.categories} size={28} />
                <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{category.name}</span>
                <NativeSelect
                  size="sm"
                  value={category.defaultSplit}
                  onChange={(event) => run("categories", () => updateGroupExpenseCategoryAction(data.businessId, category.id, { defaultSplit: event.target.value as GroupSplit }), t("Failed to update category"))}
                  aria-label={t("How {name} is shared", { name: category.name })}
                  frameClassName="max-w-48"
                  className={cn("h-8 truncate text-small font-semibold pointer-coarse:h-11", category.defaultSplit === "EQUAL" ? "text-ink-2" : "border-mint-200 bg-mint-50 text-forest")}
                >
                  {/* By meals stays offered to a category saved that way, and says what it does while meals aren't counted. */}
                  {SPLITS.filter((split) => split !== "EXACT" && (split !== "MEALS" || settings.mealsOn || settings.kind === "MESS" || category.defaultSplit === "MEALS")).map((split) => (
                    <option key={split} value={split}>
                      {split === "MEALS" && !settings.mealsOn ? t("By meals (shared equally while meal counting is off)") : t(SPLIT_LABELS[split])}
                    </option>
                  ))}
                </NativeSelect>
                <button type="button" onClick={() => onEditCategory(category)} aria-label={t("Edit {name}", { name: category.name })} className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => onRemoveCategory(category)} aria-label={t("Delete {name}", { name: category.name })} className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-expense-soft hover:text-expense pointer-coarse:size-11">
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </fieldset>
        </Card>

        <Card padding="none" className="p-5">
          <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                <span className="flex items-center justify-between gap-3">
                  <h2 id="gs-meals" className="scroll-mt-4 text-title font-semibold text-ink">
                    {t("Meal counting")}
                  </h2>
                  <SaveStatus state={status("meals")} />
                </span>
                <span id="gs-meals-hint" className="text-small leading-normal text-ink-muted">
                  {settings.mealsOn ? t("On. Bazar shared by meals is split by the meals each person eats, at the month's meal rate.") : t("Off. Turn it on if bazar should be shared by the meals each person eats, like a mess.")}
                </span>
              </div>
              <Switch checked={settings.mealsOn} onCheckedChange={(on) => save("meals", { mealsOn: on })} disabled={isPending} aria-labelledby="gs-meals" aria-describedby="gs-meals-hint" />
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
                    <NativeSelect size="sm" value={slot.value} onChange={(event) => save("meals", { [slot.key]: Number(event.target.value) })} className="h-8 font-semibold pointer-coarse:h-11">
                      {MEAL_STEPS.map((step) => (
                        <option key={step} value={step}>
                          {mealText(step, locale)}
                        </option>
                      ))}
                    </NativeSelect>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        </Card>

        <Card padding="none" className="flex items-center gap-4 border-expense-line p-5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.75">
            <h2 className="text-title font-semibold text-expense">{t("Delete this group")}</h2>
            <span className="text-small leading-relaxed text-ink-muted">{t("Removes {name} with every entry and closed month. This can't be undone.", { name: data.name })}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onDeleteGroup} className="border-expense/40 text-expense hover:bg-expense-soft">
            {t("Delete group")}
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={newStart !== null}
        onClose={() => setNewStart(null)}
        onConfirm={() => {
          if (newStart === null) return;
          save("general", { monthStartDay: newStart });
          // Back to the picker once saved, not to the dialog's button.
          refocus.current = document.getElementById("gs-start");
          setNewStart(null);
        }}
        icon={<CalendarClock />}
        danger={false}
        title={t("Start each month on the {day}?", { day: newStart === null ? "" : dayWord(newStart) })}
        description={
          startPreview
            ? t("{month} will run {range}. Entries keep their dates, so some move into the month before or after, and a closed month whose dates no longer match shows as open again.", {
                month: monthName(startPreview.key, locale, "long"),
                range: rangeLabel(startPreview, locale),
              })
            : ""
        }
        confirmLabel={t("Change the start day")}
      />
    </div>
  );
}
