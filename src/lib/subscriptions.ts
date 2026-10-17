import type { ICoupon } from "@/types/coupon.types";
import type { BillingCycle, ISubscriptionPlan } from "@/types/plan.types";
import { formatCurrency } from "./currency";
import { formatDate } from "./date";
import { formatNumber } from "./number";

// The accent each plan is drawn in: the bar on its card, its slice of the
// chart. Anything unnamed (Free) is the muted grey.
const PLAN_ACCENT: Record<string, string> = {
  "Monthly Pro": "bg-emerald",
  "Yearly Pro": "bg-forest",
  Business: "bg-warning-fill",
};

export const planAccentClass = (name: string) => PLAN_ACCENT[name] ?? "bg-ink-muted";

// "a month" / "a year" after a price; nothing for the free plan.
export const billingPeriod = (cycle: BillingCycle) => ({ FREE: "", MONTHLY: "a month", YEARLY: "a year" })[cycle];

// A whole-taka price, or the paisa when there are any: "৳ 299", "৳ 12.50".
export const money = (amount: number | string, currency?: string) =>
  formatCurrency(amount, currency, Number.isInteger(Number(amount)) ? 0 : 2);

// "No trial needed", "7-day free trial", or for a yearly plan
// "14-day free trial · about ৳ 250 a month".
export const trialLine = (plan: Pick<ISubscriptionPlan, "billingCycle" | "trialDays" | "price" | "currency">) => {
  if (plan.billingCycle === "FREE") return "No trial needed";
  const trial = plan.trialDays > 0 ? `${plan.trialDays}-day free trial` : "No free trial";
  return plan.billingCycle === "YEARLY" ? `${trial} · about ${formatCurrency(Number(plan.price) / 12, plan.currency, 0)} a month` : trial;
};

// "6 of them are on a trial now", "Everyone starts here", "No trials running".
export const trialsLine = (cycle: BillingCycle, trialing: number) => {
  if (trialing > 0) return `${formatNumber(trialing)} of them ${trialing === 1 ? "is" : "are"} on a trial now`;
  return cycle === "FREE" ? "Everyone starts here" : "No trials running";
};

// The number a limit shows; -1 is no limit.
export const limitText = (value: number) => (value === -1 ? "No limit" : formatNumber(value));

// "All plans", "Yearly Pro only", "Monthly Pro and Yearly Pro",
// "Free, Monthly Pro and Business".
export const worksOn = (planIds: string[], names: Map<string, string>) => {
  if (planIds.length === 0) return "All plans";
  const labels = planIds.map((id) => names.get(id) ?? "Unknown plan");
  if (labels.length === 1) return `${labels[0]} only`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
};

// "20% off", "৳ 100 off".
export const discountText = (coupon: Pick<ICoupon, "discountType" | "discountValue">) =>
  coupon.discountType === "PERCENTAGE" ? `${Number(coupon.discountValue)}% off` : `${money(coupon.discountValue)} off`;

// What a price comes to with the coupon, never below zero.
export const discountedPrice = (price: number, coupon: Pick<ICoupon, "discountType" | "discountValue">) => {
  const value = Number(coupon.discountValue);
  const discounted = coupon.discountType === "PERCENTAGE" ? price * (1 - value / 100) : price - value;
  return Math.max(0, Math.round(discounted * 100) / 100);
};

// "4 Sep – 31 Dec 2026", "1 – 15 Jan 2026", "20 Dec 2025 – 5 Jan 2026".
export const validityText = (from: string, until: string) => {
  const sameYear = formatDate(from, "yyyy") === formatDate(until, "yyyy");
  const sameMonth = sameYear && formatDate(from, "MM") === formatDate(until, "MM");
  const start = sameMonth ? formatDate(from, "d") : sameYear ? formatDate(from, "d MMM") : formatDate(from, "d MMM yyyy");
  return `${start} – ${formatDate(until, "d MMM yyyy")}`;
};

// "of 500" beside the number of uses, or "no limit".
export const usesCap = (maxRedemptions: number | null) => (maxRedemptions === null ? "no limit" : `of ${formatNumber(maxRedemptions)}`);

// How a coupon's status reads in a list.
export const COUPON_STATUS_LABEL: Record<ICoupon["status"], string> = {
  ACTIVE: "Active",
  SCHEDULED: "Scheduled",
  EXPIRED: "Ended",
  USED_UP: "Used up",
  DISABLED: "Off",
};

// "WELCOME20 and PRO100", "EID50, PUJA15 and 3 more".
export const codesLine = (codes: string[]) => {
  if (codes.length === 0) return "None live right now";
  if (codes.length <= 2) return codes.join(" and ");
  return `${codes[0]}, ${codes[1]} and ${codes.length - 2} more`;
};

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

// A code for the "Make one up" link: four letters and two digits, like
// "PUJA15". `random` is injectable so a test can pin the result.
export const randomCouponCode = (random: () => number = Math.random) => {
  let code = "";
  for (let i = 0; i < 4; i++) code += LETTERS[Math.floor(random() * LETTERS.length)];
  return `${code}${10 + Math.floor(random() * 90)}`;
};
