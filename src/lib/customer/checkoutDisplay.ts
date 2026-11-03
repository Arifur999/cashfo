import type { BillingPlan, ManualWallet, PaymentAccounts, Subscription } from "./billingDisplay";

// Settings › Plans › Checkout (Checkout board): the ways to send the money
// yourself, the same checks the API makes on what the customer types, the
// period a payment buys and the receipt's amount in words.

export interface WalletMeta {
  id: ManualWallet;
  // The service's own name, never translated (the tab, "Smartly bKash").
  name: string;
  // The tab's coloured dot.
  dot: string;
  // Step 1, a dictionary key.
  how: string;
  trxPlaceholder: string;
  // Under the TrxID box, a dictionary key.
  trxHint: string;
}

export const WALLETS: WalletMeta[] = [
  { id: "BKASH", name: "bKash", dot: "bg-gateway-bkash", how: "Open bKash and tap Send Money.", trxPlaceholder: "9KD7H2X4LM", trxHint: "10 letters and numbers, from the bKash message" },
  { id: "NAGAD", name: "Nagad", dot: "bg-gateway-nagad", how: "Open Nagad and tap Send Money.", trxPlaceholder: "7HX2K9QA", trxHint: "8 letters and numbers, from the Nagad message" },
  { id: "ROCKET", name: "Rocket", dot: "bg-gateway-rocket", how: "Dial *322# or open the Rocket app and choose Send Money.", trxPlaceholder: "4102938475", trxHint: "10 numbers, from the Rocket message" },
  {
    id: "BANK",
    name: "Bank",
    dot: "bg-info-ink",
    how: "Send a BEFTN or NPSB transfer from your bank app, or pay at any branch.",
    trxPlaceholder: "BEFTN-2611-0042",
    trxHint: "The reference your bank gives you",
  },
];

export const walletMeta = (id: ManualWallet): WalletMeta => WALLETS.find((wallet) => wallet.id === id) ?? WALLETS[0];

// The ways the checkout offers: those an admin set up, or every one while
// none is (the admin's own instructions then say where to send).
export function offeredWallets(accounts: PaymentAccounts | undefined): WalletMeta[] {
  const set = WALLETS.filter((wallet) => accounts?.[wallet.id]);
  return set.length > 0 ? set : WALLETS;
}

// ---- What the customer types, checked as the API checks it ----

// Digits only, +880 as 0: "+880 1711-482915" -> "01711482915".
export function normaliseMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("880") ? `0${digits.slice(3)}` : digits;
}

const MOBILE = /^01[3-9]\d{8}$/;
// A Rocket account is the mobile number plus a check digit.
const ROCKET = /^01[3-9]\d{8}\d?$/;
const REFERENCE = /^[A-Z0-9][A-Z0-9./_#-]{0,39}$/;
const REFERENCE_MIN: Record<ManualWallet, number> = { BKASH: 8, NAGAD: 8, ROCKET: 8, BANK: 6 };

// The number the money came from, or for a bank the name on the account.
export function payerOk(wallet: ManualWallet, raw: string): boolean {
  if (wallet === "BANK") {
    const name = raw.replace(/\s+/g, " ").trim();
    return name.length >= 3 && name.length <= 80;
  }
  return (wallet === "ROCKET" ? ROCKET : MOBILE).test(normaliseMobile(raw));
}

// The TrxID as it is stored: no spaces, in capitals.
export const cleanReference = (raw: string): string => raw.replace(/\s+/g, "").toUpperCase();

export function referenceOk(wallet: ManualWallet, raw: string): boolean {
  const reference = cleanReference(raw);
  return REFERENCE.test(reference) && reference.replace(/[^A-Z0-9]/g, "").length >= REFERENCE_MIN[wallet];
}

// "01309-000555", as the board prints a wallet number.
export const formatWalletNumber = (raw: string): string => {
  const digits = normaliseMobile(raw);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : raw;
};

// ---- The period a payment buys ----

// `months` calendar months on, at the same time of day; a day the month
// doesn't have becomes its last (the API's addMonths).
export function addMonths(from: Date, months: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(from.getUTCDate(), lastDay), from.getUTCHours(), from.getUTCMinutes(), from.getUTCSeconds(), from.getUTCMilliseconds()));
}

// What paying for `plan` now would buy, as the API works it out once the
// payment is confirmed: the same paid plan while it still runs adds to its
// end; anything else starts now.
export function checkoutPeriod(subscription: Pick<Subscription, "planId" | "isPaid" | "currentPeriodEnd">, plan: Pick<BillingPlan, "id" | "billingCycle">, now = new Date()): { start: Date; end: Date } {
  const runningEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const extend = subscription.isPaid && subscription.planId === plan.id && runningEnd !== null && runningEnd > now;
  const start = extend && runningEnd ? runningEnd : now;
  return { start, end: addMonths(start, plan.billingCycle === "YEARLY" ? 12 : 1) };
}

// The invited friend's first-payment discount on `price`, in taka: whole
// taka, rounded down (the API's referralDiscountPaisa).
export function referralDiscount(price: string | number, percent: number | null): number {
  if (!percent || !(percent > 0)) return 0;
  const paisa = Math.round(Number(price) * 100);
  return Math.max(0, Math.min(Math.floor((paisa * percent) / 100 / 100) * 100, paisa)) / 100;
}

// ---- The receipt's amount in words (lakh and crore, as taka is said) ----

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const BN_99 =
  "শূন্য এক দুই তিন চার পাঁচ ছয় সাত আট নয় দশ এগারো বারো তেরো চৌদ্দ পনেরো ষোলো সতেরো আঠারো উনিশ বিশ একুশ বাইশ তেইশ চব্বিশ পঁচিশ ছাব্বিশ সাতাশ আটাশ ঊনত্রিশ ত্রিশ একত্রিশ বত্রিশ তেত্রিশ চৌত্রিশ পঁয়ত্রিশ ছত্রিশ সাঁইত্রিশ আটত্রিশ ঊনচল্লিশ চল্লিশ একচল্লিশ বিয়াল্লিশ তেতাল্লিশ চুয়াল্লিশ পঁয়তাল্লিশ ছেচল্লিশ সাতচল্লিশ আটচল্লিশ ঊনপঞ্চাশ পঞ্চাশ একান্ন বাহান্ন তিপ্পান্ন চুয়ান্ন পঞ্চান্ন ছাপ্পান্ন সাতান্ন আটান্ন ঊনষাট ষাট একষট্টি বাষট্টি তেষট্টি চৌষট্টি পঁয়ষট্টি ছেষট্টি সাতষট্টি আটষট্টি ঊনসত্তর সত্তর একাত্তর বাহাত্তর তিয়াত্তর চুয়াত্তর পঁচাত্তর ছিয়াত্তর সাতাত্তর আটাত্তর ঊনআশি আশি একাশি বিরাশি তিরাশি চুরাশি পঁচাশি ছিয়াশি সাতাশি আটাশি ঊননব্বই নব্বই একানব্বই বিরানব্বই তিরানব্বই চুরানব্বই পঁচানব্বই ছিয়ানব্বই সাতানব্বই আটানব্বই নিরানব্বই".split(
    " ",
  );

const en99 = (n: number): string => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);

function wordsOf(n: number, locale: "en" | "bn"): string[] {
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;
  const small = locale === "en" ? en99 : (x: number) => BN_99[x];
  const out: string[] = [];
  if (crore) out.push(...wordsOf(crore, locale), locale === "en" ? "crore" : "কোটি");
  if (lakh) out.push(small(lakh), locale === "en" ? "lakh" : "লক্ষ");
  if (thousand) out.push(small(thousand), locale === "en" ? "thousand" : "হাজার");
  if (hundred) out.push(locale === "en" ? `${ONES[hundred]} hundred` : `${BN_99[hundred]}শত`);
  if (rest) out.push(small(rest));
  return out;
}

// "One thousand five hundred twenty-eight taka only" / "এক হাজার পাঁচশত
// আটাশ টাকা মাত্র". Whole taka; the paisa, when there are some, follow.
export function takaInWords(amount: number, locale: "en" | "bn"): string {
  const taka = Math.floor(Math.abs(amount));
  const paisa = Math.round((Math.abs(amount) - taka) * 100);
  const say = (n: number) => (n === 0 ? (locale === "en" ? "zero" : BN_99[0]) : wordsOf(n, locale).join(" "));
  if (locale === "bn") return `${say(taka)} টাকা${paisa ? ` ${say(paisa)} পয়সা` : ""} মাত্র`;
  const text = `${say(taka)} taka${paisa ? ` and ${say(paisa)} paisa` : ""} only`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
