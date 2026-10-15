"use client";

import { Archive, Check, Info, Minus, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Habit, HabitFrequency } from "@/lib/customer/api";
import { budgetCategoryHex, budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { ruleLabel, WEEKDAY_SHORT } from "@/lib/customer/habitDisplay";
import { createHabitAction, deleteHabitAction, updateHabitAction } from "@/lib/customer/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { HABIT_COLORS, HABIT_ICONS, HABIT_UNITS, type HabitColorKey, type HabitIconKey } from "./habitVisuals";

interface HabitDrawerProps {
  open: boolean;
  onClose: () => void;
  editing: Habit | null;
}

const OFTEN: { value: HabitFrequency; title: string; sub: string }[] = [
  { value: "DAILY", title: "Every day", sub: "Planned for all seven days" },
  { value: "WEEKLY_DAYS", title: "On certain days", sub: "Pick the days, like Sunday to Thursday" },
  { value: "WEEKLY_COUNT", title: "A few times a week", sub: "Any days you like. The week starts on Saturday." },
];

// Saturday first, as the app's week runs.
const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

// A new or edited habit in the design's drawer: its name, icon and colour,
// how often, and whether an amount is counted each time.
export function HabitDrawer({ open, onClose, editing }: HabitDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<HabitIconKey>("droplet");
  const [color, setColor] = useState<HabitColorKey>("blue");
  const [frequency, setFrequency] = useState<HabitFrequency>("DAILY");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [count, setCount] = useState(3);
  const [counted, setCounted] = useState(false);
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("minutes");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setIcon((editing?.icon as HabitIconKey) ?? "droplet");
      setColor((editing?.color as HabitColorKey) ?? "blue");
      setFrequency(editing?.frequencyType ?? "DAILY");
      setDays(editing?.weeklyDays?.length ? editing.weeklyDays : [0, 1, 2, 3, 4]);
      setCount(editing?.weeklyCount ?? 3);
      setCounted(!!editing?.targetValue);
      setTarget(editing?.targetValue ? String(editing.targetValue) : "");
      setUnit(editing?.unit ?? "minutes");
    }
  }

  const targetValue = Number(target) || 0;
  const valid = name.trim().length > 0 && (frequency !== "WEEKLY_DAYS" || days.length > 0) && (!counted || targetValue > 0);
  const preview = ruleLabel({ frequencyType: frequency, weeklyDays: days, weeklyCount: count, targetValue: counted ? targetValue : null, unit: counted ? unit.trim() : null });
  const tone = categoryTone(color);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = {
        name: name.trim(),
        icon,
        color,
        frequencyType: frequency,
        weeklyDays: frequency === "WEEKLY_DAYS" ? [...days].sort((a, b) => a - b) : [],
        weeklyCount: frequency === "WEEKLY_COUNT" ? count : undefined,
        targetValue: counted ? targetValue : null,
        unit: counted ? unit.trim() || null : null,
      };
      const result = editing ? await updateHabitAction(editing.id, input) : await createHabitAction(input);
      if (result.success) {
        toast.success(editing ? t("Habit updated") : t("Habit added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save the habit"));
      }
    });
  }

  function archive() {
    if (!editing || isPending) return;
    startTransition(async () => {
      const result = await deleteHabitAction(editing.id);
      if (result.success) {
        toast.success(result.data?.action === "deleted" ? t("Habit removed") : t("Habit archived"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to archive the habit"));
      }
    });
  }

  const toggleDay = (day: number) => setDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
  const label = (text: string) => <span className="text-body font-medium text-ink">{text}</span>;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-120 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-120" : "h-[92vh] rounded-t-xl")}>
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <div className="flex flex-col gap-0.5">
            <SheetTitle className="text-h3 text-ink">{editing ? t("Edit habit") : t("New habit")}</SheetTitle>
            <span className="text-small text-ink-muted">{t("It shows up in your daily list on the days you plan.")}</span>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="hb-name" label={label(t("Name"))}>
              <Input id="hb-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder={t("Morning walk")} />
            </Field>

            <div className="grid grid-cols-[minmax(0,1fr)_150px] gap-5">
              <fieldset className="flex min-w-0 flex-col gap-2">
                <legend className="mb-2 text-body font-medium text-ink">{t("Icon")}</legend>
                <div role="radiogroup" aria-label={t("Icon")} className="grid grid-cols-[repeat(6,36px)] gap-2">
                  {HABIT_ICONS.map((option) => {
                    const on = option.key === icon;
                    return (
                      <button key={option.key} type="button" role="radio" aria-checked={on} aria-label={t(option.label)} onClick={() => setIcon(option.key)} className={cn("flex size-9 items-center justify-center rounded-md border transition-colors [&_svg]:size-4.5", on ? cn("border-2", tone.bg, tone.fg) : "border-line bg-surface text-ink-2 hover:border-line-strong")} style={on ? { borderColor: budgetCategoryHex(color) } : undefined}>
                        {createElement(budgetCategoryIcon(option.key), { "aria-hidden": true })}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-body font-medium text-ink">{t("Colour")}</legend>
                <div role="radiogroup" aria-label={t("Colour")} className="grid grid-cols-[repeat(4,28px)] gap-x-3 gap-y-2">
                  {HABIT_COLORS.map((option) => {
                    const on = option.key === color;
                    return <button key={option.key} type="button" role="radio" aria-checked={on} aria-label={t(option.label)} onClick={() => setColor(option.key)} className={cn("size-7 rounded-full transition-shadow", on && "ring-2 ring-offset-2 ring-offset-surface")} style={{ background: budgetCategoryHex(option.key), ...(on && { boxShadow: `0 0 0 2px var(--surface), 0 0 0 4px ${budgetCategoryHex(option.key)}` }) }} />;
                  })}
                </div>
              </fieldset>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-medium text-ink">{t("How often")}</legend>
              {OFTEN.map((option) => {
                const on = frequency === option.value;
                return (
                  <label key={option.value} className={cn("flex cursor-pointer flex-col gap-3 rounded-md border px-4 py-3 transition-colors", on ? "border-[1.5px] border-emerald bg-mint-50" : "border-line bg-surface hover:border-line-strong")}>
                    <span className="flex items-center gap-3">
                      <span role="radio" aria-checked={on} tabIndex={0} onClick={() => setFrequency(option.value)} onKeyDown={(event) => (event.key === " " || event.key === "Enter") && (event.preventDefault(), setFrequency(option.value))} className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-full border bg-surface", on ? "border-2 border-emerald" : "border-[1.5px] border-line-strong")}>
                        <span className={cn("size-2 rounded-full", on ? "bg-emerald" : "bg-transparent")} />
                      </span>
                      <span className="flex flex-col gap-px">
                        <span className="text-body font-semibold text-ink">{t(option.title)}</span>
                        <span className="text-small text-ink-muted">{t(option.sub)}</span>
                      </span>
                    </span>
                    {on && option.value === "WEEKLY_DAYS" && (
                      <span className="flex gap-2 pl-8">
                        {DAY_ORDER.map((day) => {
                          const picked = days.includes(day);
                          return (
                            <button key={day} type="button" aria-pressed={picked} onClick={() => toggleDay(day)} className={cn("flex h-8 w-9 items-center justify-center rounded-sm text-small font-semibold transition-colors", picked ? "bg-emerald text-white" : "border border-line bg-surface text-ink-2 hover:border-line-strong")}>
                              {t(WEEKDAY_SHORT[day]).slice(0, 2)}
                            </button>
                          );
                        })}
                      </span>
                    )}
                    {on && option.value === "WEEKLY_COUNT" && (
                      <span className="flex items-center gap-3 pl-8">
                        <span className="flex h-9 items-center overflow-hidden rounded-md border border-line-strong bg-surface">
                          <button type="button" aria-label={t("One less")} onClick={() => setCount(Math.max(1, count - 1))} className="flex size-8.5 items-center justify-center text-ink-2 hover:bg-cream">
                            <Minus className="size-4" aria-hidden="true" />
                          </button>
                          <span className="w-9 border-x border-line text-center text-body-lg font-bold text-ink tabular-nums">{count}</span>
                          <button type="button" aria-label={t("One more")} onClick={() => setCount(Math.min(7, count + 1))} className="flex size-8.5 items-center justify-center text-ink-2 hover:bg-cream">
                            <Plus className="size-4" aria-hidden="true" />
                          </button>
                        </span>
                        <span className="text-body text-ink-2">{t("times a week, on any days")}</span>
                      </span>
                    )}
                  </label>
                );
              })}
            </fieldset>

            <div className="flex flex-col gap-3 rounded-md border border-line bg-cream p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex flex-col gap-px">
                  <span className="text-body font-semibold text-ink">{t("Count an amount")}</span>
                  <span className="text-small text-ink-muted">{t("Like 8 glasses or 30 minutes. Leave off for a simple tick.")}</span>
                </span>
                <button type="button" role="switch" aria-checked={counted} aria-label={t("Count an amount")} onClick={() => setCounted(!counted)} className={cn("relative h-5.5 w-10 shrink-0 rounded-full transition-colors", counted ? "bg-emerald" : "bg-line-strong")}>
                  <span className={cn("absolute top-0.75 size-4 rounded-full bg-white transition-[left]", counted ? "left-5.25" : "left-0.75")} />
                </button>
              </div>
              {counted && (
                <>
                  <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                    <Field htmlFor="hb-target" label={<span className="text-small font-medium text-ink-2">{t("Goal each time")}</span>}>
                      <Input id="hb-target" size="sm" inputMode="numeric" value={target} onChange={(event) => setTarget(event.target.value.replace(/\D/g, ""))} placeholder="30" />
                    </Field>
                    <Field htmlFor="hb-unit" label={<span className="text-small font-medium text-ink-2">{t("Unit")}</span>}>
                      <Input id="hb-unit" size="sm" value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={20} placeholder={t("minutes")} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {HABIT_UNITS.map((option) => (
                      <button key={option} type="button" onClick={() => setUnit(option)} className={cn("h-6.5 rounded-full border px-3 text-caption font-semibold transition-colors", unit === option ? "border-emerald bg-mint-50 text-emerald" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                        {t(option)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <span className="flex items-center gap-2 text-small text-ink-2">
              <Info className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              {t("Shows as")}{" "}
              <b className="font-semibold text-ink">
                {name.trim() || t("Habit")} · {t(preview.days)}
                {preview.amount ? ` · ${preview.amount} ${t("each time")}` : ""}
              </b>
            </span>
          </div>

          <div className={cn("flex items-center gap-3 border-t border-line bg-cream", wide ? "px-6 py-4" : "px-4 py-3")}>
            {editing && !editing.isArchived && (
              <Button type="button" variant="ghost" onClick={archive} disabled={isPending}>
                <Archive />
                {t("Archive")}
              </Button>
            )}
            <span className="flex-1" />
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {editing ? <Check /> : null}
              {editing ? t("Save changes") : t("Add habit")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
