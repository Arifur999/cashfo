"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Coffee, Copy, Minus, Moon, Plus, Sun, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import type { GroupMeal, GroupMember } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { countLabel, dayLabel, mealRateText, type MonthRange, shortName, weekdayLabel } from "@/lib/customer/groupDisplay";
import { changedMeals, type MealEntry, mealsOnDay, mealText, mealValue, type MealUnits, NO_MEALS } from "@/lib/customer/groupMeals";
import { setGroupMealsAction } from "@/lib/customer/groupExpensesActions";
import { shiftDay } from "@/lib/customer/habitDisplay";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./GroupBits";
import type { ClosedGuard } from "./groupTypes";

interface MealDayOptions {
  businessId: string;
  members: GroupMember[];
  // The month's meals, to start each day from.
  meals: GroupMeal[];
  units: MealUnits;
  // The month those meals are for: the editor stays inside it.
  range: MonthRange;
  closedGuard: ClosedGuard;
}

interface MealDrawerProps extends MealDayOptions {
  // The day it opens on; null keeps it shut.
  day: string | null;
  onClose: () => void;
}

const SLOTS = [
  { key: "breakfast", label: "Breakfast", short: "Bfast", icon: Coffee },
  { key: "lunch", label: "Lunch", short: "Lunch", icon: Sun },
  { key: "dinner", label: "Dinner", short: "Dinner", icon: Moon },
] as const;

// The member, the three meals, guests and the day's meals.
const COLUMNS = "grid-cols-[minmax(0,1fr)_40px_40px_40px_92px_40px] pointer-coarse:grid-cols-[minmax(0,1fr)_44px_44px_44px_100px_36px]";

// Whether someone is in the group on a day (joined by then, not yet left).
const inGroupOn = (member: GroupMember, day: string) => (member.status === "ACTIVE" || !!member.leftOn) && (!member.joinedOn || member.joinedOn.slice(0, 10) <= day) && (!member.leftOn || member.leftOn.slice(0, 10) >= day);

// A day inside the month the editor has the meals of.
const clampDay = (day: string, range: MonthRange) => (day < range.from ? range.from : day > range.to ? range.to : day);

// One day's meals being edited: each member's breakfast, lunch and dinner
// switched on or off and their guests' meals. Moving to another day saves
// this one first. Only the members whose day changed are sent, so a save
// never writes zeros over anyone else's meals. `openDay` (re)starts it.
function useMealDay(openDay: string | null, { businessId, members, meals, units, range, closedGuard }: MealDayOptions) {
  const { t } = useLocale();
  const router = useRouter();
  const [day, setDay] = useState(openDay ? clampDay(openDay, range) : "");
  const [entries, setEntries] = useState<Record<string, MealEntry>>(() => (openDay ? mealsOnDay(meals, clampDay(openDay, range)) : {}));
  // Days saved while open, as the server returned them: the page's meals
  // only catch up after its refresh.
  const [fresh, setFresh] = useState<Record<string, Record<string, MealEntry>>>({});
  // A closed month was asked about once already.
  const [closedOk, setClosedOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  const savedOn = (date: string) => fresh[date] ?? mealsOnDay(meals, date);

  const [prevOpen, setPrevOpen] = useState<string | null>(openDay);
  if (openDay !== prevOpen) {
    setPrevOpen(openDay);
    if (openDay) {
      const start = clampDay(openDay, range);
      setDay(start);
      setEntries(mealsOnDay(meals, start));
      setFresh({});
      setClosedOk(false);
    }
  }

  const shown = members.filter((member) => inGroupOn(member, day));
  const entryOf = (id: string): MealEntry => entries[id] ?? NO_MEALS;
  const valueOf = (id: string) => mealValue({ ...entryOf(id), guests: String(entryOf(id).guests) }, units);
  const total = shown.reduce((sum, member) => sum + valueOf(member.id), 0);
  const counts = SLOTS.map((slot) => shown.reduce((sum, member) => sum + entryOf(member.id)[slot.key], 0));
  const guests = shown.reduce((sum, member) => sum + entryOf(member.id).guests, 0);
  const changed = changedMeals(
    shown.map((member) => member.id),
    entries,
    savedOn(day),
  );

  function change(id: string, next: Partial<MealEntry>) {
    setEntries({ ...entries, [id]: { ...entryOf(id), ...next } });
  }

  // Saves the day shown, if anything changed, then runs `after` (another
  // day, or closing). A failed save keeps the editor where it is. One save
  // at a time: until it lands the day's buttons are locked, and a day picked
  // meanwhile is ignored, since it would send the same day again.
  async function save(after: () => void) {
    if (isPending) return;
    if (changed.length === 0) return after();
    if (closedGuard.isClosed(day) && !closedOk) {
      if (!(await closedGuard.ask(day))) return;
      setClosedOk(true);
    }
    startTransition(async () => {
      const result = await attempt(() => setGroupMealsAction(businessId, { date: day, entries: changed }), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) {
        toast.error(result.message ?? t("Failed to save the meals"));
        return;
      }
      setFresh((prev) => ({ ...prev, [day]: mealsOnDay(result.data ?? [], day) }));
      router.refresh();
      after();
    });
  }

  function go(next: string) {
    const target = clampDay(next, range);
    if (target === day) return;
    void save(() => {
      setDay(target);
      setEntries(savedOn(target));
    });
  }

  const sameAs = shiftDay(day || range.from, -1);
  return {
    day,
    shown,
    entryOf,
    valueOf,
    total,
    counts,
    guests,
    changed,
    isPending,
    change,
    save,
    go,
    sameAs,
    copyPrevious: () => setEntries({ ...entries, ...savedOn(sameAs) }),
    atStart: day <= range.from,
    atEnd: day >= range.to,
  };
}

// The guests stepper: − count +.
function GuestStepper({ name, value, disabled, onChange, className }: { name: string; value: number; disabled: boolean; onChange: (next: number) => void; className?: string }) {
  const { t, fmt } = useLocale();
  return (
    <span className={cn("flex items-center justify-between overflow-hidden rounded-sm border border-line", className)}>
      <button type="button" aria-label={t("One guest less for {name}", { name })} disabled={disabled || value === 0} onClick={() => onChange(value - 1)} className="flex h-full w-7 items-center justify-center bg-strip text-ink-soft disabled:text-ink-faint pointer-coarse:w-8">
        <Minus className="size-3" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <span aria-live="polite" className={cn("text-body font-semibold tabular-nums", value ? "text-ink" : "text-ink-faint")}>
        <span className="sr-only">{t("Guests")}: </span>
        {formatCount(value, fmt)}
      </span>
      <button type="button" aria-label={t("One more guest for {name}", { name })} disabled={disabled || value >= 20} onClick={() => onChange(value + 1)} className="flex h-full w-7 items-center justify-center bg-strip text-ink-soft disabled:opacity-40 pointer-coarse:w-8">
        <Plus className="size-3" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </span>
  );
}

// The day line: ‹ the day (a date picker) ›.
function DayNav({ meal, range, round = true, today }: { meal: ReturnType<typeof useMealDay>; range: MonthRange; round?: boolean; today?: string }) {
  const { t, fmt } = useLocale();
  const picker = useRef<HTMLInputElement>(null);
  const size = round ? "size-10" : "size-11";
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="icon" onClick={() => meal.go(shiftDay(meal.day, -1))} disabled={meal.isPending || meal.atStart} aria-label={t("Previous day")} className={cn(size, "text-ink-2 pointer-coarse:size-11 disabled:border-line disabled:bg-strip disabled:text-input disabled:opacity-100")}>
        <ChevronLeft />
      </Button>
      {/* The month whose meals are loaded, and no further. The date input
          under the words keeps the keyboard and the picker. */}
      <label className={cn("relative flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 border border-input bg-surface text-body font-semibold text-ink focus-within:border-emerald hover:bg-surface-sunken pointer-coarse:h-11", round ? "rounded-full" : "h-11 flex-col gap-0 rounded-field")}>
        {round ? (
          <>
            <CalendarDays className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="truncate">{weekdayLabel(meal.day || range.from, fmt)}</span>
          </>
        ) : (
          <>
            <span className="text-[15px] leading-normal font-semibold">{meal.day === today ? t("Today") : dayLabel(meal.day || range.from, fmt)}</span>
            <span className="text-caption font-normal text-ink-muted">{weekdayLabel(meal.day || range.from, fmt)}</span>
          </>
        )}
        <input
          ref={picker}
          type="date"
          value={meal.day}
          min={range.from}
          max={range.to}
          aria-label={t("Day")}
          onChange={(event) => event.target.value && meal.go(event.target.value)}
          onClick={() => {
            try {
              picker.current?.showPicker();
            } catch {
              // An older browser: the focused input still takes typing.
            }
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <Button variant="secondary" size="icon" onClick={() => meal.go(shiftDay(meal.day, 1))} disabled={meal.isPending || meal.atEnd} aria-label={t("Next day")} className={cn(size, "text-ink-2 pointer-coarse:size-11 disabled:border-line disabled:bg-strip disabled:text-input disabled:opacity-100")}>
        <ChevronRight />
      </Button>
    </div>
  );
}

// The board's "Meals for a day": a drawer over the meal sheet. Moving to
// another day, or shutting the drawer, saves this one first; Cancel drops
// the changes.
export function MealDrawer({ day: openDay, onClose, ...options }: MealDrawerProps) {
  const { t, fmt } = useLocale();
  const meal = useMealDay(openDay, options);
  const { units, range, members } = options;
  // Shutting it by the X, Escape or a tap outside saves, as moving on does.
  const shut = () => void meal.save(onClose);

  return (
    <Drawer
      open={openDay !== null}
      onClose={shut}
      busy={meal.isPending}
      title={t("Meals for a day")}
      width={480}
      footer={
        <>
          <span className="mr-auto text-small text-ink-muted">
            {t("{meals} meals", { meals: mealText(meal.total, fmt) })} · {countLabel(t, fmt, meal.shown.length, "{count} member", "{count} members")}
          </span>
          {/* Cancel drops the day's changes; every other way out saves them. */}
          <Button variant="ghost" onClick={onClose} disabled={meal.isPending} className="px-3.5">
            {t("Cancel")}
          </Button>
          <Button onClick={shut} disabled={meal.isPending} className="px-4.5">
            {meal.isPending && <Loader />}
            {t("Save meals")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <DayNav meal={meal} range={range} />
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* The month's first day has no day before it loaded. */}
          <Button variant="secondary" size="sm" disabled={meal.isPending || meal.atStart} onClick={meal.copyPrevious} className="h-8.5 gap-1.5 px-3 pointer-coarse:h-11">
            <Copy className="size-3.5 text-ink-soft" aria-hidden="true" />
            {t("Same as {day}", { day: dayLabel(meal.sameAs, fmt) })}
          </Button>
          <span className="text-[12.5px] text-ink-muted">{t("Tap a meal to switch it on or off")}</span>
        </div>

        <div role="table" aria-label={t("Meals on {day}", { day: dayLabel(meal.day || range.from, fmt, true) })} className="flex shrink-0 flex-col overflow-hidden rounded-md border border-line">
          <div role="row" className={cn("grid items-center gap-x-1.5 border-b border-line bg-strip px-3 py-2 text-center text-[11px] font-semibold text-ink-muted", COLUMNS)}>
            <span role="columnheader" className="text-left">
              {t("Member")}
            </span>
            {SLOTS.map((slot) => (
              <span key={slot.key} role="columnheader" className="flex flex-col leading-tight">
                <span>{t(slot.short)}</span>
                <span className="font-medium">{mealText(units[slot.key], fmt)}</span>
              </span>
            ))}
            <span role="columnheader">{t("Guests")}</span>
            <span role="columnheader" className="text-right">
              {t("Total")}
            </span>
          </div>
          {meal.shown.map((member) => {
            const entry = meal.entryOf(member.id);
            return (
              <div key={member.id} role="row" className={cn("grid h-14 items-center gap-x-1.5 border-b border-divider px-3", COLUMNS)}>
                <span role="cell" className="flex min-w-0 items-center gap-2 text-body font-medium text-ink">
                  <MemberAvatar member={member} members={members} size={28} className="text-[10px]" />
                  <span className="truncate">{shortName(member.name)}</span>
                </span>
                {SLOTS.map((slot) => {
                  const on = entry[slot.key] > 0;
                  return (
                    <span key={slot.key} role="cell" className="flex justify-center">
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={t("{meal} for {name}", { meal: t(slot.label), name: member.name })}
                        disabled={meal.isPending}
                        onClick={() => meal.change(member.id, { [slot.key]: on ? 0 : 1 })}
                        className={cn("flex h-9 w-10 items-center justify-center rounded-full border disabled:pointer-events-none disabled:opacity-50 pointer-coarse:size-11", on ? "border-[1.5px] border-emerald bg-mint-50 text-emerald" : "border-line bg-surface text-ink-faint hover:border-input")}
                      >
                        <slot.icon className="size-4" aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
                <span role="cell">
                  <GuestStepper name={member.name} value={entry.guests} disabled={meal.isPending} onChange={(guests) => meal.change(member.id, { guests })} className="h-9 pointer-coarse:h-11" />
                </span>
                <span role="cell" className="text-right text-body font-bold tabular-nums">
                  {mealText(meal.valueOf(member.id), fmt)}
                </span>
              </div>
            );
          })}
          {meal.shown.length === 0 && (
            <div role="row">
              <p role="cell" className="px-3 py-6 text-center text-small text-ink-muted">
                {t("No one was in the group on this day.")}
              </p>
            </div>
          )}
          <div role="row" className={cn("grid h-11.5 items-center gap-x-1.5 bg-strip px-3 text-center text-small font-semibold tabular-nums", COLUMNS)}>
            <span role="cell" className="text-left">
              {t("{day} total", { day: dayLabel(meal.day || range.from, fmt) })}
            </span>
            {meal.counts.map((count, index) => (
              <span key={SLOTS[index].key} role="cell">
                {formatCount(count, fmt)}
              </span>
            ))}
            <span role="cell">{formatCount(meal.guests, fmt)}</span>
            <span role="cell" className="text-right text-body font-bold">
              {mealText(meal.total, fmt)}
            </span>
          </div>
        </div>

        {/* A standing note, not a Banner: that one is a live region. */}
        <div className="flex items-start gap-2.5 rounded-field bg-warning-50 px-3.5 py-3 text-small leading-normal text-warning-ink">
          <User className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>{t("A guest meal counts as 1 meal on the member who brought the guest, so its cost lands on them, not on the whole mess.")}</span>
        </div>
      </div>
    </Drawer>
  );
}

interface MealDayPhoneProps extends MealDayOptions {
  // The day it starts on (today, inside the month on show).
  day: string;
  today: string;
  currency: string;
  // The month's meal rate so far (0 before the first by-meals cost).
  rate: number;
}

// The Meals tab on a phone (the MealsMobile board): one day at a time, a
// card per member with their three meals and guests, and the day's meals
// with Save at the foot of the screen.
export function MealDayPhone({ day, today, currency, rate, ...options }: MealDayPhoneProps) {
  const { t, fmt } = useLocale();
  const meal = useMealDay(day, options);
  const { members, range } = options;
  const isToday = meal.day === today;

  return (
    <div className="flex flex-col gap-3">
      <DayNav meal={meal} range={range} round={false} today={today} />
      {meal.shown.map((member) => {
        const entry = meal.entryOf(member.id);
        return (
          <Card key={member.id} padding="none" className="flex flex-col gap-2 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <MemberAvatar member={member} members={members} size={30} className="text-[11px]" />
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{shortName(member.name)}</span>
              <span className="text-small text-ink-muted">{t("Guests")}</span>
              <GuestStepper name={member.name} value={entry.guests} disabled={meal.isPending} onChange={(guests) => meal.change(member.id, { guests })} className="h-8 w-22" />
            </div>
            <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_44px] items-center gap-2">
              {SLOTS.map((slot) => {
                const on = entry[slot.key] > 0;
                return (
                  <button
                    key={slot.key}
                    type="button"
                    aria-pressed={on}
                    aria-label={t("{meal} for {name}", { meal: t(slot.label), name: member.name })}
                    disabled={meal.isPending}
                    onClick={() => meal.change(member.id, { [slot.key]: on ? 0 : 1 })}
                    className={cn("flex h-11 items-center justify-center gap-1.5 rounded-full border text-small font-semibold disabled:opacity-50", on ? "border-[1.5px] border-emerald bg-mint-50 text-emerald" : "border-line bg-surface text-ink-faint")}
                  >
                    <slot.icon className="size-3.75" aria-hidden="true" />
                    {t(slot.short)}
                  </button>
                );
              })}
              <span className="text-right text-title font-bold text-ink tabular-nums">{mealText(meal.valueOf(member.id), fmt)}</span>
            </div>
          </Card>
        );
      })}
      {meal.shown.length === 0 && <p className="py-6 text-center text-small text-ink-muted">{t("No one was in the group on this day.")}</p>}

      {/* The day's meals and Save, held at the foot of the screen, clear
          of the floating + in the corner. */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-1 flex items-center gap-3 border-t border-line bg-surface pt-3 pr-21 pb-5 pl-4 shadow-[0_-4px_16px_rgb(18_32_29/0.06)]">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-title font-bold text-ink tabular-nums">{isToday ? t("{meals} meals today", { meals: mealText(meal.total, fmt) }) : t("{meals} meals", { meals: mealText(meal.total, fmt) })}</span>
          <span className="truncate text-caption text-ink-muted">{rate > 0 ? t("Meal rate {rate}", { rate: mealRateText(rate, currency, fmt) }) : t("{month}'s meal rate shows after the first bazar", { month: monthName(range.key, fmt) })}</span>
        </span>
        <Button size="xl" onClick={() => void meal.save(() => toast.success(t("Meals saved")))} disabled={meal.isPending || meal.changed.length === 0} className="h-12 px-5.5 text-[15px]">
          {meal.isPending && <Loader />}
          {t("Save")}
        </Button>
      </div>
    </div>
  );
}
