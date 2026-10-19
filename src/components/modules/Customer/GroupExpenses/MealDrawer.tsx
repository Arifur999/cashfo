"use client";

import { ChevronLeft, ChevronRight, Coffee, Copy, Info, Minus, Moon, Plus, Sun, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GroupMeal, GroupMember } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { setGroupMealsAction } from "@/lib/customer/groupExpensesActions";
import { mealText, mealValue, type MealUnits } from "@/lib/customer/groupMeals";
import { shiftDay } from "@/lib/customer/habitDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface MealDrawerProps {
  // The day it opens on; null keeps it shut.
  day: string | null;
  onClose: () => void;
  businessId: string;
  members: GroupMember[];
  // The month's meals, to start each day from.
  meals: GroupMeal[];
  units: MealUnits;
}

interface Entry {
  breakfast: number;
  lunch: number;
  dinner: number;
  guests: number;
}

const NONE: Entry = { breakfast: 0, lunch: 0, dinner: 0, guests: 0 };
const SLOTS = [
  { key: "breakfast", label: "Breakfast", short: "Bfast", icon: Coffee },
  { key: "lunch", label: "Lunch", short: "Lunch", icon: Sun },
  { key: "dinner", label: "Dinner", short: "Dinner", icon: Moon },
] as const;

// Whether someone is in the group on a day (joined by then, not yet left).
const inGroupOn = (member: GroupMember, day: string) => (member.status === "ACTIVE" || !!member.leftOn) && (!member.joinedOn || member.joinedOn.slice(0, 10) <= day) && (!member.leftOn || member.leftOn.slice(0, 10) >= day);

// The board's "Meals for a day": each member's breakfast, lunch and dinner
// switched on or off and their guests' meals, a day at a time; moving to
// another day saves this one first.
export function MealDrawer({ day: openDay, onClose, businessId, members, meals, units }: MealDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [day, setDay] = useState(openDay ?? "");
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  const saved = (date: string): Record<string, Entry> =>
    Object.fromEntries(meals.filter((meal) => meal.date.slice(0, 10) === date).map((meal) => [meal.groupMemberId, { breakfast: meal.breakfast, lunch: meal.lunch, dinner: meal.dinner, guests: Number(meal.guests) }]));

  const [prevOpen, setPrevOpen] = useState<string | null>(null);
  if (openDay !== prevOpen) {
    setPrevOpen(openDay);
    if (openDay) {
      setDay(openDay);
      setEntries(saved(openDay));
      setDirty(false);
    }
  }

  const shown = members.filter((member) => inGroupOn(member, day));
  const entryOf = (id: string): Entry => entries[id] ?? NONE;
  const total = shown.reduce((sum, member) => sum + mealValue({ ...entryOf(member.id), guests: String(entryOf(member.id).guests) }, units), 0);
  const counts = SLOTS.map((slot) => shown.reduce((sum, member) => sum + entryOf(member.id)[slot.key], 0));
  const guests = shown.reduce((sum, member) => sum + entryOf(member.id).guests, 0);

  function change(id: string, next: Partial<Entry>) {
    setEntries({ ...entries, [id]: { ...entryOf(id), ...next } });
    setDirty(true);
  }

  // Saves the day shown, then runs `after` (another day, or closing).
  function save(after: () => void) {
    if (!dirty) return after();
    startTransition(async () => {
      const result = await setGroupMealsAction(businessId, { date: day, entries: shown.map((member) => ({ groupMemberId: member.id, ...entryOf(member.id) })) });
      if (!result.success) {
        toast.error(result.message ?? t("Failed to save the meals"));
        return;
      }
      setDirty(false);
      router.refresh();
      after();
    });
  }

  function go(next: string) {
    save(() => {
      setDay(next);
      setEntries(saved(next));
    });
  }

  const sameAs = shiftDay(day || "2026-01-01", -1);
  const short = (date: string) => formatDate(`${date}T00:00:00.000Z`, "d MMM");
  const grid = "grid grid-cols-[minmax(0,1fr)_40px_40px_40px_92px_40px] items-center gap-x-2";

  return (
    <Sheet open={openDay !== null} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-120 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-120" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{t("Meals for a day")}</SheetTitle>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" onClick={() => go(shiftDay(day, -1))} disabled={isPending} aria-label={t("Previous day")}>
              <ChevronLeft />
            </Button>
            <DayInput size="md" value={day} onChange={(next) => next && go(next)} className="h-10 flex-1 justify-center font-semibold" />
            <Button variant="secondary" size="icon" onClick={() => go(shiftDay(day, 1))} disabled={isPending} aria-label={t("Next day")}>
              <ChevronRight />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEntries({ ...entries, ...saved(sameAs) });
                setDirty(true);
              }}
              className="h-8.5 px-3 text-small"
            >
              <Copy className="size-4" aria-hidden="true" />
              {t("Same as {day}", { day: short(sameAs) })}
            </Button>
            <span className="text-small text-ink-muted">{t("Tap a meal to switch it on or off")}</span>
          </div>

          <div className="flex flex-col overflow-hidden rounded-lg border border-line">
            <div className={cn(grid, "border-b border-line bg-cream px-3 py-2 text-center text-caption font-semibold text-ink-muted")}>
              <span className="text-left">{t("Member")}</span>
              {SLOTS.map((slot) => (
                <span key={slot.key} className="flex flex-col leading-tight">
                  <span>{t(slot.short)}</span>
                  <span className="font-medium">{mealText(units[slot.key])}</span>
                </span>
              ))}
              <span>{t("Guests")}</span>
              <span className="text-right">{t("Total")}</span>
            </div>
            {shown.map((member) => {
              const entry = entryOf(member.id);
              return (
                <div key={member.id} className={cn(grid, "h-14 border-b border-surface-sunken px-3")}>
                  <span className="flex min-w-0 items-center gap-2 text-body font-medium">
                    <PersonAvatar name={member.name} src={member.photoUrl} size={28} coloured />
                    <span className="truncate">{member.name}</span>
                  </span>
                  {SLOTS.map((slot) => {
                    const on = entry[slot.key] > 0;
                    return (
                      <button
                        key={slot.key}
                        type="button"
                        aria-pressed={on}
                        aria-label={t("{meal} for {name}", { meal: t(slot.label), name: member.name })}
                        onClick={() => change(member.id, { [slot.key]: on ? 0 : 1 })}
                        className={cn("flex h-9 w-10 items-center justify-center rounded-md border", on ? "border-[1.5px] border-emerald bg-mint-50 text-emerald" : "border-line bg-surface text-ink-muted hover:border-line-strong")}
                      >
                        <slot.icon className="size-4" aria-hidden="true" />
                      </button>
                    );
                  })}
                  <span className="flex h-9 items-center justify-between overflow-hidden rounded-md border border-line">
                    <button type="button" aria-label={t("One guest less for {name}", { name: member.name })} disabled={entry.guests === 0} onClick={() => change(member.id, { guests: entry.guests - 1 })} className="flex h-full w-7 items-center justify-center bg-cream disabled:opacity-40">
                      <Minus className="size-3.5" aria-hidden="true" />
                    </button>
                    <span className={cn("text-body font-semibold tabular-nums", entry.guests ? "text-ink" : "text-ink-muted")}>{entry.guests}</span>
                    <button type="button" aria-label={t("One more guest for {name}", { name: member.name })} disabled={entry.guests >= 20} onClick={() => change(member.id, { guests: entry.guests + 1 })} className="flex h-full w-7 items-center justify-center bg-cream disabled:opacity-40">
                      <Plus className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                  <span className="text-right text-body font-bold tabular-nums">{mealText(mealValue({ ...entry, guests: String(entry.guests) }, units))}</span>
                </div>
              );
            })}
            {shown.length === 0 && <p className="px-3 py-6 text-center text-small text-ink-muted">{t("No one was in the group on this day.")}</p>}
            <div className={cn(grid, "h-11.5 bg-cream px-3 text-center text-small font-semibold tabular-nums")}>
              <span className="text-left">{t("{day} total", { day: short(day || "2026-01-01") })}</span>
              {counts.map((count, index) => (
                <span key={SLOTS[index].key}>{count}</span>
              ))}
              <span>{guests}</span>
              <span className="text-right text-body font-bold">{mealText(total)}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md bg-warning-soft px-4 py-3 text-small leading-normal text-warning">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{t("A guest meal counts as 1 meal on the member who brought the guest, so its cost lands on them, not on the whole mess.")}</span>
          </div>
        </div>

        <div className={cn("flex items-center gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 py-3")}>
          <span className="text-small text-ink-muted">{t("{meals} meals · {members} members", { meals: mealText(total), members: shown.length })}</span>
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button variant="action" onClick={() => save(onClose)} disabled={isPending} className="px-5">
            {isPending && <Loader />}
            {t("Save meals")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
