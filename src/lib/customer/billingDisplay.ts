// The customer's plan, in the shapes /api/billing answers, and the pure
// helpers the Plans page (Settings › Plans, design-v4 UpgradePlan) builds
// its cards, its comparison and its usage strip from.

export type BillingCycle = "FREE" | "MONTHLY" | "YEARLY";
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
export type Gateway = "BKASH" | "NAGAD" | "CARD";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

export interface FeatureLimits {
  maxWorkspaces?: number;
  maxBusinessWorkspaces?: number;
  // -1: no limit.
  maxTransactionsPerMonth?: number;
  advancedReports?: boolean;
  pdfExport?: boolean;
  multiUser?: boolean;
  incomeGoalTracking?: boolean;
}

export interface BillingPlan {
  id: string;
  name: string;
  slug: string;
  billingCycle: BillingCycle;
  // "299.00"
  price: string;
  currency: string;
  trialDays: number;
  featureLimits: FeatureLimits;
  displayOrder: number;
}

export interface BillingPlans {
  plans: BillingPlan[];
  currentPlanId: string | null;
  trialAvailable: boolean;
  // A payment gateway is set up, so paying online works (else only sending
  // the money yourself does).
  onlineCheckout?: boolean;
}

export interface Subscription {
  planId: string;
  planName: string;
  planSlug: string;
  billingCycle: BillingCycle;
  price: string;
  lockedPrice: string | null;
  status: SubscriptionStatus;
  isPaid: boolean;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface BillingUsage {
  transactionsThisMonth: number;
  // -1: no limit.
  transactionLimit: number;
  transactionsLeft: number | null;
  // yyyy-MM-01
  resetsOn: string;
  workspaces: number;
  workspaceLimit: number;
  pdfExport: boolean;
}

export interface PendingPayment {
  id: string;
  displayId: string;
  planId: string;
  planName: string;
  amount: string;
  gateway: Gateway;
  instructions: { en: string; bn: string };
  expiresAt: string;
  createdAt: string;
  // When the customer sent the money's details (the TrxID); null while
  // they still have to.
  submittedAt?: string | null;
  // The TrxID they typed.
  reference?: string | null;
}

export interface BillingOverview {
  subscription: Subscription;
  usage: BillingUsage;
  pendingPayment: PendingPayment | null;
  referralDiscount: { percent: number } | null;
  trialAvailable: boolean;
}

export interface CouponPreview {
  valid: boolean;
  reason?: string;
  message?: string;
  listPrice: string;
  discount: string;
  finalAmount: string;
  discountSource: "COUPON" | "REFERRAL" | null;
  couponDiscount: string;
  referralDiscount: string;
}

export interface CheckoutResult {
  paymentId: string;
  displayId: string;
  planId: string;
  planName: string;
  listPrice: string;
  amount: string;
  discount: string;
  discountSource: "COUPON" | "REFERRAL" | null;
  currency: string;
  gateway: Gateway;
  expiresAt: string;
  next: { kind: "instructions"; text: { en: string; bn: string } };
}

export interface BillingPayment {
  id: string;
  displayId: string;
  planId: string;
  planName: string;
  purpose: "NEW" | "RENEWAL" | "UPGRADE";
  listPrice: string | null;
  amount: string;
  discount: string | null;
  currency: string;
  gateway: string;
  status: PaymentStatus;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  expiresAt: string | null;
  invoice: { id: string; invoiceNumber: string } | null;
  refund: { amount: string; status: string; createdAt: string } | null;
}

export interface BillingPayments {
  data: BillingPayment[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ---- Families: Monthly Pro and Yearly Pro are one "Pro" card ----

export interface PlanFamily {
  // "Pro", "Business", "Free" (the name without its cycle).
  name: string;
  free: boolean;
  monthly: BillingPlan | null;
  yearly: BillingPlan | null;
}

// "Monthly Pro" / "Yearly Pro" -> "Pro"; any other name stays.
export const familyName = (name: string): string => name.replace(/^(monthly|yearly|annual)\s+/i, "").trim() || name;

// The plans grouped by family, in the admin's display order.
export function planFamilies(plans: BillingPlan[]): PlanFamily[] {
  const families: PlanFamily[] = [];
  for (const plan of [...plans].sort((a, b) => a.displayOrder - b.displayOrder)) {
    const name = familyName(plan.name);
    let family = families.find((f) => f.name.toLowerCase() === name.toLowerCase());
    if (!family) {
      family = { name, free: plan.billingCycle === "FREE", monthly: null, yearly: null };
      families.push(family);
    }
    if (plan.billingCycle === "YEARLY") family.yearly ??= plan;
    else family.monthly ??= plan;
  }
  return families;
}

// The plan a family's card shows for the chosen period: its own for that
// period, or the only one it has (Business is monthly only).
export const familyPlan = (family: PlanFamily, yearly: boolean): BillingPlan | null => (yearly ? (family.yearly ?? family.monthly) : (family.monthly ?? family.yearly));

// "Save ৳ 589": twelve months against one year, for the family that has
// both; 0 when none does.
export function yearlySaving(families: PlanFamily[]): number {
  for (const family of families) {
    if (family.monthly && family.yearly && family.monthly.billingCycle === "MONTHLY") {
      const saving = Number(family.monthly.price) * 12 - Number(family.yearly.price);
      if (saving > 0) return Math.round(saving);
    }
  }
  return 0;
}

// The card the design lifts onto the forest ground: the first paid family
// that has a yearly plan, else the first paid one.
export function heroFamily(families: PlanFamily[]): PlanFamily | null {
  const paid = families.filter((family) => !family.free);
  return paid.find((family) => family.yearly) ?? paid[0] ?? null;
}

// ---- What each plan includes (the cards' lists and Compare plans) ----

export type FeatureValue = { kind: "count"; value: number } | { kind: "unlimited" } | { kind: "yes" } | { kind: "no" };

export const FEATURE_ROWS: { key: keyof FeatureLimits; label: string }[] = [
  { key: "maxWorkspaces", label: "Workspaces" },
  { key: "maxBusinessWorkspaces", label: "Business workspaces" },
  { key: "maxTransactionsPerMonth", label: "Transactions a month" },
  { key: "advancedReports", label: "Advanced reports" },
  { key: "pdfExport", label: "PDF export" },
  { key: "incomeGoalTracking", label: "Income goals" },
  { key: "multiUser", label: "More than one user" },
];

export function featureValue(limits: FeatureLimits, key: keyof FeatureLimits): FeatureValue {
  const value = limits[key];
  if (typeof value === "boolean") return value ? { kind: "yes" } : { kind: "no" };
  if (typeof value !== "number") return { kind: "no" };
  if (value < 0) return { kind: "unlimited" };
  return { kind: "count", value };
}

// A feature the plan doesn't have: a "no", or a count of nothing.
export const featureMissing = (value: FeatureValue): boolean => value.kind === "no" || (value.kind === "count" && value.value === 0);

// ---- The Plans page's cards (UpgradePlan board) ----

// The paid plans, each a card of its own, in the admin's order.
export const paidPlans = (plans: BillingPlan[]): BillingPlan[] => plans.filter((plan) => plan.billingCycle !== "FREE").sort((a, b) => a.displayOrder - b.displayOrder);

// The free trial the first card offers: the longest a paid plan gives (the
// first such plan on a tie), or null when no plan gives one.
export function trialOffer(plans: BillingPlan[]): BillingPlan | null {
  let best: BillingPlan | null = null;
  for (const plan of paidPlans(plans)) {
    if (plan.trialDays > 0 && (!best || plan.trialDays > best.trialDays)) best = plan;
  }
  return best;
}

// A yearly plan against twelve months of its family's monthly plan: the
// percent saved, its price a month, and what the twelve months would cost
// ("20% off · about ৳ 159 a month", "Instead of ৳ 2,388"). null with no
// monthly plan to compare with, or nothing saved.
export function yearlyDeal(yearly: BillingPlan, plans: BillingPlan[]): { percentOff: number; perMonth: number; twelveMonths: number } | null {
  if (yearly.billingCycle !== "YEARLY") return null;
  const family = familyName(yearly.name).toLowerCase();
  const monthly = plans.find((plan) => plan.billingCycle === "MONTHLY" && familyName(plan.name).toLowerCase() === family);
  if (!monthly) return null;
  const twelveMonths = Number(monthly.price) * 12;
  const price = Number(yearly.price);
  if (!(twelveMonths > price)) return null;
  return { percentOff: Math.round(((twelveMonths - price) / twelveMonths) * 100), perMonth: Math.round(price / 12), twelveMonths };
}

// The least a paid plan costs a month (a yearly one over its twelve
// months): Free or Pro's "from ৳ 159 a month". null with no paid plan.
export function lowestMonthly(plans: BillingPlan[]): number | null {
  const months = paidPlans(plans).map((plan) => Number(plan.price) / (plan.billingCycle === "YEARLY" ? 12 : 1));
  return months.length > 0 ? Math.round(Math.min(...months)) : null;
}

// ---- The usage strip ----

// The bar's colour: calm, then amber from 80%, red at the limit.
export function usageTone(used: number, limit: number): "ok" | "near" | "over" {
  if (limit < 0) return "ok";
  if (used >= limit) return "over";
  return limit > 0 && used / limit >= 0.8 ? "near" : "ok";
}

export const usagePercent = (used: number, limit: number): number => (limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100)));

// ---- Where the subscription stands ----

export type PlanState = "free" | "trial" | "active" | "cancelling" | "pastDue" | "ended";

export function planState(subscription: Subscription): PlanState {
  if (subscription.billingCycle === "FREE") return "free";
  switch (subscription.status) {
    case "TRIALING":
      return "trial";
    case "PAST_DUE":
      return "pastDue";
    case "ACTIVE":
      return subscription.cancelAtPeriodEnd ? "cancelling" : "active";
    default:
      return "ended";
  }
}

// The sidebar's plan chip and card (AppSidebar board): no name means "Free
// plan" and the Upgrade card; a trial says "Free trial" and when it ends;
// otherwise the plan's name. A plan that ended counts as free again.
export interface SidebarPlan {
  name: string | null;
  trial: boolean;
  // When the trial ends; null outside one.
  trialEndsAt: string | null;
  // A payment waits for an admin to confirm it ("Payment being checked").
  pending: boolean;
}

export function sidebarPlan(subscription: Subscription, pendingPayment: PendingPayment | null = null): SidebarPlan {
  const state = planState(subscription);
  const pending = pendingPayment !== null;
  if (state === "free" || state === "ended") return { name: null, trial: false, trialEndsAt: null, pending };
  const trial = state === "trial";
  return { name: subscription.planName, trial, trialEndsAt: trial ? subscription.trialEndsAt : null, pending };
}

// Whole days left until `endsAt` (a trial's end), never below 0: a trial
// ending later today has 1 left.
export const daysLeft = (endsAt: string, now = new Date()): number => Math.max(0, Math.ceil((new Date(endsAt).getTime() - now.getTime()) / 86_400_000));

// A paid plan with an end date can be stopped at its end (or the stop undone).
export const canCancel = (subscription: Subscription): boolean => subscription.isPaid && Boolean(subscription.currentPeriodEnd);

export const GATEWAYS: { value: Gateway; label: string }[] = [
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "CARD", label: "Card · SSLCommerz" },
];

export const gatewayLabel = (gateway: string): string => GATEWAYS.find((g) => g.value === gateway)?.label ?? gateway;

// A payment's chip: its words (dictionary keys) and tone.
export function paymentStatusView(status: PaymentStatus): { label: string; tone: "income" | "warning" | "expense" | "neutral" } {
  switch (status) {
    case "SUCCESS":
      return { label: "Paid", tone: "income" };
    case "PENDING":
      return { label: "Waiting for payment", tone: "warning" };
    case "REFUNDED":
      return { label: "Refunded", tone: "neutral" };
    default:
      return { label: "Not paid", tone: "expense" };
  }
}

// The coupon refusals, in the app's words (dictionary keys).
export function couponProblem(reason: string | undefined): string {
  switch (reason) {
    case "NOT_FOUND":
      return "We couldn't find that coupon. Check the spelling.";
    case "NOT_STARTED":
      return "That coupon isn't active yet.";
    case "EXPIRED":
      return "That coupon has expired.";
    case "USED_UP":
      return "That coupon has been used up.";
    case "NOT_FOR_PLAN":
      return "That coupon doesn't work for this plan.";
    case "ALREADY_USED":
      return "You have used that coupon already.";
    default:
      return "That coupon can't be used.";
  }
}
