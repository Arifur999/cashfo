// The Zakat page's wording and small sums, kept pure so they are tested on
// their own. Strings are English dictionary keys; the page translates them.
import { formatDay } from "@/lib/date";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import type { Translate } from "@/lib/i18n/message";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import type { ZakatCheckStep, ZakatLine, ZakatMetal, ZakatStepId, ZakatSummary } from "./zakatTypes";

export const ZAKAT_CHECK_STEPS: ZakatCheckStep[] = ["CASH", "SAVINGS", "GOLD", "INVESTMENTS", "OWED_TO_YOU", "YOU_OWE"];

// Where a step's figure comes from: a step adds, takes off, or isn't counted.
export type StepKind = "plus" | "minus" | "skip";

export interface StepMeta {
  title: string;
  question: string;
  // The note at the top of the open step; "" for none.
  tip: string;
  kind: StepKind;
  // "From Balance › Accounts ›": the page the lines come from.
  from: string;
  href: string;
  // "Add …" under the lines; "" where nothing can be added.
  addLabel: string;
  // Names the Add popup offers as one tap.
  suggestions: string[];
}

export const STEP_META: Record<ZakatStepId, StepMeta> = {
  CASH: {
    title: "Cash and bank",
    question: "Is this all the cash and bank money you have today?",
    tip: "Cash kept at home or with family counts too. Add it if it is not in your wallets.",
    kind: "plus",
    from: "From Balance › Accounts",
    href: "/balance/accounts",
    addLabel: "Add cash or an account not in the app",
    suggestions: ["Cash at home", "Nagad wallet", "Foreign currency"],
  },
  SAVINGS: {
    title: "Savings",
    question: "Are these your savings balances today?",
    tip: "",
    kind: "plus",
    from: "From Savings accounts",
    href: "/savings-goals/wallet",
    addLabel: "Add savings not in the app",
    suggestions: ["Provident fund", "Another DPS"],
  },
  GOLD: {
    title: "Gold and silver",
    question: "Is this all your gold and silver?",
    tip: "Jewellery you or your family wear counts too, at today's price. Add pieces that are not in Assets.",
    kind: "plus",
    from: "From Assets (Jewellery)",
    href: "/assets-management/current",
    addLabel: "Add gold or silver",
    suggestions: ["Wedding bangles", "Gold ring", "Silver set"],
  },
  INVESTMENTS: {
    title: "Investments",
    question: "Any other investments, like shares?",
    tip: "",
    kind: "plus",
    from: "From Assets",
    href: "/assets-management/current",
    addLabel: "Add an investment",
    suggestions: ["Shares", "Business stock", "Mutual fund"],
  },
  OWED_TO_YOU: {
    title: "Money owed to you",
    question: "Will these people pay you back?",
    tip: "Count only money you expect to get back. Turn the rest off. You give zakat on it once it comes back.",
    kind: "plus",
    from: "From Loan Management (pawna)",
    href: "/loan-management/bank-person-list",
    addLabel: "Add money someone owes you",
    suggestions: ["Salary not paid yet", "Loan to a friend"],
  },
  YOU_OWE: {
    title: "Money you owe",
    question: "Is this what you have to pay back?",
    tip: 'For a long loan, like a house loan, only the next 12 months of payments are taken off. Switch to "Full amount" if your scholar says so.',
    kind: "minus",
    from: "From Loan Management (dena)",
    href: "/loan-management/bank-person-list",
    addLabel: "Add a bill or debt not in the app",
    suggestions: ["Credit card bill", "Unpaid rent"],
  },
  NOT_COUNTED: {
    title: "Not counted",
    question: "Your home, car and things you use have no zakat",
    tip: 'If you bought land or a flat to sell it, it counts. Tap "I bought it to sell".',
    kind: "skip",
    from: "From Assets",
    href: "/assets-management/current",
    addLabel: "",
    suggestions: [],
  },
};

export const METAL_LABEL: Record<ZakatMetal, string> = {
  GOLD_22: "Gold, 22 karat",
  GOLD_21: "Gold, 21 karat",
  GOLD_18: "Gold, 18 karat",
  GOLD_TRADITIONAL: "Gold, traditional",
  SILVER_22: "Silver, 22 karat",
};
export const METALS = Object.keys(METAL_LABEL) as ZakatMetal[];

// Nisab: 52.5 vori of silver, or 7.5 vori of gold (BAJUS's 22 karat).
export const NISAB_SILVER_VORI = 52.5;
export const NISAB_GOLD_VORI = 7.5;
// The prices the backend takes: whole taka per vori, gold from ৳ 1,000 and
// silver from ৳ 100, both up to ৳ 1 crore.
export const PRICE_LIMITS = { gold: 1000, silver: 100, max: 10_000_000 } as const;
// A weight: three decimals, up to 10,000 vori.
export const MAX_VORI = 10_000;
// The backend keeps up to 60 characters of "Given to" and 50 of a name.
export const GIVEN_TO_MAX = 60;
export const EXTRA_NAME_MAX = 50;

// The eight groups who may receive zakat (Qur'an 9:60).
export const WHO_CAN_RECEIVE = ["The poor", "People in need", "People deep in debt", "Stranded travellers", "New Muslims", "In the way of Allah", "Freeing captives", "Zakat collectors"];

export const HOW_STEPS: { title: string; body: string }[] = [
  { title: "We add up what you have", body: "Cash, bank, savings, gold and silver at today's price, and investments. These come from your own pages." },
  { title: "Add money owed to you", body: "Only what you expect to get back." },
  { title: "Take off what you owe", body: "For long loans, only the next 12 months of payments." },
  { title: "Compare with nisab", body: "If what is left is at or above nisab, zakat is due." },
  { title: "Give 2.5%", body: "Give it by your zakat date, at once or in parts. Record each time so you see what is left." },
];

const num = (value: string | number | null | undefined) => Number(value ?? 0) || 0;

// A weight as typed: digits and one point, three decimals at most, in
// English digits whatever was typed.
export function cleanVori(raw: string): string {
  const english = raw.replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6));
  const [whole, ...rest] = english.replace(/[^0-9.]/g, "").split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 3)}` : whole;
}

// A typed weight in vori, or null when it isn't one the backend takes.
export function parseVori(text: string): number | null {
  const value = Number(text);
  if (!text || !Number.isFinite(value) || value < 0.001 || value > MAX_VORI) return null;
  return Math.round(value * 1000) / 1000;
}

// A price per vori as typed: whole taka only, in English digits.
export const cleanPrice = (raw: string): string =>
  raw
    .replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6))
    .replace(/[^0-9]/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 8);

// The settings' prices are fine to save: gold and silver above the floors
// that catch a slip (a missing digit), under ৳ 1 crore.
export function pricesOk(gold: number, silver: number): boolean {
  return gold >= PRICE_LIMITS.gold && gold <= PRICE_LIMITS.max && silver >= PRICE_LIMITS.silver && silver <= PRICE_LIMITS.max;
}

// The 22 karat prices scaled to the other karats, as the backend does.
const BAJUS_KARATS: Record<ZakatMetal, number> = { GOLD_22: 217592, GOLD_21: 207794, GOLD_18: 178459, GOLD_TRADITIONAL: 145800, SILVER_22: 0 };
export function pricePerVori(metal: ZakatMetal, gold22: number, silver22: number): number {
  if (metal === "SILVER_22") return silver22;
  return metal === "GOLD_22" ? gold22 : Math.round((BAJUS_KARATS[metal] * gold22) / BAJUS_KARATS.GOLD_22);
}

// What a weight is worth at a price, to the paisa as the backend values it.
export const metalValue = (weightVori: number, price: number): number => Math.round(weightVori * price * 100) / 100;

export const nisabFor = (basis: "SILVER" | "GOLD", gold22: number, silver22: number): number =>
  basis === "SILVER" ? Math.round(NISAB_SILVER_VORI * silver22 * 100) / 100 : Math.round(NISAB_GOLD_VORI * gold22 * 100) / 100;

// How many of the six steps are checked.
export const checkedCount = (summary: ZakatSummary): number => summary.steps.filter((step) => step.step !== "NOT_COUNTED" && step.checked).length;

// The step to open after `done` is checked: the next one not checked yet,
// looking on from it and then from the top; null when all are.
export function nextUnchecked(summary: ZakatSummary, done: ZakatStepId | null): ZakatCheckStep | null {
  const open = new Set(summary.steps.filter((step) => step.step !== "NOT_COUNTED" && !step.checked && step.step !== done).map((step) => step.step));
  const from = done ? ZAKAT_CHECK_STEPS.indexOf(done as ZakatCheckStep) + 1 : 0;
  return [...ZAKAT_CHECK_STEPS.slice(from), ...ZAKAT_CHECK_STEPS.slice(0, from)].find((step) => open.has(step)) ?? null;
}

// The amount chips in Record zakat given: everything left, this month's
// part (when it is given in parts), half. Equal amounts show once.
export function quickAmounts(left: number, parts: number, perPart: number): { amount: number; label: string }[] {
  const chips = [
    { amount: left, label: "All left" },
    { amount: parts > 1 ? Math.min(perPart, left) : 0, label: "This month's part" },
    { amount: Math.round(left / 2), label: "Half" },
  ];
  const seen = new Set<number>();
  return chips.filter((chip) => chip.amount > 0 && !seen.has(chip.amount) && seen.add(chip.amount));
}

const DAY_MS = 86_400_000;
const shiftDay = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

// The earliest day zakat given can carry: a zakat year is at most a solar
// year before its due date (the backend refuses earlier ones).
export const earliestGivenOn = (dueDate: string): string => shiftDay(dueDate, -366);

// "1 Ramadan 1448", the due day's Hijri name; "" for a custom date.
export function hijriName(mode: "RAMADAN" | "MUHARRAM" | "CUSTOM", hijriYear: number | null, t: Translate, locale: FormatLocale): string {
  if (mode === "CUSTOM" || !hijriYear) return "";
  return t(mode === "RAMADAN" ? "1 Ramadan {year}" : "1 Muharram {year}", { year: toLocaleDigits(String(hijriYear), locale) });
}

// The line under "Give it by": where the date comes from, and the monthly
// parts when there is more than one month left to give in.
export function partsLine(summary: ZakatSummary, money: (value: number | string) => string, t: Translate, locale: FormatLocale): string {
  const mode = summary.settings.dateMode;
  const head = mode === "CUSTOM" ? t("Your own date.") : t("About {day}.", { day: hijriName(mode, summary.hijriYear, t, locale) });
  const left = num(summary.totals.left);
  if (!left || summary.totals.parts < 2) return head;
  return `${head} ${t("Or give about {amount} a month, {count} times.", { amount: money(summary.totals.perPart), count: formatCount(summary.totals.parts, locale) })}`;
}

const SUBTYPE_NOTE: Record<string, string> = { cash: "Cash in hand", bank: "Bank account", mfs: "Mobile banking", savings: "Savings account" };

// The muted line under a line's name.
export function lineNote(line: ZakatLine, step: ZakatStepId, perVori: Record<ZakatMetal, number>, money: (value: number | string) => string, t: Translate, locale: FormatLocale): string {
  if (step === "NOT_COUNTED") return line.detail ? t(line.detail) : "";
  if (!line.counted && line.source !== "EXTRA") return t("Not counted");
  if (line.source === "EXTRA") {
    if (line.metal && line.weightVori) return t("{weight} vori · {metal}", { weight: toLocaleDigits(line.weightVori, locale), metal: t(METAL_LABEL[line.metal]) });
    return t("You added this");
  }
  if (line.source === "ACCOUNT") {
    if (line.detail?.startsWith("••••")) return t("Account {number}", { number: line.detail });
    return t(SUBTYPE_NOTE[line.detail ?? ""] ?? "Wallet");
  }
  if (line.source === "ASSET") {
    if (line.forSale) return t("Bought to sell · value today");
    if (step === "GOLD") {
      if (line.byWeight && line.metal && line.weightVori)
        return t("{weight} vori × {price} (today's price)", { weight: toLocaleDigits(line.weightVori, locale), price: money(perVori[line.metal]) });
      return t("Value in Assets. Add its weight for today's price.");
    }
    return t("Value in Assets");
  }
  // A contact.
  if (step === "YOU_OWE") {
    if (line.fullAmount === line.yearAmount) return t("Due within the year");
    return line.debtMode === "FULL" ? t("Whole loan left: {amount}", { amount: money(line.fullAmount ?? 0) }) : t("Due in the next 12 months, of {amount}", { amount: money(line.fullAmount ?? 0) });
  }
  return line.detail === "BUSINESS" ? t("Customer or supplier") : t("Loan you gave");
}

// "2 Nov 2026 · Cash · Expense" under a zakat given.
export function paymentMeta(paidOn: string, wallet: string, t: Translate, locale: FormatLocale): string {
  return [formatDay(paidOn, "d MMM yyyy", locale), wallet, t("Expense")].filter(Boolean).join(" · ");
}

