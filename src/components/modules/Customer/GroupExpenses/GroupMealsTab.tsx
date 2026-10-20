"use client";

import { Coffee, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Banner from "@/components/smartly/Banner";
import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/customer/currency";
import { dayOf, WEEKDAY_SHORT } from "@/lib/customer/habitDisplay";
import { daysOf, mealSheet, mealText, unitsOf } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { GroupPageData } from "./groupTypes";

interface GroupMealsTabProps {
  data: GroupPageData;
  // Opens a day's meals.
  onDay: (day: string) => void;
}

// The board's meal sheet: the month's meals, bazar and meal rate, then a
// row per member with each day's meals, their total and its cost, and a
// day-total row. A cell opens that day.
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

  return (
    <div className="flex flex-col gap-5">
      {!data.settings.mealsOn && (
        <Banner tone="warning" inline>
          {t("Meal counting is off, so bazar is shared equally.")}{" "}
          <Link href={{ pathname: `/group-expenses/${data.businessId}`, query: { tab: "settings", month: data.range.key } }} className="font-semibold underline">
            {t("Turn it on in Settings")}
          </Link>
        </Banner>
      )}

      <Card padding="none" className="flex flex-wrap items-center gap-6 px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-ink-muted">{t("Meals in {month}", { month: monthName(data.range.key, locale, "long") })}</span>
          <span className="text-h2 font-bold text-ink tabular-nums">{mealText(sheet.total)}</span>
        </div>
        <span className="h-9 w-px bg-line" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-ink-muted">{t("Bazar")}</span>
          <span className="text-h2 font-bold text-ink tabular-nums">{formatCurrency(Number(data.settlement.mealExpense), data.currency)}</span>
        </div>
        <span className="h-9 w-px bg-line" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-ink-muted">{t("Meal rate · bazar ÷ meals")}</span>
          <span className="text-h2 font-bold text-emerald tabular-nums">{formatCurrency(rate, data.currency)}</span>
        </div>
        <span className="flex-1" />
        <div className="flex flex-wrap items-center gap-2 text-small text-ink-2">
          <span>{t("One meal counts as")}</span>
          {weights.map((weight) => (
            <span key={weight.label} className="flex h-7 items-center gap-1 rounded-full bg-surface-sunken px-3 font-medium">
              <weight.icon className="size-3.25 text-ink-muted" aria-hidden="true" />
              {t(weight.label)} <b className="text-ink">{mealText(weight.value)}</b>
            </span>
          ))}
          <Link href={{ pathname: `/group-expenses/${data.businessId}`, query: { tab: "settings", month: data.range.key } }} className="ml-1 font-semibold text-emerald hover:underline">
            {t("Edit")}
          </Link>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <div role="table" aria-label={t("Meal sheet for {month}", { month: monthName(data.range.key, locale, "long", true) })} className="w-max min-w-full">
            <div role="row" className="grid h-11.5 items-stretch border-b border-line bg-table-head text-caption text-ink-muted" style={grid}>
              <span role="columnheader" className="flex items-center pl-4 font-medium">
                {t("Member")}
              </span>
              {days.map((day) => (
                <button key={day} type="button" role="columnheader" onClick={() => onDay(day)} title={t("Meals on {day}", { day })} className={cn("flex flex-col items-center justify-center gap-px tabular-nums hover:bg-mint-50", day === data.today ? "bg-mint-50 font-bold text-emerald" : weekend(day) ? "bg-surface-sunken" : "")}>
                  <span className="font-medium opacity-80">{t(WEEKDAY_SHORT[dayOf(day).getUTCDay()]).slice(0, 1)}</span>
                  <span className={day === data.today ? "font-bold" : "font-medium"}>{Number(day.slice(8))}</span>
                </button>
              ))}
              <span role="columnheader" className="flex items-center justify-end pr-3 font-medium">
                {t("Meals")}
              </span>
              <span role="columnheader" className="flex items-center justify-end pr-4 font-medium">
                {t("Cost")}
              </span>
            </div>
            {members.map((member) => {
              const total = sheet.memberTotals[member.id] ?? 0;
              return (
                <div key={member.id} role="row" className="grid h-11.5 items-stretch border-b border-surface-sunken text-caption tabular-nums" style={grid}>
                  <span role="rowheader" className="flex min-w-0 items-center gap-2 pl-4 text-body font-medium text-ink">
                    <PersonAvatar name={member.name} src={member.photoUrl} size={26} coloured />
                    <span className="truncate">{member.name}</span>
                  </span>
                  {days.map((day) => {
                    const cell = sheet.cells[member.id]?.[day];
                    const value = cell?.value ?? 0;
                    return (
                      <button
                        key={day}
                        type="button"
                        role="cell"
                        onClick={() => onDay(day)}
                        title={`${member.name}, ${day}: ${mealText(value)} ${t("meals")}${cell?.guests ? ` · ${t("guest meal included")}` : ""}`}
                        className={cn("relative flex items-center justify-center hover:bg-mint-50", day === data.today ? "bg-mint-50" : weekend(day) && "bg-surface-sunken", value === 0 ? "text-ink-muted" : value >= units.breakfast + units.lunch + units.dinner ? "text-ink" : "text-ink-muted", cell?.guests ? "font-bold" : "font-medium")}
                      >
                        {value === 0 ? "–" : mealText(value)}
                        {!!cell?.guests && <span className="absolute top-1.75 right-0.75 size-1.25 rounded-full bg-warning-fill" aria-hidden="true" />}
                      </button>
                    );
                  })}
                  <span role="cell" className="flex items-center justify-end pr-3 text-body font-bold text-ink">
                    {mealText(total)}
                  </span>
                  <span role="cell" className="flex items-center justify-end pr-4 text-small font-semibold text-ink-2">
                    {formatCurrency(total * rate, data.currency)}
                  </span>
                </div>
              );
            })}
            <div role="row" className="grid h-11 items-stretch bg-table-head text-caption tabular-nums" style={grid}>
              <span role="rowheader" className="flex items-center pl-4 text-small font-semibold text-ink">
                {t("Day total")}
              </span>
              {days.map((day) => (
                <span key={day} role="cell" className={cn("flex items-center justify-center font-semibold tracking-[-0.02em] text-ink-2", day === data.today && "bg-mint-50")}>
                  {sheet.dayTotals[day] ? mealText(sheet.dayTotals[day]) : "–"}
                </span>
              ))}
              <span role="cell" className="flex items-center justify-end pr-3 text-body font-bold text-ink">
                {mealText(sheet.total)}
              </span>
              <span role="cell" className="flex items-center justify-end pr-4 text-small font-bold text-ink">
                {formatCurrency(Number(data.settlement.mealExpense), data.currency)}
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
        <span>{t("Click a cell to change that day · cost = meals × {rate}", { rate: formatCurrency(rate, data.currency) })}</span>
      </div>
    </div>
  );
}
