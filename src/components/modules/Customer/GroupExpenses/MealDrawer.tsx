"use client";

import { ChevronLeft, ChevronRight, Coffee, Copy, Info, Minus, Moon, Plus, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import { ListCard, ListCell, ListHead, ListHeadCell, ListRow, ListTotalRow } from "@/components/smartly/list";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GroupMeal, GroupMember } from "@/lib/customer/api";
import { countLabel, dayLabel, type MonthRange } from "@/lib/customer/groupDisplay";
import { changedMeals, type MealEntry, mealsOnDay, mealText, mealValue, type MealUnits, NO_MEALS } from "@/lib/customer/groupMeals";
import { setGroupMealsAction } from "@/lib/customer/groupExpensesActions";
import { shiftDay } from "@/lib/customer/habitDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { attempt } from "./attempt";
import { CloseX } from "./GroupBits";
import type { ClosedGuard } from "./groupTypes";

interface MealDrawerProps {
  // The day it opens on; null keeps it shut.
  day: string | null;
  onClose: () => void;
  businessId: string;
  members: GroupMember[];
  // The month's meals, to start each day from.
  meals: GroupMeal[];
  units: MealUnits;
  // The month those meals are for: the drawer stays inside it.
  range: MonthRange;
  closedGuard: ClosedGuard;
}

const SLOTS = [
  { key: "breakfast", label: "Breakfast", short: "Bfast", icon: Coffee },
  { key: "lunch", label: "Lunch", short: "Lunch", icon: Sun },
  { key: "dinner", label: "Dinner", short: "Dinner", icon: Moon },
] as const;

// The member, the three meals, guests and the day's meals: one line from
// sm up, two on a phone (the member and their total, then the switches),
// so a name keeps its room at 360px.
const HEAD = "sm:grid-cols-[minmax(0,1fr)_40px_40px_40px_92px_40px] sm:pointer-coarse:grid-cols-[minmax(0,1fr)_44px_44px_44px_124px_40px]";
const COLUMNS = cn("grid-cols-[44px_44px_44px_minmax(0,1fr)_auto]", HEAD);
// On a phone the cells are placed by hand: the name and total first, the
// switches on the line under them.
const PHONE = {
  name: "max-sm:col-span-4 max-sm:row-start-1",
  total: "max-sm:col-start-5 max-sm:row-start-1",
  slot: ["max-sm:col-start-1", "max-sm:col-start-2", "max-sm:col-start-3"],
  guests: "max-sm:col-start-4",
};

// Whether someone is in the group on a day (joined by then, not yet left).
const inGroupOn = (member: GroupMember, day: string) => (member.status === "ACTIVE" || !!member.leftOn) && (!member.joinedOn || member.joinedOn.slice(0, 10) <= day) && (!member.leftOn || member.leftOn.slice(0, 10) >= day);

// A day inside the month the drawer has the meals of.
const clampDay = (day: string, range: MonthRange) => (day < range.from ? range.from : day > range.to ? range.to : day);

// The board's "Meals for a day": each member's breakfast, lunch and dinner
// switched on or off and their guests' meals, a day at a time. Moving to
// another day, or shutting the drawer, saves this one first; Cancel drops
// the changes. Only the members whose day changed are sent, so a save never
// writes zeros over anyone else's meals.
export function MealDrawer({ day: openDay, onClose, businessId, members, meals, units, range, closedGuard }: MealDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [day, setDay] = useState(openDay ?? "");
  const [entries, setEntries] = useState<Record<string, MealEntry>>({});
  // Days saved while open, as the server returned them: the page's meals
  // only catch up after its refresh.
  const [fresh, setFresh] = useState<Record<string, Record<string, MealEntry>>>({});
  // A closed month was asked about once already.
  const [closedOk, setClosedOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  const savedOn = (date: string) => fresh[date] ?? mealsOnDay(meals, date);

  const [prevOpen, setPrevOpen] = useState<string | null>(null);
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
  const total = shown.reduce((sum, member) => sum + mealValue({ ...entryOf(member.id), guests: String(entryOf(member.id).guests) }, units), 0);
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
  // day, or closing). A failed save keeps the drawer where it is. One save
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
      const result = await attempt(() => setGroupMealsAction(businessId, { date: day, entries: changed }), t("No connection. Nothing was saved; try again."));
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

  // Shutting it by the X, Escape or a tap outside saves, as moving on does.
  const shut = () => void save(onClose);

  const sameAs = shiftDay(day || range.from, -1);
  const atStart = day <= range.from;
  const atEnd = day >= range.to;

  return (
    <Sheet open={openDay !== null} onOpenChange={(next) => !next && !isPending && shut()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-120 shadow-drawer data-[side=right]:sm:max-w-120" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{t("Meals for a day")}</SheetTitle>
          <CloseX onClick={shut} disabled={isPending} />
        </SheetHeader>

        <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" onClick={() => go(shiftDay(day, -1))} disabled={isPending || atStart} aria-label={t("Previous day")} className="pointer-coarse:size-11">
              <ChevronLeft />
            </Button>
            {/* The month whose meals are loaded, and no further. */}
            <DayInput size="md" value={day} onChange={go} min={range.from} max={range.to} aria-label={t("Day")} className="h-10 flex-1 justify-center font-semibold pointer-coarse:h-11" />
            <Button variant="secondary" size="icon" onClick={() => go(shiftDay(day, 1))} disabled={isPending || atEnd} aria-label={t("Next day")} className="pointer-coarse:size-11">
              <ChevronRight />
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* The month's first day has no day before it loaded. */}
            <Button
              variant="secondary"
              size="sm"
              disabled={isPending || atStart}
              onClick={() => setEntries({ ...entries, ...savedOn(sameAs) })}
              className="h-8.5 px-3 text-small pointer-coarse:h-11"
            >
              <Copy className="size-4" aria-hidden="true" />
              {t("Same as {day}", { day: dayLabel(sameAs, locale) })}
            </Button>
            <span className="text-small text-ink-muted">{t("Select a meal to switch it on or off")}</span>
          </div>
          {/* The column heads carry each meal's weight; a phone has no heads. */}
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-ink-muted sm:hidden">
            {SLOTS.map((slot) => (
              <span key={slot.key} className="flex items-center gap-1">
                <slot.icon className="size-3.5" aria-hidden="true" />
                {t(slot.label)} {mealText(units[slot.key], locale)}
              </span>
            ))}
          </p>

          <ListCard label={t("Meals on {day}", { day: dayLabel(day || range.from, locale, true) })} elevated={false} className="shrink-0">
            <ListHead columns={HEAD} className="hidden gap-x-2 px-3 text-center sm:grid md:px-3">
              <ListHeadCell>{t("Member")}</ListHeadCell>
              {SLOTS.map((slot) => (
                <ListHeadCell key={slot.key} align="center" className="flex flex-col leading-tight">
                  <span>{t(slot.short)}</span>
                  <span className="font-semibold">{mealText(units[slot.key], locale)}</span>
                </ListHeadCell>
              ))}
              <ListHeadCell align="center">{t("Guests")}</ListHeadCell>
              <ListHeadCell align="end">{t("Total")}</ListHeadCell>
            </ListHead>
            {shown.map((member) => {
              const entry = entryOf(member.id);
              return (
                <ListRow key={member.id} columns={COLUMNS} className="gap-x-2 gap-y-2 px-3 md:px-3">
                  <ListCell className={cn("flex items-center gap-2 font-medium", PHONE.name)}>
                    <PersonAvatar name={member.name} src={member.photoUrl} size={28} coloured />
                    <span className="truncate">{member.name}</span>
                  </ListCell>
                  {SLOTS.map((slot, index) => {
                    const on = entry[slot.key] > 0;
                    return (
                      <ListCell key={slot.key} className={cn("flex justify-center max-sm:row-start-2", PHONE.slot[index])}>
                        <button
                          type="button"
                          aria-pressed={on}
                          aria-label={t("{meal} for {name}", { meal: t(slot.label), name: member.name })}
                          disabled={isPending}
                          onClick={() => change(member.id, { [slot.key]: on ? 0 : 1 })}
                          className={cn("flex h-9 w-10 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-50 pointer-coarse:size-11", on ? "border-[1.5px] border-emerald bg-mint-50 text-emerald" : "border-line bg-surface text-ink-muted hover:border-line-strong")}
                        >
                          <slot.icon className="size-4" aria-hidden="true" />
                        </button>
                      </ListCell>
                    );
                  })}
                  <ListCell className={cn("max-sm:row-start-2", PHONE.guests)}>
                    <span className="flex h-9 w-23 items-center justify-between overflow-hidden rounded-md border border-line sm:w-full pointer-coarse:h-11">
                      <button type="button" aria-label={t("One guest less for {name}", { name: member.name })} disabled={isPending || entry.guests === 0} onClick={() => change(member.id, { guests: entry.guests - 1 })} className="flex h-full w-7 items-center justify-center bg-strip disabled:opacity-40 pointer-coarse:w-11">
                        <Minus className="size-3.5" aria-hidden="true" />
                      </button>
                      <span aria-live="polite" className={cn("text-body font-semibold tabular-nums", entry.guests ? "text-ink" : "text-ink-muted")}>
                        <span className="sr-only">{t("Guests")}: </span>
                        {formatCount(entry.guests, locale)}
                      </span>
                      <button type="button" aria-label={t("One more guest for {name}", { name: member.name })} disabled={isPending || entry.guests >= 20} onClick={() => change(member.id, { guests: entry.guests + 1 })} className="flex h-full w-7 items-center justify-center bg-strip disabled:opacity-40 pointer-coarse:w-11">
                        <Plus className="size-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  </ListCell>
                  <ListCell align="end" className={cn("font-bold tabular-nums", PHONE.total)}>
                    {mealText(mealValue({ ...entry, guests: String(entry.guests) }, units), locale)}
                  </ListCell>
                </ListRow>
              );
            })}
            {shown.length === 0 && (
              <div role="row">
                <p role="cell" className="px-3 py-6 text-center text-small text-ink-muted">
                  {t("No one was in the group on this day.")}
                </p>
              </div>
            )}
            <ListTotalRow columns={HEAD} className="min-h-11.5 gap-x-2 px-3 text-center text-small tabular-nums md:px-3">
              <span role="cell" className="text-left">
                {t("{day} total", { day: dayLabel(day || range.from, locale) })}
              </span>
              {counts.map((count, index) => (
                <span key={SLOTS[index].key} role="cell" className="hidden sm:block">
                  {formatCount(count, locale)}
                </span>
              ))}
              <span role="cell" className="hidden sm:block">
                {formatCount(guests, locale)}
              </span>
              <span role="cell" className="text-right text-body font-bold">
                {mealText(total, locale)}
              </span>
            </ListTotalRow>
          </ListCard>

          {/* A standing note, not a Banner: that one is a live region. */}
          <div className="flex items-start gap-3 rounded-md bg-warning-soft px-4 py-3 text-small leading-normal text-warning">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{t("A guest meal counts as 1 meal on the member who brought the guest, so its cost lands on them, not on the whole mess.")}</span>
          </div>
        </div>

        <div className={cn("flex flex-wrap items-center gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 py-3")}>
          <span className="text-small text-ink-muted">
            {t("{meals} meals", { meals: mealText(total, locale) })} · {countLabel(t, locale, shown.length, "{count} member", "{count} members")}
          </span>
          <span className="flex-1" />
          {/* Cancel drops the day's changes; every other way out saves them. */}
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button onClick={shut} disabled={isPending} className="px-5">
            {isPending && <Loader />}
            {t("Save meals")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
