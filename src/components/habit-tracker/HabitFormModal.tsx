"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { HABIT_CATEGORIES, type Habit, type HabitFrequency } from "@/lib/api";
import {
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_ICONS,
  budgetCategoryColorClass,
  budgetCategoryIcon,
  budgetCategoryIconLabel,
} from "@/lib/budgetCategoryVisuals";
import { createHabitAction, updateHabitAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface HabitFormModalProps {
  open: boolean;
  onClose: () => void;
  editingHabit: Habit | null;
  // Pre-fills the Category field when adding a NEW habit from inside a
  // category-filtered Habits view (e.g. the Sidebar's "Book" sub-item) --
  // ignored when editing an existing habit, which always shows its own
  // real category instead.
  defaultCategory?: string;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Same name + icon + color picker as GroupExpenseCategoryModal, plus a
// frequency picker specific to habits: DAILY (default) needs no extra
// input; WEEKLY_DAYS toggles specific weekdays; WEEKLY_COUNT is a plain
// "N times a week" number, satisfiable on any day.
export function HabitFormModal({ open, onClose, editingHabit, defaultCategory }: HabitFormModalProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(defaultCategory ?? "Others");
  const [icon, setIcon] = useState<(typeof BUDGET_CATEGORY_ICONS)[number]>("target");
  const [color, setColor] = useState<(typeof BUDGET_CATEGORY_COLORS)[number]>(BUDGET_CATEGORY_COLORS[0]);
  const [iconSearch, setIconSearch] = useState("");
  const [frequencyType, setFrequencyType] = useState<HabitFrequency>("DAILY");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [weeklyCount, setWeeklyCount] = useState("3");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingHabit?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingHabit) {
        setName(editingHabit.name);
        setCategory(editingHabit.category);
        setIcon(editingHabit.icon as (typeof BUDGET_CATEGORY_ICONS)[number]);
        setColor(editingHabit.color as (typeof BUDGET_CATEGORY_COLORS)[number]);
        setFrequencyType(editingHabit.frequencyType);
        setWeeklyDays(editingHabit.weeklyDays);
        setWeeklyCount(String(editingHabit.weeklyCount ?? 3));
        setTargetValue(editingHabit.targetValue ? String(editingHabit.targetValue) : "");
        setUnit(editingHabit.unit ?? "");
      } else {
        setName("");
        setCategory(defaultCategory ?? "Others");
        setIcon("target");
        setColor(BUDGET_CATEGORY_COLORS[0]);
        setFrequencyType("DAILY");
        setWeeklyDays([]);
        setWeeklyCount("3");
        setTargetValue("");
        setUnit("");
      }
      setIconSearch("");
    }
  }

  function toggleWeekday(day: number) {
    setWeeklyDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort()));
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error(t("Give this habit a name"));
      return;
    }
    if (frequencyType === "WEEKLY_DAYS" && weeklyDays.length === 0) {
      toast.error(t("Pick at least one day"));
      return;
    }

    const input = {
      name: name.trim(),
      category,
      icon,
      color,
      frequencyType,
      weeklyDays: frequencyType === "WEEKLY_DAYS" ? weeklyDays : undefined,
      weeklyCount: frequencyType === "WEEKLY_COUNT" ? Number(weeklyCount) : undefined,
      targetValue: targetValue ? Number(targetValue) : undefined,
      unit: unit.trim() || undefined,
    };

    startTransition(async () => {
      const result = editingHabit ? await updateHabitAction(editingHabit.id, input) : await createHabitAction(input);
      if (result.success) {
        toast.success(editingHabit ? t("Habit updated") : t("Habit added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save habit"));
      }
    });
  }

  const query = iconSearch.trim().toLowerCase();
  const filteredIcons = query
    ? BUDGET_CATEGORY_ICONS.filter((iconKey) => iconKey.includes(query) || budgetCategoryIconLabel(iconKey).toLowerCase().includes(query))
    : BUDGET_CATEGORY_ICONS;

  return (
    <Modal open={open} onClose={onClose} title={editingHabit ? t("Edit Habit") : t("Add Habit")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Habit Name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g., Drink Water, Read, Exercise")}
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Category")}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            {HABIT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {t(cat)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Frequency")}</label>
          <div className="grid grid-cols-3 gap-2">
            {(["DAILY", "WEEKLY_DAYS", "WEEKLY_COUNT"] as HabitFrequency[]).map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => setFrequencyType(freq)}
                className={`rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${
                  frequencyType === freq ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {freq === "DAILY" ? t("Every day") : freq === "WEEKLY_DAYS" ? t("Specific days") : t("N times a week")}
              </button>
            ))}
          </div>
        </div>

        {frequencyType === "WEEKLY_DAYS" && (
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWeekday(day)}
                className={`rounded-lg py-2 text-xs font-medium transition-colors ${
                  weeklyDays.includes(day) ? "bg-brand-primary text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                }`}
              >
                {t(label)}
              </button>
            ))}
          </div>
        )}

        {frequencyType === "WEEKLY_COUNT" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Times per week")}</label>
            <input
              value={weeklyCount}
              onChange={(e) => setWeeklyCount(e.target.value.replace(/[^0-9]/g, "").slice(0, 1))}
              inputMode="numeric"
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              {t("Target")} <span className="text-neutral-400">({t("optional")})</span>
            </label>
            <input
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="8"
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              {t("Unit")} <span className="text-neutral-400">({t("optional")})</span>
            </label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={t("glasses")}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">{t("Choose an Icon")}</label>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              placeholder={t("Search icons...")}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div className="grid max-h-40 grid-cols-6 gap-2 overflow-y-auto pr-1">
            {filteredIcons.length === 0 ? (
              <p className="col-span-6 py-4 text-center text-sm text-neutral-400">{t("No matching icon")}</p>
            ) : (
              filteredIcons.map((iconKey) => {
                const Icon = budgetCategoryIcon(iconKey);
                const label = budgetCategoryIconLabel(iconKey);
                const selected = icon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setIcon(iconKey)}
                    title={label}
                    aria-label={label}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                      selected ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">{t("Choose a Color")}</label>
          <div className="grid grid-cols-4 gap-2">
            {BUDGET_CATEGORY_COLORS.map((colorKey) => {
              const selected = color === colorKey;
              return (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() => setColor(colorKey)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium text-white capitalize transition-shadow ${budgetCategoryColorClass(colorKey)} ${
                    selected ? "ring-2 ring-offset-2 ring-neutral-900" : ""
                  }`}
                >
                  {t(colorKey)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingHabit ? t("Save Changes") : t("Add Habit")}
        </button>
      </div>
    </Modal>
  );
}
