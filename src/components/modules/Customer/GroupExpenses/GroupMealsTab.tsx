"use client";

import { Coffee, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Banner from "@/components/smartly/Banner";
import Card from "@/components/smartly/Card";
import { LIST_DIVIDER, LIST_HEAD, LIST_TOTAL } from "@/components/smartly/list";
import { formatCurrency } from "@/lib/customer/currency";
import { dayLabel } from "@/lib/customer/groupDisplay";
import { daysOf, mealSheet, mealText, unitsOf } from "@/lib/customer/groupMeals";
import { dayOf } from "@/lib/customer/habitDisplay";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { GroupPageData } from "./groupTypes";

interface GroupMealsTabProps {
  data: GroupPageData;
  // Opens a day's meals.
  onDay: (day: string) => void;
}

// One letter (or two) per weekday, Sunday first, that tells every day
// apart: the first letter of the Bangla short names would give বুধ and
// বৃহস্পতি, and শুক্র and শনি, the same one.
const DAY_INITIALS = {
  en: ["S", "M", "T", "W", "T", "F", "S"],
  bn: ["র", "সো", "ম", "বু", "বৃ", "শু", "শ"],
};

// The board's meal sheet: the month's meals, bazar and meal rate, then a
// row per member with each day's meals, their total and its cost, and a
// day-total row. A cell opens that day. The sheet is one tab stop: the
// arrow keys move between its days and members.
export function GroupMealsTab({ data, onDay }: GroupMealsTabProps) {
  const { t, locale } = useLocale();
  const units = unitsOf(data.settings);
  const sheet = mealSheet(data.meals, units);
  const days = daysOf(data.range.from, data.range.to);
  const rate = Number(data.settlement.mealRate);
  const members = data.members.filter((member) => member.status === "ACTIVE" || sheet.memberTotals[member.id]);
  const weekend = (day: string) => [5, 6].includes(dayOf(day).getUTCDay());
  const grid = { gridTemplateColumns: `160px repeat(${days.length}, 27px) 56px 80px` };
  const weights = [
    { icon: Coffee, label: "Breakfast", value: units.breakfast },
    { icon: Sun, label: "Lunch", value: units.lunch },
    { icon: Moon, label: "Dinner", value: units.dinner },
  ];
  const settingsLink = { pathname: `/group-expenses/${data.businessId}`, query: { tab: "settings", month: data.range.key }, hash: "gs-meals" };
  const money = (value: number) => formatCurrency(value, data.currency);

  // The cell that holds the sheet's one tab stop: row 0 is the day heads,
  // then a row per member. It starts on today.
  const sheetRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState(() => ({ row: 0, col: Math.max(0, days.indexOf(data.today)) }));
  const last = { row: members.length, col: days.length - 1 };
  // Kept inside the sheet when it shrinks (a member archived), so it always has its tab stop.
  const at = { row: Math.min(focus.row, last.row), col: Math.min(focus.col, last.col) };
  const stop = (row: number, col: number) => (row === at.row && col === at.col ? 0 : -1);

  function move(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLElement) || !event.target.dataset.cell) return;
    let { row, col } = at;
    if (event.key === "ArrowRight") col = Math.min(last.col, col + 1);
    else if (event.key === "ArrowLeft") col = Math.max(0, col - 1);
    else if (event.key === "ArrowDown") row = Math.min(last.row, row + 1);
    else if (event.key === "ArrowUp") row = Math.max(0, row - 1);
    else if (event.key === "Home") col = 0;
    else if (event.key === "End") col = last.col;
    else return;
    event.preventDefault();
    setFocus({ row, col });
    sheetRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${row}-${col}"]`)?.focus();
  }

  // The day's own colour: today mint, the weekend shaded.
  const dayTint = (day: string) => (day === data.today ? "bg-mint-50" : weekend(day) ? "bg-surface-sunken" : "");

  return (
    <div className="flex flex-col gap-5">
      {!data.settings.mealsOn && (
        <Banner tone="warning" inline>
          {t("Meal counting is off, so bazar is shared equally.")}{" "}
          <Link href={settingsLink} className="font-semibold underline">
            {t("Turn it on in Settings")}
          </Link>
        </Banner>
      )}

      <Card padding="none" className="flex flex-wrap items-center gap-6 px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-ink-muted">{t("Meals in {month}", { month: monthName(data.range.key, locale, "long") })}</span>
          <span className="text-h2 font-bold text-ink tabular-nums">{mealText(sheet.total, locale)}</span>
        </div>
        <span className="h-9 w-px bg-line" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-ink-muted">{t("Bazar")}</span>
          <span className="text-h2 font-bold text-ink tabular-nums">{money(Number(data.settlement.mealExpense))}</span>
        </div>
        <span className="h-9 w-px bg-line" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-ink-muted">{t("Meal rate · bazar ÷ meals")}</span>
          <span className="text-h2 font-bold text-emerald tabular-nums">{money(rate)}</span>
        </div>
        <span className="flex-1" />
        <div className="flex flex-wrap items-center gap-2 text-small text-ink-2">
          <span>{t("One meal counts as")}</span>
          {weights.map((weight) => (
            <span key={weight.label} className="flex h-7 items-center gap-1 rounded-full bg-surface-sunken px-3 font-medium">
              <weight.icon className="size-3.25 text-ink-muted" aria-hidden="true" />
              {t(weight.label)} <b className="text-ink">{mealText(weight.value, locale)}</b>
            </span>
          ))}
          <Link href={settingsLink} className="ml-1 font-semibold text-emerald hover:underline">
            {t("Edit")}
          </Link>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        {/* Scrolls sideways; the member column stays put. Its 160px of scroll
            padding keeps a day the arrow keys move to clear of that column. */}
        <div className="scroll-pl-40 overflow-x-auto">
          <div ref={sheetRef} role="table" aria-label={t("Meal sheet for {month}", { month: monthName(data.range.key, locale, "long", true) })} onKeyDown={move} className="w-max min-w-full">
            <div role="row" className={cn(LIST_HEAD, "grid h-11.5 items-stretch border-b border-line px-0 md:px-0")} style={grid}>
              <span role="columnheader" className="sticky left-0 z-10 flex items-center border-r border-divider bg-table-head pl-4">
                {t("Member")}
              </span>
              {days.map((day, col) => {
                const name = t("Meals on {day}", { day: dayLabel(day, locale, true) });
                return (
                  <span key={day} role="columnheader" className={cn("flex", dayTint(day))}>
                    <button
                      type="button"
                      data-cell={`0-${col}`}
                      tabIndex={stop(0, col)}
                      onClick={() => onDay(day)}
                      onFocus={() => setFocus({ row: 0, col })}
                      aria-label={name}
                      title={name}
                      className={cn("flex size-full flex-col items-center justify-center gap-px tabular-nums hover:bg-mint-50 focus-visible:-outline-offset-2", day === data.today && "font-bold text-emerald")}
                    >
                      <span aria-hidden="true" className="font-medium opacity-80">
                        {DAY_INITIALS[locale][dayOf(day).getUTCDay()]}
                      </span>
                      <span aria-hidden="true" className={day === data.today ? "font-bold" : "font-medium"}>
                        {formatCount(Number(day.slice(8)), locale)}
                      </span>
                    </button>
                  </span>
                );
              })}
              <span role="columnheader" className="flex items-center justify-end pr-3">
                {t("Meals")}
              </span>
              <span role="columnheader" className="flex items-center justify-end pr-4">
                {t("Cost")}
              </span>
            </div>
            {members.map((member, index) => {
              const row = index + 1;
              const total = sheet.memberTotals[member.id] ?? 0;
              return (
                <div key={member.id} role="row" className={cn("grid h-11.5 items-stretch text-caption tabular-nums", LIST_DIVIDER, index > 0 && "border-t")} style={grid}>
                  <span role="rowheader" className="sticky left-0 z-10 flex min-w-0 items-center gap-2 border-r border-divider bg-surface pl-4 text-body font-medium text-ink">
                    <PersonAvatar name={member.name} src={member.photoUrl} size={26} coloured />
                    <span className="truncate">{member.name}</span>
                  </span>
                  {days.map((day, col) => {
                    const cell = sheet.cells[member.id]?.[day];
                    const value = cell?.value ?? 0;
                    const name = `${t("{name}, {day}: {meals} meals", { name: member.name, day: dayLabel(day, locale), meals: mealText(value, locale) })}${cell?.guests ? ` · ${t("guest meal included")}` : ""}`;
                    return (
                      <span key={day} role="cell" className={cn("flex", dayTint(day))}>
                        <button
                          type="button"
                          data-cell={`${row}-${col}`}
                          tabIndex={stop(row, col)}
                          onClick={() => onDay(day)}
                          onFocus={() => setFocus({ row, col })}
                          aria-label={name}
                          title={name}
                          className={cn(
                            "relative flex size-full items-center justify-center hover:bg-mint-50 focus-visible:-outline-offset-2",
                            value === 0 ? "text-ink-muted" : value >= units.breakfast + units.lunch + units.dinner ? "text-ink" : "text-ink-muted",
                            cell?.guests ? "font-bold" : "font-medium",
                          )}
                        >
                          {value === 0 ? "–" : mealText(value, locale)}
                          {!!cell?.guests && <span className="absolute top-1.75 right-0.75 size-1.25 rounded-full bg-warning-fill" aria-hidden="true" />}
                        </button>
                      </span>
                    );
                  })}
                  <span role="cell" className="flex items-center justify-end pr-3 text-body font-bold text-ink">
                    {mealText(total, locale)}
                  </span>
                  <span role="cell" className="flex items-center justify-end pr-4 text-small font-semibold text-ink-2">
                    {money(total * rate)}
                  </span>
                </div>
              );
            })}
            <div role="row" className={cn(LIST_TOTAL, "grid h-11 items-stretch border-t border-line px-0 text-caption tabular-nums md:px-0")} style={grid}>
              <span role="rowheader" className="sticky left-0 z-10 flex items-center border-r border-divider bg-table-head pl-4 text-small">
                {t("Day total")}
              </span>
              {days.map((day) => (
                <span key={day} role="cell" className={cn("flex items-center justify-center font-semibold tracking-[-0.02em] text-ink-2", day === data.today && "bg-mint-50")}>
                  {sheet.dayTotals[day] ? mealText(sheet.dayTotals[day], locale) : "–"}
                </span>
              ))}
              <span role="cell" className="flex items-center justify-end pr-3 text-body font-bold">
                {mealText(sheet.total, locale)}
              </span>
              <span role="cell" className="flex items-center justify-end pr-4 text-small font-bold">
                {money(Number(data.settlement.mealExpense))}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4 text-small text-ink-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="size-1.75 rounded-full bg-warning-fill" aria-hidden="true" />
            {t("Guest meal included (charged to whoever brought the guest)")}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-bold text-ink-muted">–</span>
            {t("No meal")}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3.5 rounded-[3px] border border-line bg-surface-sunken" aria-hidden="true" />
            {t("Friday, Saturday")}
          </span>
        </div>
        <span>{t("Select a cell to change that day · cost = meals × {rate}", { rate: money(rate) })}</span>
      </div>
    </div>
  );
}
