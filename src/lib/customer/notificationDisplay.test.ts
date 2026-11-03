import { describe, expect, it } from "vitest";
import { fillText } from "@/lib/i18n/fill";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import type { UserNotification } from "./api";
import { notificationTime, notificationView } from "./notificationDisplay";

const now = new Date("2026-10-02T08:00:00.000Z"); // Fri 2 Oct, 2 pm in Dhaka
const row = (type: UserNotification["type"], data: UserNotification["data"]): UserNotification => ({ id: "n1", businessId: "b1", type, data, readAt: null, createdAt: now.toISOString() });

describe("notificationView", () => {
  it("words a budget nearing or over its limit", () => {
    expect(notificationView(row("BUDGET", { category: "Shopping", percent: 98, left: "100.00", month: "2026-10" }), inEnglish, "en", "BDT", now)).toMatchObject({
      kind: "budget",
      title: "Shopping is at 98% of its limit",
      body: "Only ৳ 100 left for the rest of October.",
      href: "/budget-planning",
    });
    expect(notificationView(row("BUDGET", { category: "Food", percent: 105, left: "-400.00", month: "2026-10" }), inEnglish, "en", "BDT", now)).toMatchObject({ title: "Food is over its limit", body: "৳ 400 over the limit for October." });
  });

  it("gives a Bangla reader the category's Bangla name and Bangla digits", () => {
    const item = row("BUDGET", { category: "Shopping", categoryBn: "কেনাকাটা", percent: 98, left: "100.00", month: "2026-10" });
    expect(notificationView(item, inEnglish, "bn", "BDT", now).title).toBe("কেনাকাটা is at ৯৮% of its limit");
    expect(notificationView(item, inEnglish, "en", "BDT", now).title).toBe("Shopping is at 98% of its limit");
    // Until the reminder carries a Bangla name, the English one stays.
    expect(notificationView(row("BUDGET", { category: "Shopping", percent: 98, left: "1", month: "2026-10" }), inEnglish, "bn", "BDT", now).title).toBe("Shopping is at ৯৮% of its limit");
  });

  it("counts the days to a loan payment from today, not from when it was written", () => {
    const due = (dueDate: string, direction = "PAYABLE", loan = 1) => notificationView(row("LOAN_DUE", { name: "Islami Bank", contactId: "c1", loan, direction, amount: "5000.00", dueDate, days: 3 }), inEnglish, "en", "BDT", now);
    expect(due("2026-10-05")).toMatchObject({ kind: "loan", title: "Payment to Islami Bank is due in 3 days", body: "৳ 5,000 on Mon, 5 Oct.", href: "/loan-management/ledger?contactId=c1" });
    expect(due("2026-10-03").title).toBe("Payment to Islami Bank is due tomorrow");
    expect(due("2026-10-02", "RECEIVABLE", 0)).toMatchObject({ title: "Islami Bank should pay you today", href: "/contacts/c1" });
    expect(due("2026-10-01").title).toBe("Payment to Islami Bank is overdue");
    expect(notificationView(row("LOAN_DUE", { name: "Islami Bank", contactId: "c1", loan: 1, direction: "PAYABLE", amount: "5000.00", dueDate: "2026-10-05" }), inEnglish, "bn", "BDT", now).title).toBe("Payment to Islami Bank is due in ৩ days");
  });

  it("words a savings check-in", () => {
    expect(notificationView(row("SAVINGS", { goal: "iPhone", behind: 1, percent: 33, perMonth: "33750.00", targetDate: "2027-01-31", month: "2026-10" }), inEnglish, "en", "BDT", now)).toMatchObject({
      title: "Savings check-in for October",
      body: "iPhone is behind. Save ৳ 33,750 a month to reach it by January.",
    });
    expect(notificationView(row("SAVINGS", { goal: "Hajj", behind: 0, percent: 61, perMonth: "1000.00", targetDate: "2027-06-30", month: "2026-10" }), inEnglish, "en", "BDT", now).body).toBe("Hajj is on track: 61% saved.");
  });

  it("names the year of a target month that isn't within the coming year", () => {
    const behind = (targetDate: string, locale: "en" | "bn" = "en") => notificationView(row("SAVINGS", { goal: "Car", behind: 1, percent: 10, perMonth: "5000.00", targetDate, month: "2026-10" }), inEnglish, locale, "BDT", now).body;
    expect(behind("2027-09-30")).toBe("Car is behind. Save ৳ 5,000 a month to reach it by September.");
    expect(behind("2027-10-31")).toBe("Car is behind. Save ৳ 5,000 a month to reach it by October 2027.");
    expect(behind("2028-01-31")).toBe("Car is behind. Save ৳ 5,000 a month to reach it by January 2028.");
    expect(behind("2028-01-31", "bn")).toBe("Car is behind. Save ৳ ৫,০০০ a month to reach it by January ২০২৮.");
    expect(behind("2026-08-31")).toBe("Car is behind. Save ৳ 5,000 a month to reach it by August 2026.");
  });

  it("says when zakat is due and what is left, counting the days from now", () => {
    const zakat = (dueDate: string) => notificationView(row("ZAKAT", { dueDate, days: 30, left: "20000.00", zakat: "28548.00" }), inEnglish, "en", "BDT", now);
    expect(zakat("2026-11-01")).toMatchObject({ kind: "zakat", title: "Your zakat is due in 30 days", href: "/zakat" });
    expect(zakat("2026-11-01").body).toMatch(/^৳.20,000 left to give by 1 Nov 2026\.$/);
    expect(zakat("2026-10-03").title).toBe("Your zakat is due tomorrow");
    expect(zakat("2026-10-02").title).toBe("Your zakat is due today");
    expect(zakat("2026-09-30").title).toBe("Your zakat date has passed");
  });

  it("opens the conversation support answered", () => {
    expect(notificationView(row("SUPPORT_REPLY", { ticketId: "t1", subject: "Shop money" }), inEnglish, "en")).toEqual({ kind: "support", title: "Support replied to your message", body: "Shop money", href: "/settings/help?message=t1" });
    // The admin's Support reply template, when on, words the body.
    expect(notificationView(row("SUPPORT_REPLY", { ticketId: "t1", subject: "Shop money", body: "সাপোর্ট উত্তর দিয়েছে" }), inEnglish, "en")?.body).toBe("সাপোর্ট উত্তর দিয়েছে");
  });

  it("shows an announcement in Bangla when it has Bangla", () => {
    const item = row("ANNOUNCEMENT", { title: "New", titleBn: "নতুন", body: "Body", bodyBn: null });
    expect(notificationView(item, inEnglish, "bn")).toEqual({ kind: "announcement", title: "নতুন", body: "Body", href: null });
    expect(notificationView(item, inEnglish, "en").title).toBe("New");
  });
});

describe("notificationTime", () => {
  it("dates a row the way the board does", () => {
    expect(notificationTime("2026-10-02T07:48:00.000Z", inEnglish, "en", now)).toBe("12 min ago");
    expect(notificationTime("2026-10-02T05:20:00.000Z", inEnglish, "en", now)).toBe("11:20 am");
    expect(notificationTime("2026-10-01T10:00:00.000Z", inEnglish, "en", now)).toBe("Yesterday");
    expect(notificationTime("2026-09-29T10:00:00.000Z", inEnglish, "en", now)).toBe("Tue, 29 Sep");
    expect(notificationTime("2025-06-02T10:00:00.000Z", inEnglish, "en", now)).toBe("2 Jun 2025");
  });

  it("counts the minutes in the reader's digits", () => {
    expect(notificationTime("2026-10-02T07:48:00.000Z", inEnglish, "bn", now)).toBe("১২ min ago");
  });
});

describe("notificationTime in Bangla", () => {
  it("dates a row in the reader's language", () => {
    expect(notificationTime("2026-10-02T05:20:00.000Z", inEnglish, "bn", now)).toBe("১১:২০ পূর্বাহ্ণ");
    expect(notificationTime("2026-09-29T10:00:00.000Z", inEnglish, "bn", now)).toBe("মঙ্গল, ২৯ সেপ্টে");
    expect(notificationTime("2025-06-02T10:00:00.000Z", inEnglish, "bn", now)).toBe("২ জুন ২০২৫");
  });

  it("dates a loan reminder in the reader's language", () => {
    const item = row("LOAN_DUE", { name: "Islami Bank", contactId: "c1", loan: 1, direction: "PAYABLE", amount: "5000.00", dueDate: "2026-10-05" });
    expect(notificationView(item, inEnglish, "bn", "BDT", now).body).toContain("সোম, ৫ অক্টো");
  });
});

describe("notificationView for a habit reminder", () => {
  const inBangla: Translate = (key, values) => fillText(translate("bn", key), values ?? {});
  const reminder = (data: UserNotification["data"]) => ({ ...row("REMINDER", data), businessId: null });

  it("words a prayer reminder from its data and opens its page", () => {
    const fajr = reminder({ kind: "NAMAZ", targetKey: "fajr", prayer: "fajr", name: "Fajr", at: "04:52", minutesBefore: 10, url: "/habit-tracker/habits?category=Namaz" });
    expect(notificationView(fajr, inEnglish, "en")).toEqual({ kind: "reminder", title: "Fajr in 10 minutes", body: "Fajr is at 4:52 am.", href: "/habit-tracker/habits?category=Namaz" });
    expect(notificationView(fajr, inBangla, "bn")).toMatchObject({ title: "১০ মিনিট পরে ফজর", body: "ফজর ৪:৫২ পূর্বাহ্ণ-এ।" });
    expect(notificationView(reminder({ kind: "NAMAZ", targetKey: "asr", at: "15:40", minutesBefore: 0 }), inEnglish, "en").title).toBe("Time for Asr");
  });

  it("words Sehri and Iftar", () => {
    expect(notificationView(reminder({ kind: "RAMADAN", targetKey: "sehri", at: "04:30", minutesBefore: 30 }), inEnglish, "en")).toMatchObject({ title: "Sehri ends in 30 minutes", body: "Sehri ends at 4:30 am.", href: "/habit-tracker/habits?category=Ramadan" });
    expect(notificationView(reminder({ kind: "RAMADAN", targetKey: "iftar", at: "17:45", minutesBefore: 0 }), inEnglish, "en")).toMatchObject({ title: "Time for Iftar", body: "Iftar is at 5:45 pm." });
  });

  it("titles a habit, challenge, book, skill or to-do with its own name", () => {
    expect(notificationView(reminder({ kind: "HABIT", targetKey: "h1", name: "Walk 30 min", at: "07:00", url: "/habit-tracker/daily" }), inEnglish, "en")).toEqual({ kind: "reminder", title: "Walk 30 min", body: "Time for your habit.", href: "/habit-tracker/daily" });
    expect(notificationView(reminder({ kind: "BOOK", targetKey: "b1", name: "Atomic Habits", at: "21:00" }), inBangla, "bn")).toMatchObject({ title: "Atomic Habits", body: "পড়ার সময় হয়েছে।", href: "/habit-tracker/habits?category=Book" });
    expect(notificationView(reminder({ kind: "TODO", targetKey: "t1", name: "Call the bank", at: "15:00", minutesBefore: 15 }), inEnglish, "en")).toMatchObject({ title: "Call the bank", body: "Due at 3:00 pm, in 15 min.", href: "/habit-tracker/todos" });
    expect(notificationView(reminder({ kind: "TODO", targetKey: "t1", name: "Call the bank", at: "15:00", minutesBefore: 15 }), inBangla, "bn").body).toBe("১৫ মিনিট পরে, ৩:০০ অপরাহ্ণ-এ করার কথা।");
  });

  it("never follows a link out of the app", () => {
    expect(notificationView(reminder({ kind: "SKILL", targetKey: "s1", name: "Guitar", url: "https://evil.example" }), inEnglish, "en").href).toBe("/habit-tracker/habits?category=Course");
    expect(notificationView(reminder({ name: "Something new", url: "//evil.example" }), inEnglish, "en")).toEqual({ kind: "reminder", title: "Something new", body: "", href: null });
  });
});

describe("notificationView for account rows", () => {
  const inBangla: Translate = (key, values) => fillText(translate("bn", key), values ?? {});
  const account = (type: UserNotification["type"], data: UserNotification["data"]) => ({ ...row(type, data), businessId: null });
  const en = (type: UserNotification["type"], data: UserNotification["data"]) => notificationView(account(type, data), inEnglish, "en", "BDT", now);
  const bn = (type: UserNotification["type"], data: UserNotification["data"]) => notificationView(account(type, data), inBangla, "bn", "BDT", now);

  it("words every billing event and opens the payment's page or Plans", () => {
    const paid = { event: "PAYMENT_PAID", paymentId: "p1", planName: "Pro", amount: "299.00", periodEnd: "2026-11-28T00:00:00.000Z", invoiceNumber: "INV-1" };
    expect(en("BILLING", paid)).toEqual({ kind: "payment", title: "Payment received", body: "৳ 299 for Pro. It's active until 28 Nov 2026.", href: "/settings/plans/checkout?payment=p1" });
    expect(bn("BILLING", paid)).toMatchObject({ title: "পেমেন্ট পাওয়া গেছে", body: "Pro-এর জন্য ৳ ২৯৯। ২৮ নভে ২০২৬ পর্যন্ত চালু থাকবে।" });
    expect(en("BILLING", { ...paid, periodEnd: null }).body).toBe("৳ 299 for Pro. It's active now.");

    const failed = { event: "PAYMENT_FAILED", paymentId: "p1", planName: "Pro", amount: "299.00", reason: "Wrong TrxID" };
    expect(en("BILLING", failed)).toMatchObject({ kind: "paymentProblem", title: "Payment failed", body: "Your ৳ 299 payment for Pro didn't go through. Reason: Wrong TrxID" });
    expect(bn("BILLING", failed)).toMatchObject({ title: "পেমেন্ট ব্যর্থ হয়েছে", body: "Pro-এর জন্য আপনার ৳ ২৯৯ পেমেন্ট সম্পন্ন হয়নি। কারণ: Wrong TrxID" });

    const expired = { event: "PAYMENT_EXPIRED", paymentId: "p1", planName: "Pro", amount: "299.00" };
    expect(en("BILLING", expired)).toMatchObject({ kind: "paymentProblem", title: "Payment not completed", body: "Your ৳ 299 checkout for Pro timed out. You can start it again from Plans." });
    expect(bn("BILLING", expired).title).toBe("পেমেন্ট সম্পন্ন হয়নি");
    expect(en("BILLING", expired).href).toBe("/settings/plans/checkout?payment=p1");
    expect(en("BILLING", { ...expired, paymentId: undefined }).href).toBe("/settings/plans");

    const refunded = { event: "PAYMENT_REFUNDED", paymentId: "p1", planName: "Pro", amount: "299.00", full: 1, planDropped: 1 };
    expect(en("BILLING", refunded)).toMatchObject({ kind: "refund", title: "Payment refunded", body: "Your ৳ 299 payment for Pro was refunded. You're on the Free plan now." });
    expect(en("BILLING", { ...refunded, amount: "100.00", full: 0, planDropped: 0 }).body).toBe("৳ 100 of your payment for Pro was refunded.");
    expect(bn("BILLING", refunded).body).toBe("Pro-এর জন্য আপনার ৳ ২৯৯ পেমেন্ট ফেরত দেওয়া হয়েছে। আপনি এখন ফ্রি প্ল্যানে আছেন।");

    const ending = { event: "PLAN_ENDING", planName: "Pro", endsAt: "2026-10-05T00:00:00.000Z", trial: 0, cancelling: 0 };
    expect(en("BILLING", ending)).toMatchObject({ kind: "plan", title: "Pro ends soon", body: "It ends on 5 Oct 2026. Pay for the next period to keep it." });
    expect(en("BILLING", { ...ending, cancelling: 1 }).body).toBe("It ends on 5 Oct 2026, as you asked. You can resume it before then.");
    expect(en("BILLING", { ...ending, trial: 1 })).toMatchObject({ title: "Your Pro trial ends soon", body: "It ends on 5 Oct 2026. Choose a plan to keep its features." });
    expect(bn("BILLING", ending)).toMatchObject({ title: "Pro শীঘ্রই শেষ হবে", body: "৫ অক্টো ২০২৬-এ শেষ হবে। চালু রাখতে পরের মেয়াদের টাকা দিন।" });

    const pastDue = { event: "PLAN_PAST_DUE", planName: "Pro", graceEndsAt: "2026-10-04T00:00:00.000Z" };
    expect(en("BILLING", pastDue)).toMatchObject({ kind: "plan", title: "Pro payment is overdue", body: "Pay by 4 Oct 2026 to keep your plan." });
    expect(bn("BILLING", pastDue).body).toBe("প্ল্যান রাখতে ৪ অক্টো ২০২৬-এর মধ্যে টাকা দিন।");

    const ended = { event: "PLAN_ENDED", planName: "Pro", endedAt: "2026-10-01T00:00:00.000Z", trial: 0, reason: "EXPIRED" };
    expect(en("BILLING", ended)).toMatchObject({ kind: "plan", title: "Pro has ended", body: "You're on the Free plan now." });
    expect(en("BILLING", { ...ended, trial: 1 }).title).toBe("Your Pro trial has ended");
    expect(bn("BILLING", ended)).toMatchObject({ title: "Pro শেষ হয়েছে", body: "আপনি এখন ফ্রি প্ল্যানে আছেন।" });
  });

  it("words every referral event", () => {
    const pending = { event: "COMMISSION_PENDING", referralId: "r1", friendName: "Karim", planName: "Pro", amount: 59.8, paidAmount: "299.00", availableAt: "2026-11-01T00:00:00.000Z" };
    expect(en("REFERRAL", pending)).toEqual({ kind: "referral", title: "Karim bought Pro", body: "You earned ৳ 59.80. You can withdraw it from 1 Nov 2026.", href: "/referrals/earnings" });
    expect(bn("REFERRAL", pending)).toMatchObject({ title: "Karim Pro কিনেছেন", body: "আপনি ৳ ৫৯.৮০ পেয়েছেন। ১ নভে ২০২৬ থেকে তুলতে পারবেন।" });
    expect(en("REFERRAL", { ...pending, planName: null }).title).toBe("Karim bought a plan");
    expect(en("REFERRAL", { ...pending, kind: "RENEWAL" }).title).toBe("Karim renewed Pro");
    expect(bn("REFERRAL", { ...pending, kind: "RENEWAL" }).title).toBeTruthy();

    const available = { event: "COMMISSION_AVAILABLE", referralId: "r1", friendName: "Karim", amount: "60.00" };
    expect(en("REFERRAL", available)).toMatchObject({ kind: "referral", title: "৳ 60 is ready to withdraw", body: "Your reward for inviting Karim." });
    expect(bn("REFERRAL", available)).toMatchObject({ title: "৳ ৬০ এখন তুলতে পারেন", body: "Karim-কে আমন্ত্রণ জানানোর পুরস্কার।" });

    const missed = { event: "COMMISSION_MISSED", referralId: "r1", friendName: "Karim", planName: "Pro", amount: 60, reason: "REFERRER_NOT_ON_PAID_PLAN" };
    expect(en("REFERRAL", missed)).toMatchObject({ kind: "referralLost", title: "You missed a reward", body: "Karim bought a plan, but rewards need a paid plan of your own. You missed ৳ 60." });
    expect(en("REFERRAL", { ...missed, amount: 0 }).body).toBe("Karim bought a plan, but rewards need a paid plan of your own.");
    expect(bn("REFERRAL", missed).title).toBe("একটি পুরস্কার পাননি");

    const cancelled = { event: "COMMISSION_CANCELLED", referralId: "r1", friendName: "Karim", amount: "60.00", reason: "FRIEND_REFUNDED" };
    expect(en("REFERRAL", cancelled)).toMatchObject({ kind: "referralLost", title: "A reward was cancelled", body: "Karim's payment was refunded, so the ৳ 60 reward was cancelled." });
    expect(en("REFERRAL", { ...cancelled, reason: "ADMIN" }).body).toBe("The ৳ 60 reward for inviting Karim was cancelled.");
    expect(bn("REFERRAL", cancelled).body).toBe("Karim-এর পেমেন্ট ফেরত দেওয়া হয়েছে, তাই ৳ ৬০ পুরস্কার বাতিল হয়েছে।");

    // Lines held back from a withdrawal for a check, and one let go again.
    const held = { event: "COMMISSION_UNDER_CHECK", payoutId: "w1", displayId: "WD-1048", count: 2 };
    expect(en("REFERRAL", held)).toEqual({
      kind: "referralLost",
      title: "Some payments are being checked",
      body: "We held back 2 payments from WD-1048 to check them. The rest is on its way.",
      href: "/referrals/withdrawals",
    });
    const released = { event: "COMMISSION_RELEASED", commissionId: "c1", friendName: "Karim", amount: "35.80" };
    expect(en("REFERRAL", released)).toMatchObject({ kind: "referral", href: "/referrals/earnings" });

    // The invited friend's nudge leads to the plans their discount is on.
    const nudge = { event: "INVITE_REMINDER", referrerFirstName: "Rahim", friendDiscountPct: 10 };
    expect(en("REFERRAL", nudge)).toEqual({ kind: "referral", title: "Rahim invited you to a paid plan", body: "Get 10% off your first plan.", href: "/settings/plans" });
    expect(bn("REFERRAL", nudge)).toMatchObject({ title: "Rahim আপনাকে একটি পেইড প্ল্যানে আমন্ত্রণ জানিয়েছেন", body: "প্রথম প্ল্যানে ১০% ছাড় পান।" });
    expect(en("REFERRAL", { ...nudge, friendDiscountPct: 0 }).body).toBe("See what each plan offers.");
  });

  it("words every payout event and opens the withdrawals", () => {
    const base = { payoutId: "w1", displayId: "WD-0001", amount: "500.00", methodType: "BKASH" };
    expect(en("PAYOUT", { ...base, event: "PAYOUT_APPROVED" })).toEqual({ kind: "payout", title: "Withdrawal approved", body: "Your ৳ 500 withdrawal is approved and will be sent soon.", href: "/referrals/withdrawals" });
    expect(bn("PAYOUT", { ...base, event: "PAYOUT_APPROVED" }).body).toBe("আপনার ৳ ৫০০ তোলার অনুরোধ অনুমোদিত হয়েছে, শীঘ্রই পাঠানো হবে।");
    const paid = { ...base, event: "PAYOUT_PAID", paidAmount: "490.00", trxId: "BK123", paidAt: "2026-10-02T06:00:00.000Z", incomeWallet: null };
    expect(en("PAYOUT", paid)).toMatchObject({ kind: "payout", title: "Withdrawal sent", body: "৳ 490 was sent to you. Transaction ID: BK123" });
    expect(bn("PAYOUT", paid)).toMatchObject({ title: "টাকা পাঠানো হয়েছে", body: "আপনাকে ৳ ৪৯০ পাঠানো হয়েছে। ট্রানজেকশন আইডি: BK123" });
    const rejected = { ...base, event: "PAYOUT_REJECTED", reason: "Wrong number" };
    expect(en("PAYOUT", rejected)).toMatchObject({ kind: "payoutRejected", title: "Withdrawal rejected", body: "৳ 500 is back in your balance. Reason: Wrong number" });
    expect(bn("PAYOUT", rejected).title).toBe("টাকা তোলার অনুরোধ বাতিল হয়েছে");
  });

  it("words every security event and opens Security", () => {
    expect(en("SECURITY", { event: "TWO_STEP_ON", at: now.toISOString() })).toEqual({
      kind: "securityOn",
      title: "Two-step sign-in is on",
      body: "Signing in now also needs a code from your authenticator app.",
      href: "/settings/security",
    });
    expect(bn("SECURITY", { event: "TWO_STEP_ON" }).title).toBe("দুই ধাপে সাইন ইন চালু হয়েছে");
    expect(en("SECURITY", { event: "TWO_STEP_OFF" })).toMatchObject({ kind: "securityOff", title: "Two-step sign-in is off", body: "If this wasn't you, change your password now." });
    expect(bn("SECURITY", { event: "TWO_STEP_OFF" }).body).toBe("এটি আপনি না করে থাকলে এখনই পাসওয়ার্ড বদলান।");
    expect(en("SECURITY", { event: "TWO_STEP_OFF_BY_SUPPORT" })).toMatchObject({ kind: "securityOff", title: "Support turned off two-step sign-in" });
    expect(bn("SECURITY", { event: "TWO_STEP_OFF_BY_SUPPORT" }).title).toBe("সাপোর্ট দুই ধাপে সাইন ইন বন্ধ করেছে");

    const device = { event: "NEW_DEVICE", deviceLabel: "Chrome on Windows", ipAddress: "103.1.2.3", country: "Bangladesh" };
    expect(en("SECURITY", device)).toMatchObject({ kind: "securityAlert", title: "New sign-in to your account", body: "Chrome on Windows in Bangladesh. If this wasn't you, change your password now." });
    expect(en("SECURITY", { ...device, country: null, ipAddress: null }).body).toBe("Chrome on Windows. If this wasn't you, change your password now.");
    expect(bn("SECURITY", device)).toMatchObject({ title: "আপনার অ্যাকাউন্টে নতুন সাইন ইন", body: "Bangladesh থেকে Chrome on Windows। এটি আপনি না করে থাকলে এখনই পাসওয়ার্ড বদলান।" });

    const tries = { event: "FAILED_TRIES", count: 12, ipAddress: "103.1.2.3", country: null };
    expect(en("SECURITY", tries)).toMatchObject({ kind: "securityAlert", title: "Failed sign-in attempts", body: "12 wrong-password tries from 103.1.2.3. If this wasn't you, change your password now." });
    expect(en("SECURITY", { ...tries, count: 1, ipAddress: null }).body).toBe("1 wrong-password try. If this wasn't you, change your password now.");
    expect(bn("SECURITY", tries).body).toBe("103.1.2.3 থেকে ১২ বার ভুল পাসওয়ার্ড দিয়ে চেষ্টা। এটি আপনি না করে থাকলে এখনই পাসওয়ার্ড বদলান।");
  });

  it("shows a campaign's own words and an idea's news", () => {
    const campaign = { event: "CAMPAIGN", campaignId: "c1", title: "ঈদ অফার", body: "সব প্ল্যানে ২০% ছাড়" };
    expect(en("CAMPAIGN", campaign)).toEqual({ kind: "campaign", title: "ঈদ অফার", body: "সব প্ল্যানে ২০% ছাড়", href: null });
    expect(en("CAMPAIGN", { event: "CAMPAIGN", title: "", body: "Hello" }).title).toBe("You have a new notification");
    expect(bn("CAMPAIGN", { event: "CAMPAIGN", title: null, body: "Hello" }).title).toBe("আপনার একটি নতুন নোটিফিকেশন আছে");

    const idea = { event: "IDEA_STATUS", ideaId: "i1", title: "Dark mode for reports", status: "SHIPPED" };
    expect(en("IDEA", idea)).toEqual({ kind: "idea", title: "An idea you voted for is live", body: "Dark mode for reports", href: "/settings/help" });
    expect(en("IDEA", { ...idea, status: "PLANNED" }).title).toBe("An idea you voted for is planned");
    expect(bn("IDEA", idea).title).toBe("আপনার ভোট দেওয়া একটি আইডিয়া চালু হয়েছে");
    expect(bn("IDEA", { ...idea, status: "PLANNED" }).title).toBe("আপনার ভোট দেওয়া একটি আইডিয়া পরিকল্পনায় আছে");
  });

  it("never fails on a type or event it doesn't know", () => {
    const newType = "SOMETHING_NEW" as UserNotification["type"];
    expect(notificationView(account(newType, { title: "Hello", body: "World", url: "/dashboard" }), inEnglish, "en")).toEqual({ kind: "other", title: "Hello", body: "World", href: "/dashboard" });
    expect(notificationView(account(newType, {}), inEnglish, "en")).toEqual({ kind: "other", title: "You have a new notification", body: "", href: null });
    expect(notificationView(account(newType, {}), inBangla, "bn").title).toBe("আপনার একটি নতুন নোটিফিকেশন আছে");
    // A link out of the app is never followed.
    expect(notificationView(account(newType, { url: "https://evil.example" }), inEnglish, "en").href).toBeNull();
    // A known type with a newer event keeps its page.
    expect(en("BILLING", { event: "PLAN_UPGRADED", planName: "Pro" })).toEqual({ kind: "other", title: "You have a new notification", body: "", href: "/settings/plans" });
    expect(en("SECURITY", { event: "PASSKEY_ADDED" })).toMatchObject({ kind: "other", href: "/settings/security" });
    expect(en("PAYOUT", { event: "PAYOUT_ON_HOLD" })).toMatchObject({ kind: "other", href: "/referrals/withdrawals" });
    expect(en("IDEA", { event: "IDEA_COMMENT" })).toMatchObject({ kind: "other", href: "/settings/help" });
    // A row with no data at all.
    const noData = null as unknown as UserNotification["data"];
    expect(notificationView(account("BUDGET", noData), inEnglish, "en", "BDT", now).title).toBeTruthy();
    expect(notificationView(account("BILLING", noData), inEnglish, "en")).toMatchObject({ kind: "other", href: "/settings/plans" });
  });
});

describe("a reminder about a PIN-locked workspace", () => {
  it("says only that there is one, and opens its page (which asks for the PIN)", () => {
    const item: UserNotification = { id: "n1", businessId: "b1", type: "LOAN_DUE", data: {}, locked: true, readAt: null, createdAt: "2026-11-02T06:00:00.000Z" };
    expect(notificationView(item, inEnglish, "en")).toEqual({ kind: "other", title: "A reminder in a PIN-locked workspace", body: "Enter its PIN to see it.", href: "/loan-management" });
  });
});
