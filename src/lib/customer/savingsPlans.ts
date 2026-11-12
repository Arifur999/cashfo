import type { SavingsPlan, SavingsPlanHorizon, SavingsPlanPriority } from "./api";

// Saving plans (Savings Goals › Saving plans board): the kinds of thing a
// plan is for, how important it is and when it is needed, as the board
// names them. The API works out the day it is needed by and the monthly
// amount (backend savings-plans/plan-math.ts); this side mirrors that
// arithmetic for the form's live summary before anything is saved.

// [key, emoji, chip label]: the form's chips, and the plan card's tile.
export const PLAN_CATEGORIES = [
  { key: "trip", emoji: "✈️", label: "Trip & tour", name: "Family trip" },
  { key: "phone", emoji: "📱", label: "Phone", name: "New phone" },
  { key: "umrah", emoji: "🕋", label: "Umrah", name: "Umrah trip" },
  { key: "education", emoji: "🎓", label: "Education", name: "Education fund" },
  { key: "wedding", emoji: "💍", label: "Wedding", name: "Wedding" },
  { key: "others", emoji: "✨", label: "Others", name: "" },
] as const;

export function planEmoji(category: string): string {
  return PLAN_CATEGORIES.find((item) => item.key === category)?.emoji ?? "✨";
}

// The board's priority chips: High red, Medium amber, Low grey; sorting
// puts High first.
export const PRIORITY_META: Record<SavingsPlanPriority, { label: string; chip: string; dot: string; rank: number }> = {
  HIGH: { label: "High", chip: "bg-expense-soft text-loss-ink", dot: "bg-expense-fill", rank: 3 },
  MEDIUM: { label: "Medium", chip: "bg-warning-soft text-due-ink", dot: "bg-warning-fill", rank: 2 },
  LOW: { label: "Low", chip: "bg-head-rule text-ink-soft", dot: "bg-ink-faint", rank: 1 },
};
export const PRIORITIES: SavingsPlanPriority[] = ["HIGH", "MEDIUM", "LOW"];

// The form's "When do you need it?" choices, in the board's order.
export const HORIZONS: { value: SavingsPlanHorizon; label: string; months: number }[] = [
  { value: "THREE_MONTHS", label: "3 months", months: 3 },
  { value: "SIX_MONTHS", label: "6 months", months: 6 },
  { value: "ONE_YEAR", label: "1 year", months: 12 },
  { value: "TWO_YEARS", label: "2 years", months: 24 },
  { value: "BY_DATE", label: "Pick a date", months: 0 },
  { value: "SOMEDAY", label: "Someday", months: 0 },
];

const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const pad = (n: number) => String(n).padStart(2, "0");

export function addMonths(iso: string, months: number): string {
  const y = +iso.slice(0, 4);
  const m = +iso.slice(5, 7) - 1 + months;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const date = new Date(Date.UTC(y, m, Math.min(+iso.slice(8, 10), last)));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

// Months from today to the day it is needed by (at least one); 0 without a date.
export function planMonths(horizon: SavingsPlanHorizon, needBy: string | null, today: string): number {
  const fixed = HORIZONS.find((item) => item.value === horizon)?.months ?? 0;
  if (fixed) return fixed;
  if (horizon !== "BY_DATE" || !needBy) return 0;
  return Math.max(1, Math.ceil((day(needBy) - day(today)) / 86_400_000 / 30.44));
}

// The day it is needed by, counted from today.
export function planNeedBy(horizon: SavingsPlanHorizon, needBy: string | null, today: string): string | null {
  const fixed = HORIZONS.find((item) => item.value === horizon)?.months ?? 0;
  if (fixed) return addMonths(today, fixed);
  return horizon === "BY_DATE" ? needBy : null;
}

// Starting it today, a month, rounded up to the next 10 taka; 0 without a date.
export function planMonthly(amount: number, horizon: SavingsPlanHorizon, needBy: string | null, today: string): number {
  const months = planMonths(horizon, needBy, today);
  return months && amount > 0 ? Math.ceil(amount / months / 10) * 10 : 0;
}

// "Within 3 months", "In about 31 months", "Someday": the plan's Need it line.
export function planWhen(plan: Pick<SavingsPlan, "horizon" | "needBy">, today: string): { key: string; count?: number } {
  if (plan.horizon === "SOMEDAY") return { key: "Someday" };
  if (plan.horizon === "BY_DATE") {
    const months = planMonths(plan.horizon, plan.needBy, today);
    return { key: months === 1 ? "In about {count} month" : "In about {count} months", count: months };
  }
  return { key: `Within ${HORIZONS.find((item) => item.value === plan.horizon)?.label ?? ""}` };
}

export type PlanSort = "PRIORITY" | "NEED_BY" | "AMOUNT";

// Coming up (dated plans) in the order picked, then Someday by priority.
export function sortPlans(plans: SavingsPlan[], sort: PlanSort): { dated: SavingsPlan[]; someday: SavingsPlan[] } {
  const by = (plan: SavingsPlan) => plan.neededBy ?? "9999-12-31";
  const compare = {
    PRIORITY: (a: SavingsPlan, b: SavingsPlan) => PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank || (by(a) < by(b) ? -1 : by(a) > by(b) ? 1 : 0),
    NEED_BY: (a: SavingsPlan, b: SavingsPlan) => (by(a) < by(b) ? -1 : by(a) > by(b) ? 1 : 0),
    AMOUNT: (a: SavingsPlan, b: SavingsPlan) => Number(b.amount) - Number(a.amount),
  }[sort];
  return {
    dated: plans.filter((plan) => plan.horizon !== "SOMEDAY").sort(compare),
    someday: plans.filter((plan) => plan.horizon === "SOMEDAY").sort((a, b) => PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank),
  };
}

// The KPI row: how many, how many are High, what they all cost and what
// starting the dated ones today would take a month.
export function plansSummary(plans: SavingsPlan[]): { count: number; high: number; total: number; monthly: number } {
  return {
    count: plans.length,
    high: plans.filter((plan) => plan.priority === "HIGH").length,
    total: plans.reduce((sum, plan) => sum + Number(plan.amount), 0),
    monthly: plans.reduce((sum, plan) => sum + Number(plan.monthly), 0),
  };
}

// A link as the card shows it: no scheme, at most 40 characters.
export function shortLink(link: string): string {
  return link.replace(/^https?:\/\//, "").slice(0, 40);
}

// A link as it opens: with a scheme.
export function linkHref(link: string): string {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}
