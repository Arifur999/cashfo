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

  it("opens the conversation support answered", () => {
    expect(notificationView(row("SUPPORT_REPLY", { ticketId: "t1", subject: "Shop money" }), inEnglish, "en")).toEqual({ kind: "support", title: "Support replied to your message", body: "Shop money", href: "/settings/help?message=t1" });
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
