import { describe, expect, it } from "vitest";
import { bnDictionary } from "@/lib/i18n/dictionary";
import { referralsDictionary } from "@/lib/i18n/dictionary/referrals";
import { savingsGoalsDictionary } from "@/lib/i18n/dictionary/savings-goals";
import { translate } from "@/lib/i18n/translate";
import {
  addWorkingDays,
  balancesOf,
  bankShortName,
  CANCEL_NOTES,
  chartMonths,
  cleanTag,
  commissionNote,
  COMMISSION_STATUS,
  destinationLine,
  FRIEND_STANDING,
  FRIEND_TABS,
  friendDay,
  friendTabCounts,
  friendTabOf,
  formatWalletNumber,
  initials,
  inviteLink,
  isTag,
  KIND_LABEL,
  linkText,
  maskEmail,
  maskWallet,
  methodProblem,
  normaliseMobile,
  notPayingLine,
  PAYOUT_STATUS,
  peopleMix,
  programOf,
  shareLinks,
  showsLockedPage,
  speedOf,
} from "./referralDisplay";
import type { Earning, ReferralProgramInfo } from "./referralTypes";

const INFO: ReferralProgramInfo = {
  referralCode: "9AAD7001",
  canEarn: true,
  lockedReason: null,
  myPlan: { planId: "p", planName: "Yearly Pro", status: "ACTIVE", isPaid: true },
  program: { live: true, whoCanEarn: "PAID_PLAN", commissionPct: 20, friendDiscountPct: 10, holdDays: 7, minWithdrawal: "300.00", fee: "0.00", payWithinDays: 3, methods: ["BKASH"], examples: [] },
  balances: { available: "846.80", onHold: "35.80", onHoldNextAt: null, inWithdrawal: "0.00", underCheck: "0.00", paidOut: "451.20", reversed: "35.80", lifetime: "1333.80", lastPaidAt: null },
  lastPayout: null,
  linkCount: 4,
  months: [],
  people: { total: 10, PAYING: 6, FREE: 2, STOPPED: 1, REFUNDED: 1, BLOCKED: 0 },
  expectedNext30Days: "119.40",
  expectedRenewals: 3,
  firstEarnedAt: null,
  topFriends: [],
  latest: [],
};

const line = (over: Partial<Earning>): Earning => ({
  id: "c",
  referralId: "r",
  friendName: "Sadia Islam",
  kind: "FIRST",
  planName: "Monthly Pro",
  paidAt: "2026-10-27T06:00:00.000Z",
  paymentDisplayId: "PAY-2QF9X1AB",
  paidAmount: "179.00",
  rate: 20,
  amount: "35.80",
  status: "ON_HOLD",
  availableAt: "2026-11-02T20:00:00.000Z",
  cancelReason: null,
  paidOutAt: null,
  endedAt: null,
  payout: null,
  ...over,
});

describe("the program's numbers", () => {
  it("reads the program and the balance by status", () => {
    expect(programOf(INFO)).toMatchObject({ commissionPct: 20, minWithdrawal: 300, fee: 0, payWithinDays: 3 });
    expect(balancesOf(INFO)).toMatchObject({ available: 846.8, onHold: 35.8, paidOut: 451.2, lifetime: 1333.8 });
  });

  it("shows the Free-plan page only to a locked member with nothing from the program", () => {
    const zero = { ...INFO.balances, available: "0.00", onHold: "0.00", paidOut: "0.00", reversed: "0.00", lifetime: "0.00" };
    const empty = { ...INFO, balances: zero, people: { ...INFO.people, total: 0 } };
    expect(showsLockedPage({ ...empty, lockedReason: "FREE_PLAN" })).toBe(true);
    expect(showsLockedPage({ ...empty, lockedReason: null })).toBe(false);
    // Money or friends from before keep the dashboard, so it can be withdrawn.
    expect(showsLockedPage({ ...INFO, lockedReason: "FREE_PLAN" })).toBe(false);
    expect(showsLockedPage({ ...empty, people: { ...INFO.people, total: 1 }, lockedReason: "PROGRAM_OFF" })).toBe(false);
  });

  it("charts from the first month with money, at most six", () => {
    const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].map((month, i) => ({ month, amount: i >= 7 ? "100.00" : "0.00" }));
    expect(chartMonths(months).map((m) => m.month)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(chartMonths(months.map((m) => ({ ...m, amount: "5.00" }))).length).toBe(6);
    expect(chartMonths(months.map((m) => ({ ...m, amount: "0.00" }))).map((m) => m.month)).toEqual(["2026-10"]);
  });

  it("splits the people bar", () => {
    const mix = peopleMix(INFO.people);
    expect(mix.map((m) => m.count)).toEqual([6, 2, 1, 1]);
    expect(mix.reduce((sum, m) => sum + m.pct, 0)).toBeCloseTo(100);
    expect(peopleMix({ PAYING: 0, FREE: 0, STOPPED: 0, REFUNDED: 0 }).every((m) => m.pct === 0)).toBe(true);
  });
});

describe("commission lines", () => {
  it("dates each note on the app's calendar and names the request", () => {
    // 20:00 UTC on 2 Nov is 3 Nov in Dhaka.
    expect(commissionNote(line({}))).toEqual({ note: "Ready {date}", day: "2026-11-03" });
    expect(commissionNote(line({ status: "IN_WITHDRAWAL", payout: { id: "w", displayId: "WD-1048", status: "REQUESTED" } }))).toEqual({ note: "{request} · being checked", day: null, request: "WD-1048" });
    expect(commissionNote(line({ status: "UNDER_CHECK", payout: { id: "w", displayId: "WD-1048", status: "APPROVED" } }))).toMatchObject({ note: "Held back from {request}", request: "WD-1048" });
    expect(commissionNote(line({ status: "PAID_OUT", paidOutAt: "2026-09-21T06:00:00.000Z", payout: { id: "w", displayId: "WD-1032", status: "PAID" } }))).toEqual({
      note: "Paid in {request} · {date}",
      day: "2026-09-21",
      request: "WD-1032",
    });
    expect(commissionNote(line({ status: "REVERSED", endedAt: "2026-09-06T06:00:00.000Z" }))).toEqual({ note: "Refunded on {date}", day: "2026-09-06" });
    expect(commissionNote(line({ status: "CANCELLED", cancelReason: "REFERRER_NOT_ON_PAID_PLAN" }))).toEqual({ note: CANCEL_NOTES.REFERRER_NOT_ON_PAID_PLAN, day: null });
  });
});

describe("friends", () => {
  it("counts the tabs, Stopped or refunded together", () => {
    expect(friendTabCounts({ ALL: 10, ...INFO.people })).toEqual({ ALL: 10, PAYING: 6, FREE: 2, ENDED: 2 });
    expect(friendTabOf("ENDED")).toBe("ENDED");
    expect(friendTabOf("BLOCKED")).toBe("ALL");
    expect(friendTabOf(null)).toBe("ALL");
  });

  it("names the friends who haven't paid", () => {
    expect(notPayingLine([])).toBeNull();
    expect(notPayingLine(["Imran Hossain", "Tanvir Islam"])).toEqual({ key: "{name} and {other} signed up but haven't paid yet.", values: { name: "Imran", other: "Tanvir" } });
    expect(notPayingLine(["Imran Hossain", "Tanvir Islam", "Mahin Rahman", "Rakib"])?.values).toEqual({ name: "Imran", other: "Tanvir", count: 2 });
  });

  it("writes days this year without the year", () => {
    expect(friendDay("2026-08-14", "2026-10-21", "en")).toBe("14 Aug");
    expect(friendDay("2025-08-14", "2026-10-21", "en")).toBe("14 Aug 2025");
    expect(friendDay("2026-08-14", "2026-10-21", "bn")).toBe("১৪ আগস্ট");
    expect(friendDay("", "2026-10-21", "en")).toBe("");
  });

  it("makes initials", () => {
    expect(initials("Sabrina Haque")).toBe("SH");
    expect(initials("  ")).toBe("?");
  });
});

describe("payout methods", () => {
  it("writes numbers and masks as the boards do", () => {
    expect(formatWalletNumber("01711482915")).toBe("01711-482915");
    expect(maskWallet("01711482915")).toBe("01711-•••915");
    expect(destinationLine({ type: "BKASH", walletNumber: "01711482915", bankName: null, accountNumber: null })).toBe("bKash 01711-•••915");
    expect(destinationLine({ type: "BANK", walletNumber: null, bankName: "Dutch-Bangla Bank", accountNumber: "150320414417" })).toBe("DBBL •••• 4417");
    expect(maskEmail("tanvir@example.com")).toBe("t***@example.com");
  });

  it("knows the banks' short names, and makes one up from the initials", () => {
    expect(bankShortName("Dutch-Bangla Bank")).toBe("DBBL");
    expect(bankShortName("BRAC Bank PLC")).toBe("BRAC");
    expect(bankShortName("Midland Bank")).toBe("MB");
    expect(bankShortName(null)).toBe("BANK");
  });

  it("checks a method before the API does", () => {
    const base = { accountName: "Khaled Mahmud", walletNumber: "", bankName: "", bankAccountType: "SAVINGS", accountNumber: "", routingNumber: "" };
    expect(methodProblem({ ...base, type: "BKASH", walletNumber: "+880 1711-482915" })).toBeNull();
    expect(normaliseMobile("+880 1711-482915")).toBe("01711482915");
    expect(methodProblem({ ...base, type: "NAGAD", walletNumber: "0171148291" })?.field).toBe("walletNumber");
    expect(methodProblem({ ...base, type: "ROCKET", walletNumber: "017114829159" })).toBeNull();
    expect(methodProblem({ ...base, type: "BANK", bankName: "BRAC Bank", accountNumber: "1503 2041 2201", routingNumber: "060261726" })).toBeNull();
    expect(methodProblem({ ...base, type: "BANK", bankName: "BRAC Bank", accountNumber: "1503", routingNumber: "060261726" })?.field).toBe("accountNumber");
    expect(methodProblem({ ...base, type: "BANK", bankName: "BRAC Bank", accountNumber: "150320412201", routingNumber: "0602" })?.field).toBe("routingNumber");
    expect(methodProblem({ ...base, type: "BKASH", accountName: "K" })?.field).toBe("accountName");
  });
});

describe("withdrawing", () => {
  it("counts working days Sunday to Thursday, as the API does", () => {
    // Thursday 1 Oct + 3 working days = Tuesday 6 Oct.
    expect(addWorkingDays("2026-10-01", 3)).toBe("2026-10-06");
    expect(addWorkingDays("2026-10-02", 1)).toBe("2026-10-04");
    expect(speedOf("BKASH", 3)).toEqual({ from: 1, to: 3 });
    expect(speedOf("BANK", 3)).toEqual({ from: 2, to: 3 });
  });
});

describe("links", () => {
  it("builds the invite links, tagged ones too, and the share links", () => {
    expect(inviteLink("https://smartly.softech.agency/", "9AAD7001")).toBe("https://smartly.softech.agency/register?ref=9AAD7001");
    expect(inviteLink("https://smartly.softech.agency", "9AAD7001", "facebook")).toBe("https://smartly.softech.agency/register?ref=9AAD7001&src=facebook");
    expect(linkText("https://smartly.softech.agency/register?ref=9AAD7001")).toBe("smartly.softech.agency/register?ref=9AAD7001");
    const links = shareLinks("https://x.test/register?ref=A1", "Join me on Smartly:", "Try Smartly");
    expect(links.whatsapp).toBe("https://wa.me/?text=Join%20me%20on%20Smartly%3A%20https%3A%2F%2Fx.test%2Fregister%3Fref%3DA1");
    expect(links.messenger).toBe("fb-messenger://share/?link=https%3A%2F%2Fx.test%2Fregister%3Fref%3DA1");
    expect(links.email).toContain("mailto:?subject=Try%20Smartly&body=");
  });

  it("keeps a tag to small letters and numbers", () => {
    expect(cleanTag("Instagram Bio!")).toBe("instagrambio");
    expect(isTag("fb")).toBe(true);
    expect(isTag("f")).toBe(false);
    expect(isTag("Facebook")).toBe(false);
  });
});

describe("the words", () => {
  it("words every status, tab and note in Bangla, in English without the context", () => {
    const keys = [
      ...FRIEND_TABS.map((tab) => tab.label),
      ...Object.values(FRIEND_STANDING).map((s) => s.label),
      ...Object.values(COMMISSION_STATUS).map((s) => s.label),
      ...Object.values(KIND_LABEL),
      ...Object.values(PAYOUT_STATUS).map((s) => s.label),
      ...Object.values(CANCEL_NOTES),
    ];
    for (const key of keys) expect(bnDictionary[key], key).toBeTruthy();
    expect(translate("en", "Available@@referral")).toBe("Available");
    expect(translate("en", "Paid out@@referral")).toBe("Paid out");
  });

  // The keys are one namespace and referrals is spread after savings, so a
  // plain word here would reword the Savings pages too.
  it("leaves the plain words the Savings pages use to them", () => {
    for (const word of ["Available", "Paid out", "Withdrawn", "Withdraw"]) expect(Object.hasOwn(referralsDictionary, word), word).toBe(false);
    expect(translate("bn", "Withdrawn")).toBe(savingsGoalsDictionary.Withdrawn);
  });

  // A Bangla sentence that lost {count} or {date} would show the wrong
  // figure, or none.
  it("keeps every {placeholder} of the English in its Bangla", () => {
    const placeholders = (text: string) => [...text.matchAll(/(?<!\{)\{(\w+)\}(?!\})/g)].map((match) => match[1]).sort();
    for (const [english, bangla] of Object.entries(referralsDictionary)) expect(placeholders(bangla), english).toEqual(placeholders(english));
  });

  it("words the API's refusals", () => {
    for (const message of [
      "Some of these commissions are no longer available. Reload and tick them again.",
      "You already have a link with this tag",
      "Pick a cash, bank, mobile banking or savings wallet",
      "That wallet was not found in this workspace",
      "Enter the Rocket number: 11 digits starting with 01 (12 with the last digit)",
      "The routing number has 9 digits",
      "This code has expired. Start again to get a new one.",
      "Codes cannot be sent right now because email is not set up. Please contact support.",
      "Choose where the money should go",
    ]) {
      expect(bnDictionary[message], message).toBeTruthy();
    }
  });
});
