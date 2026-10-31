import type { SavingsGoal, SavingsGoalEntry, SavingsHolding } from "./api";

// The Savings goals page's numbers (design: SavingsDashboard), worked out
// from a goal and today ('YYYY-MM-DD', Dhaka). The plan line's pace itself
// comes from the API (goal.pace); this is everything said around it.

const dayNumber = (day: string): number => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)) || 1) / 86_400_000;

// Whole days from one day to another (negative when `to` is earlier).
export function daysBetween(from: string, to: string): number {
  return dayNumber(to.slice(0, 10)) - dayNumber(from.slice(0, 10));
}

// Months still to go to the end date, 30.44 days each, at least one.
export function monthsToGo(end: string, today: string): number {
  return Math.max(1, Math.ceil(daysBetween(today, end) / 30.44));
}

const num = (value: string | number) => Number(value) || 0;
const saved = (goal: Pick<SavingsGoal, "currentAmount">) => num(goal.currentAmount);
const left = (goal: Pick<SavingsGoal, "targetAmount" | "currentAmount">) => Math.max(0, num(goal.targetAmount) - saved(goal));

// What finishing on time takes each month from now.
export function monthlyFromNow(goal: Pick<SavingsGoal, "targetAmount" | "currentAmount" | "targetDate">, today: string): number {
  return Math.ceil(left(goal) / monthsToGo(goal.targetDate, today));
}

// What this month asks for: what was left when the month began, over the
// months still to go. Money added this month doesn't shrink it.
export function dueThisMonth(goal: Pick<SavingsGoal, "targetAmount" | "currentAmount" | "targetDate" | "addedThisMonth">, today: string): number {
  const atMonthStart = saved(goal) - num(goal.addedThisMonth);
  return Math.max(0, Math.ceil((num(goal.targetAmount) - atMonthStart) / monthsToGo(goal.targetDate, today)));
}

export type MonthState = "done" | "part" | "none";

// The month line on an active card: done (added at least what was due),
// part of it, or nothing yet.
export function monthProgress(goal: Pick<SavingsGoal, "targetAmount" | "currentAmount" | "targetDate" | "addedThisMonth">, today: string): { state: MonthState; got: number; due: number; percent: number } {
  const got = num(goal.addedThisMonth);
  const due = dueThisMonth(goal, today);
  if (got > 0 && got >= due) return { state: "done", got, due, percent: 100 };
  if (got > 0) return { state: "part", got, due, percent: due > 0 ? Math.round((got / due) * 100) : 100 };
  return { state: "none", got, due, percent: 0 };
}

// How much of the goal's time has gone, 0 to 1.
export function timeFraction(goal: Pick<SavingsGoal, "startDate" | "targetDate">, today: string): number {
  return Math.min(1, Math.max(0, daysBetween(goal.startDate, today) / Math.max(1, daysBetween(goal.startDate, goal.targetDate))));
}

// Whole months since the goal began, rounded.
export function monthsSinceStart(goal: Pick<SavingsGoal, "startDate">, today: string): number {
  return Math.round(Math.max(0, daysBetween(goal.startDate, today)) / 30.44);
}

// What has been saved a month on average since the goal began (not
// counting what it started with), once a month has gone by.
export function monthlyAverage(goal: Pick<SavingsGoal, "startDate" | "currentAmount" | "startAmount">, today: string): number {
  const months = Math.max(0, daysBetween(goal.startDate, today)) / 30.44;
  return months >= 1 ? Math.max(0, Math.round((saved(goal) - num(goal.startAmount)) / months)) : 0;
}

// The status a goal shows: its pace while active, Achieved for a goal
// withdrawn after reaching its target, else its status.
export type GoalLook = "AHEAD" | "ON_TRACK" | "BEHIND" | "PAUSED" | "COMPLETED" | "WITHDRAWN" | "ACHIEVED";

export function goalLook(goal: Pick<SavingsGoal, "status" | "pace" | "reachedAt">): GoalLook {
  if (goal.status === "ACTIVE") return goal.pace?.state ?? "ON_TRACK";
  if (goal.status === "WITHDRAWN") return goal.reachedAt ? "ACHIEVED" : "WITHDRAWN";
  return goal.status;
}

export const isBehind = (goal: Pick<SavingsGoal, "status" | "pace">) => goal.status === "ACTIVE" && goal.pace?.state === "BEHIND";

// Behind goals first; otherwise the order they came in.
export function behindFirst<T extends Pick<SavingsGoal, "status" | "pace">>(goals: T[]): T[] {
  return goals
    .map((goal, index) => ({ goal, index }))
    .sort((a, b) => Number(isBehind(b.goal)) - Number(isBehind(a.goal)) || a.index - b.index)
    .map(({ goal }) => goal);
}

export interface GoalsHero {
  saved: number;
  target: number;
  toGo: number;
  percent: number;
  // The month's target across active goals, and what all goals got.
  monthTarget: number;
  monthSaved: number;
  monthPercent: number;
  // Active goals that got money this month.
  gotMoney: number;
  active: number;
  behind: number;
}

// The hero over the cards. A withdrawn goal no longer counts toward what is
// saved or still to go.
export function goalsHero(goals: SavingsGoal[], today: string): GoalsHero {
  const live = goals.filter((goal) => goal.status !== "WITHDRAWN");
  const active = goals.filter((goal) => goal.status === "ACTIVE");
  const savedSum = live.reduce((sum, goal) => sum + saved(goal), 0);
  const targetSum = live.reduce((sum, goal) => sum + num(goal.targetAmount), 0);
  const monthTarget = active.reduce((sum, goal) => sum + dueThisMonth(goal, today), 0);
  const monthSaved = goals.reduce((sum, goal) => sum + num(goal.addedThisMonth), 0);
  return {
    saved: savedSum,
    target: targetSum,
    toGo: Math.max(0, targetSum - savedSum),
    percent: targetSum > 0 ? Math.min(100, Math.round((savedSum / targetSum) * 100)) : 0,
    monthTarget,
    monthSaved,
    monthPercent: monthTarget > 0 ? Math.min(100, Math.round((monthSaved / monthTarget) * 100)) : 0,
    gotMoney: active.filter((goal) => num(goal.addedThisMonth) > 0).length,
    active: active.length,
    behind: active.filter(isBehind).length,
  };
}

// The quick amounts in Add money: this month's suggestion (or, once the
// month is covered, next month's), two round figures under what is left,
// and all that's left.
export type AddChip = { kind: "suggested" | "covered" | "round" | "rest"; amount: number };

export function addMoneyChips(goal: Pick<SavingsGoal, "targetAmount" | "currentAmount" | "targetDate" | "addedThisMonth">, today: string): AddChip[] {
  const rest = left(goal);
  const chips: AddChip[] = [];
  const suggested = Math.min(rest, Math.max(0, dueThisMonth(goal, today) - num(goal.addedThisMonth)));
  const next = monthlyFromNow(goal, today);
  if (suggested > 0) chips.push({ kind: "suggested", amount: suggested });
  else if (next > 0) chips.push({ kind: "covered", amount: next });
  for (const round of [5000, 10000]) if (round < rest) chips.push({ kind: "round", amount: round });
  if (rest > 0) chips.push({ kind: "rest", amount: rest });
  return chips;
}

// The last day of the month `months` after today's ('YYYY-MM-DD').
export function monthEndAfter(today: string, months: number): string {
  const end = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 + months + 1, 0));
  return end.toISOString().slice(0, 10);
}

export interface CatchUp {
  // Planned by today, what is saved, and the gap.
  expected: number;
  gap: number;
  // Add the gap now (never more than is left to save).
  addNow: number;
  // Save this a month from now to keep the end date.
  perMonth: number;
  // Or keep the original pace and end later.
  originalPace: number;
  newEnd: string;
  monthsLater: number;
}

// Catch up's three ways back onto the plan.
export function catchUp(goal: Pick<SavingsGoal, "targetAmount" | "currentAmount" | "targetDate" | "startDate" | "startAmount" | "pace">, today: string): CatchUp {
  const expected = num(goal.pace?.expected ?? 0);
  const gap = Math.max(0, -num(goal.pace?.difference ?? 0));
  const rest = left(goal);
  const originalPace = Math.max(1, Math.round((num(goal.targetAmount) - num(goal.startAmount)) / Math.max(1, daysBetween(goal.startDate, goal.targetDate) / 30.44)));
  let newEnd = monthEndAfter(today, Math.max(1, Math.ceil(rest / originalPace)));
  if (newEnd <= goal.targetDate.slice(0, 10)) newEnd = monthEndAfter(today, monthsToGo(goal.targetDate, today) + 1);
  return {
    expected,
    gap,
    addNow: Math.min(gap, rest),
    perMonth: monthlyFromNow(goal, today),
    originalPace,
    newEnd,
    monthsLater: Math.max(1, Math.round(daysBetween(goal.targetDate, newEnd) / 30.44)),
  };
}

// `amount` split over a goal's savings wallets, largest first -- where a
// withdrawal comes out of (the API splits it the same way).
export function splitLargestFirst(holdings: SavingsHolding[], amount: number): { name: string | null; amount: number }[] {
  const parts: { name: string | null; amount: number }[] = [];
  let rest = amount;
  for (const holding of [...holdings].sort((a, b) => num(b.amount) - num(a.amount))) {
    if (rest <= 0) break;
    const take = Math.min(num(holding.amount), rest);
    if (take <= 0) continue;
    parts.push({ name: holding.name, amount: take });
    rest -= take;
  }
  return parts;
}

// The Saved against plan chart (540×150 view box, the plot from x 64 to 530): the plan line from its
// start to the target on the end date, the money saved as steps, and today.
export interface PlanChart {
  planPoints: string;
  savedPoints: string;
  todayX: number;
  now: { x: number; y: number };
}

// Room on the left for the target's label ("৳ 1,50,000").
const LEFT = 64;
const WIDTH = 466;
const BASE = 120;
const HEIGHT = 100;

export function planChart(
  goal: Pick<SavingsGoal, "startDate" | "targetDate" | "targetAmount" | "currentAmount" | "planStartDate" | "planStartAmount">,
  entries: Pick<SavingsGoalEntry, "type" | "amount" | "date">[],
  today: string,
): PlanChart {
  const span = Math.max(1, daysBetween(goal.startDate, goal.targetDate));
  const target = Math.max(1, num(goal.targetAmount));
  const x = (day: string) => Math.round(LEFT + Math.min(1, Math.max(0, daysBetween(goal.startDate, day) / span)) * WIDTH);
  const y = (value: number) => Math.round(BASE - Math.min(1, Math.max(0, value / target)) * HEIGHT);
  const points = [`${x(goal.startDate)},${y(0)}`];
  let total = 0;
  for (const entry of [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
    const day = entry.date.slice(0, 10);
    points.push(`${x(day)},${y(total)}`);
    total += entry.type === "CONTRIBUTION" || entry.type === "TRANSFER_IN" ? num(entry.amount) : -num(entry.amount);
    points.push(`${x(day)},${y(total)}`);
  }
  points.push(`${x(today)},${y(saved(goal))}`);
  return {
    planPoints: `${x(goal.planStartDate)},${y(num(goal.planStartAmount))} ${x(goal.targetDate)},${y(target)}`,
    savedPoints: points.join(" "),
    todayX: x(today),
    now: { x: x(today), y: y(saved(goal)) },
  };
}
